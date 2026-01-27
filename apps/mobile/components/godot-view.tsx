import { useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, View, ActivityIndicator, Text } from 'react-native';
import { RTNGodot, RTNGodotView, runOnGodotThread } from '@borndotcom/react-native-godot';
import * as FileSystem from 'expo-file-system/legacy';
import * as Device from 'expo-device';
import { USE_LOCAL_PCK } from '@/constants/game';

interface GodotGameProps {
  style?: object;
  /** URL to fetch the .pck file from (ignored if USE_LOCAL_PCK is true in DEV mode) */
  pckUrl: string;
  /** Callback when loading state changes - receives isLoading and optional download progress (0-1) */
  onLoadingChange?: (isLoading: boolean, downloadProgress?: number) => void;
}

const PCK_FILENAME = 'main.pck';
const LOCAL_PCK_URI = FileSystem.documentDirectory + PCK_FILENAME;
const LOCAL_PCK_COMPLETE_URI = FileSystem.documentDirectory + PCK_FILENAME + '.complete';

// Local dev PCK paths
// For simulator: direct path to the exported PCK in the project (simulator can access host filesystem)
// For real device: copy main.pck to the app's document directory as 'local-dev.pck'
const LOCAL_DEV_PCK_PROJECT_PATH = '/Users/edgarhnd/Dev/talktown/godot/export/main.pck';
const LOCAL_DEV_PCK_URI = FileSystem.documentDirectory + 'local-dev.pck';

// Keep a handle to any active download so we can pause it during Fast Refresh / teardown.
let activeDownloadResumable: ReturnType<typeof FileSystem.createDownloadResumable> | null = null;

// Strip file:// prefix for Godot (it expects raw filesystem path)
function uriToPath(uri: string): string {
  if (uri.startsWith('file://')) {
    return uri.slice(7);
  }
  return uri;
}

type ProgressCallback = (progress: number) => void;

/**
 * Check for and use local dev PCK if USE_LOCAL_PCK is enabled
 * Returns the path if found, null otherwise
 */
async function tryGetLocalDevPck(): Promise<string | null> {
  if (!__DEV__ || !USE_LOCAL_PCK) {
    return null;
  }

  console.log('[GodotGame] USE_LOCAL_PCK enabled, checking for local PCK...');
  
  // For simulator: try the direct project path first (simulator can access host filesystem)
  if (!Device.isDevice) {
    const projectPathInfo = await FileSystem.getInfoAsync(LOCAL_DEV_PCK_PROJECT_PATH);
    if (projectPathInfo.exists && projectPathInfo.size && projectPathInfo.size > 0) {
      console.log('[GodotGame] Using project PCK (simulator):', LOCAL_DEV_PCK_PROJECT_PATH, `(${(projectPathInfo.size / 1024 / 1024).toFixed(1)} MB)`);
      return LOCAL_DEV_PCK_PROJECT_PATH;
    }
    console.log('[GodotGame] Project PCK not found at:', LOCAL_DEV_PCK_PROJECT_PATH);
  }

  // For real device (or if project path not found): check document directory
  const localDevInfo = await FileSystem.getInfoAsync(LOCAL_DEV_PCK_URI);
  if (localDevInfo.exists && localDevInfo.size && localDevInfo.size > 0) {
    const path = uriToPath(LOCAL_DEV_PCK_URI);
    console.log('[GodotGame] Found local dev PCK:', path, `(${(localDevInfo.size / 1024 / 1024).toFixed(1)} MB)`);
    return path;
  }

  console.warn('[GodotGame] USE_LOCAL_PCK is true but no local PCK found');
  if (Device.isDevice) {
    console.warn('[GodotGame] For real device: copy main.pck to the document directory as "local-dev.pck"');
  } else {
    console.warn('[GodotGame] Expected at:', LOCAL_DEV_PCK_PROJECT_PATH);
  }
  console.warn('[GodotGame] Falling back to remote download...');
  
  return null;
}

/**
 * Download PCK with resumable support and progress tracking
 */
