import { useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, View, ActivityIndicator, Text } from 'react-native';
import { RTNGodot, RTNGodotView, runOnGodotThread } from '@borndotcom/react-native-godot';
import * as FileSystem from 'expo-file-system/legacy';
import * as Device from 'expo-device';

interface GodotGameProps {
  style?: object;
  /** URL to fetch the .pck file from */
  pckUrl: string;
}

const PCK_FILENAME = 'main.pck';
const LOCAL_PCK_URI = FileSystem.documentDirectory + PCK_FILENAME;

// Strip file:// prefix for Godot (it expects raw filesystem path)
function uriToPath(uri: string): string {
  if (uri.startsWith('file://')) {
    return uri.slice(7);
  }
  return uri;
}

type ProgressCallback = (progress: number) => void;

/**
 * Download PCK with resumable support and progress tracking
 */
async function downloadPck(
  url: string,
  onProgress?: ProgressCallback
): Promise<string> {
  console.log('[GodotGame] Checking for cached PCK...');
  
  // Check if already downloaded
  const fileInfo = await FileSystem.getInfoAsync(LOCAL_PCK_URI);
  if (fileInfo.exists && fileInfo.size && fileInfo.size > 0) {
    const path = uriToPath(LOCAL_PCK_URI);
    console.log('[GodotGame] Using cached PCK:', path, `(${(fileInfo.size / 1024 / 1024).toFixed(1)} MB)`);
    return path;
  }

  console.log('[GodotGame] Downloading PCK from:', url);
  
  // Create resumable download with progress callback
  const downloadResumable = FileSystem.createDownloadResumable(
    url,
    LOCAL_PCK_URI,
    {},
    (downloadProgress) => {
      const progress = downloadProgress.totalBytesExpectedToWrite > 0
        ? downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite
        : 0;
      
      // Log progress every 10%
      const percent = Math.round(progress * 100);
      if (percent % 10 === 0) {
        const downloadedMB = (downloadProgress.totalBytesWritten / 1024 / 1024).toFixed(1);
        const totalMB = (downloadProgress.totalBytesExpectedToWrite / 1024 / 1024).toFixed(1);
        console.log(`[GodotGame] Download progress: ${percent}% (${downloadedMB}/${totalMB} MB)`);
      }
      
      onProgress?.(progress);
    }
  );

  try {
    const result = await downloadResumable.downloadAsync();
    
    if (!result) {
      throw new Error('Download returned no result');
    }
    
    if (result.status !== 200) {
      throw new Error(`Failed to download PCK: HTTP ${result.status}`);
    }
    
    const path = uriToPath(LOCAL_PCK_URI);
    console.log('[GodotGame] Downloaded PCK to:', path);
    return path;
  } catch (error) {
    // Clean up partial download on failure
    const partialFile = await FileSystem.getInfoAsync(LOCAL_PCK_URI);
    if (partialFile.exists) {
      await FileSystem.deleteAsync(LOCAL_PCK_URI, { idempotent: true });
      console.log('[GodotGame] Cleaned up partial download');
    }
    throw error;
  }
}

// Track if Godot is being initialized/destroyed to prevent race conditions
let godotInitializing = false;
let godotDestroying = false;

// Store the PCK path for potential reinit
let storedPckPath: string | null = null;

function initGodot(pckPath: string) {
  // Store for potential reinit
  storedPckPath = pckPath;
  
  if (RTNGodot.getInstance() != null) {
    console.log('[GodotGame] Godot was already initialized.');
    return;
  }
  
  if (godotInitializing) {
    console.log('[GodotGame] Godot is already initializing, skipping...');
    return;
  }
  
  if (godotDestroying) {
    console.log('[GodotGame] Godot is being destroyed, will reinit after...');
    // Wait for destruction to complete, then reinit
    setTimeout(() => initGodot(pckPath), 300);
    return;
  }
  
  console.log('[GodotGame] Initializing Godot with PCK:', pckPath);
  godotInitializing = true;

  runOnGodotThread(() => {
    'worklet';
    console.log('[GodotGame] Running on Godot Thread');

    if (Platform.OS === 'android') {
      RTNGodot.createInstance([
        '--verbose',
        '--path', '/main',
        '--rendering-driver', 'opengl3',
        '--rendering-method', 'gl_compatibility',
        '--display-driver', 'embedded',
      ]);
    } else {
      // iOS
      const args = [
        '--verbose',
        '--main-pack', pckPath,
        '--display-driver', 'embedded',
      ];

      // Real device uses opengl3, simulator uses metal
      if (Device.isDevice) {
        args.push(
          '--rendering-driver', 'opengl3',
          '--rendering-method', 'gl_compatibility'
        );
      } else {
        args.push(
          '--rendering-driver', 'metal',
          '--rendering-method', 'mobile'
        );
      }

      console.log('[GodotGame] Args:', args.join(' '));
      RTNGodot.createInstance(args);
      console.log('[GodotGame] createInstance called');
    }
  });
  
  // Mark as no longer initializing after a delay
  setTimeout(() => {
    godotInitializing = false;
    console.log('[GodotGame] Initialization complete');
  }, 500);
}