async function downloadPck(
  url: string,
  onProgress?: ProgressCallback
): Promise<string> {
  // First, check if we should use a local dev PCK
  const localDevPath = await tryGetLocalDevPck();
  if (localDevPath) {
    return localDevPath;
  }

  console.log('[GodotGame] Checking for cached PCK...');
  
  // Check if already downloaded
  const fileInfo = await FileSystem.getInfoAsync(LOCAL_PCK_URI);
  const completeInfo = await FileSystem.getInfoAsync(LOCAL_PCK_COMPLETE_URI);
  if (fileInfo.exists && fileInfo.size && fileInfo.size > 0 && completeInfo.exists) {
    const path = uriToPath(LOCAL_PCK_URI);
    console.log('[GodotGame] Using cached PCK:', path, `(${(fileInfo.size / 1024 / 1024).toFixed(1)} MB)`);
    return path;
  }
  // If we have a partial PCK without a completion marker, discard it to avoid booting a corrupted pack.
  if (fileInfo.exists && !completeInfo.exists) {
    await FileSystem.deleteAsync(LOCAL_PCK_URI, { idempotent: true });
  }

  console.log('[GodotGame] Downloading PCK from:', url);
  
  // Throttle progress updates to avoid overwhelming React
  let lastProgressUpdate = 0;
  let lastLoggedPercent = -10;
  
  // Create resumable download with progress callback
  const downloadResumable = FileSystem.createDownloadResumable(
    url,
    LOCAL_PCK_URI,
    {},
    (downloadProgress) => {
      const progress = downloadProgress.totalBytesExpectedToWrite > 0
        ? downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite
        : 0;
      
      const percent = Math.round(progress * 100);
      const now = Date.now();
      
      // Log progress every 10%
      if (percent >= lastLoggedPercent + 10) {
        lastLoggedPercent = percent - (percent % 10);
        const downloadedMB = (downloadProgress.totalBytesWritten / 1024 / 1024).toFixed(1);
        const totalMB = (downloadProgress.totalBytesExpectedToWrite / 1024 / 1024).toFixed(1);
        console.log(`[GodotGame] Download progress: ${percent}% (${downloadedMB}/${totalMB} MB)`);
      }
      
      // Throttle state updates to max once per 100ms to avoid React "Maximum update depth exceeded"
      // Always send 100% progress immediately
      if (now - lastProgressUpdate >= 100 || progress >= 1) {
        lastProgressUpdate = now;
        onProgress?.(progress);
      }
    }
  );
  activeDownloadResumable = downloadResumable;

  try {
    const result = await downloadResumable.downloadAsync();
    
    if (!result) {
      throw new Error('Download returned no result');
    }
    
    if (result.status !== 200) {
      throw new Error(`Failed to download PCK: HTTP ${result.status}`);
    }

    // Mark as fully downloaded so we never treat a partial file as "cached".
    await FileSystem.writeAsStringAsync(LOCAL_PCK_COMPLETE_URI, 'ok');
    
    const path = uriToPath(LOCAL_PCK_URI);
    console.log('[GodotGame] Downloaded PCK to:', path);
    return path;
  } catch (error) {
    // Clean up partial download on failure
    const partialFile = await FileSystem.getInfoAsync(LOCAL_PCK_URI);
    if (partialFile.exists) {
      await FileSystem.deleteAsync(LOCAL_PCK_URI, { idempotent: true });
      await FileSystem.deleteAsync(LOCAL_PCK_COMPLETE_URI, { idempotent: true });
      console.log('[GodotGame] Cleaned up partial download');
    }
    throw error;
  } finally {
    if (activeDownloadResumable === downloadResumable) {
      activeDownloadResumable = null;
    }
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
export function GodotGame({ style, pckUrl, onLoadingChange }: GodotGameProps) {
  const initialized = useRef(false);
  const [isLoading, setIsLoading] = useState(true);
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Store callback in ref to avoid infinite loops from changing function references
  const onLoadingChangeRef = useRef(onLoadingChange);
  onLoadingChangeRef.current = onLoadingChange;

  // Notify parent of loading state changes
  useEffect(() => {
    onLoadingChangeRef.current?.(isLoading, downloadProgress ?? undefined);
  }, [isLoading, downloadProgress]);

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

    // During Fast Refresh / teardown, pause any active download to avoid noisy native warnings.
    // Only clean up partial files if we interrupted an active download.
    return () => {
      void (async () => {
        // Capture whether there's an active download BEFORE we clear it
        const downloadWasActive = activeDownloadResumable !== null;

        try {
          if (activeDownloadResumable) {
            await activeDownloadResumable.pauseAsync();
            activeDownloadResumable = null;
          }
        } catch {
          // ignore
        }

        // Only delete files if we interrupted an active download (partial file).
        // Don't touch fully downloaded/cached files - that would defeat caching!
        if (downloadWasActive) {
          try {
            await FileSystem.deleteAsync(LOCAL_PCK_COMPLETE_URI, { idempotent: true });
            await FileSystem.deleteAsync(LOCAL_PCK_URI, { idempotent: true });
            console.log('[GodotGame] Cleaned up interrupted download');
          } catch {
            // ignore
          }
        }
      })();
    };

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
    await FileSystem.deleteAsync(LOCAL_PCK_COMPLETE_URI, { idempotent: true });
    console.log('[GodotGame] Cleared PCK cache');
  }
}

/** Get the path where local dev PCK should be placed */
export function getLocalDevPckPath(): string {
  return LOCAL_DEV_PCK_URI;
}

/** Copy a PCK file to the local dev location for testing */
export async function copyPckToLocalDev(sourcePath: string): Promise<void> {
  console.log('[GodotGame] Copying PCK to local dev location...');
  console.log('[GodotGame] Source:', sourcePath);
  console.log('[GodotGame] Destination:', LOCAL_DEV_PCK_URI);
  
  await FileSystem.copyAsync({
    from: sourcePath,
    to: LOCAL_DEV_PCK_URI,
  });
  
  const fileInfo = await FileSystem.getInfoAsync(LOCAL_DEV_PCK_URI);
  if (fileInfo.exists && fileInfo.size) {
    console.log('[GodotGame] Local dev PCK ready:', `${(fileInfo.size / 1024 / 1024).toFixed(1)} MB`);
  }
}

/** Clear local dev PCK */
export async function clearLocalDevPck(): Promise<void> {
  const fileInfo = await FileSystem.getInfoAsync(LOCAL_DEV_PCK_URI);
  if (fileInfo.exists) {
    await FileSystem.deleteAsync(LOCAL_DEV_PCK_URI, { idempotent: true });
    console.log('[GodotGame] Cleared local dev PCK');
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