function destroyGodot() {
  if (godotDestroying) {
    console.log('[GodotGame] Already destroying Godot, skipping...');
    return;
  }
  
  if (RTNGodot.getInstance() == null) {
    console.log('[GodotGame] No Godot instance to destroy');
    return;
  }
  
  console.log('[GodotGame] Destroying Godot instance...');
  godotDestroying = true;
  
  runOnGodotThread(() => {
    'worklet';
    RTNGodot.destroyInstance();
  });
  
  // Mark as no longer destroying after a delay
  setTimeout(() => {
    godotDestroying = false;
    console.log('[GodotGame] Destruction complete');
  }, 300);
}

/**
 * GodotGame component - renders the Godot engine view
 * 
 * For controlling the game (joystick, interact), use hooks from @/lib/godot:
 *   import { useJoystick, useInteract } from '@/lib/godot';
 */
export function GodotGame({ style, pckUrl }: GodotGameProps) {
  const initialized = useRef(false);
  const [isLoading, setIsLoading] = useState(true);
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const setup = async () => {
      try {
        setIsLoading(true);
        setDownloadProgress(null);
        
        const pckPath = await downloadPck(pckUrl, (progress) => {
          setDownloadProgress(progress);
        });
        
        setDownloadProgress(null);
        setIsLoading(false);
        initGodot(pckPath);
      } catch (err) {
        console.error('[GodotGame] Error:', err);
        setError(err instanceof Error ? err.message : 'Failed to load game');
        setIsLoading(false);
        setDownloadProgress(null);
      }
    };

    setup();

    // NOTE: We intentionally do NOT destroy Godot on unmount
    // The Godot instance is shared between screens (home showcase and game)
    // Destroying it when one screen unmounts would break the other screen
    // The instance persists for the app lifetime
  }, [pckUrl]);

  if (isLoading) {
    const isDownloading = downloadProgress !== null;
    const progressPercent = downloadProgress !== null ? Math.round(downloadProgress * 100) : 0;
    
    return (
      <View style={[styles.container, styles.centered, styles.loading, style]}>
        <ActivityIndicator size="large" color="#8B7355" />
        <Text style={styles.loadingText}>
          {isDownloading ? `Downloading... ${progressPercent}%` : 'Loading...'}
        </Text>
        {isDownloading && (
          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBar, { width: `${progressPercent}%` }]} />
          </View>
        )}
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.centered, style]}>
        <Text style={styles.errorText}>Error: {error}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <RTNGodotView style={styles.godotView} />
    </View>
  );
}

/** Clear cached PCK to force re-download */
export async function clearPckCache(): Promise<void> {
  const fileInfo = await FileSystem.getInfoAsync(LOCAL_PCK_URI);
  if (fileInfo.exists) {
    await FileSystem.deleteAsync(LOCAL_PCK_URI);
    console.log('[GodotGame] Cleared PCK cache');
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF8E7',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loading: {
    backgroundColor: '#FFF8E7',
  },
  godotView: {
    flex: 1,
  },
  loadingText: {
    color: '#8B7355',
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500',
  },
  errorText: {
    color: '#ff4444',
    fontSize: 16,
    textAlign: 'center',
    padding: 20,
  },
  progressBarContainer: {
    width: 200,
    height: 6,
    backgroundColor: '#E8DDD0',
    borderRadius: 3,
    marginTop: 12,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#8B7355',
    borderRadius: 3,
  },
});
