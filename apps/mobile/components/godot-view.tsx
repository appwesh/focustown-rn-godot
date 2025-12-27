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

async function downloadPck(url: string): Promise<string> {
  console.log('[GodotGame] Checking for cached PCK...');
  
  // Check if already downloaded
  const fileInfo = await FileSystem.getInfoAsync(LOCAL_PCK_URI);
  if (fileInfo.exists) {
    const path = uriToPath(LOCAL_PCK_URI);
    console.log('[GodotGame] Using cached PCK:', path);
    return path;
  }

  console.log('[GodotGame] Downloading PCK from:', url);
  const downloadResult = await FileSystem.downloadAsync(url, LOCAL_PCK_URI);
  
  if (downloadResult.status !== 200) {
    throw new Error(`Failed to download PCK: ${downloadResult.status}`);
  }
  
  const path = uriToPath(LOCAL_PCK_URI);
  console.log('[GodotGame] Downloaded PCK to:', path);
  return path;
}

function initGodot(pckPath: string) {
  if (RTNGodot.getInstance() != null) {
    console.log('[GodotGame] Godot was already initialized.');
    return;
  }
  console.log('[GodotGame] Initializing Godot with PCK:', pckPath);

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
}

function destroyGodot() {
  runOnGodotThread(() => {
    'worklet';
    RTNGodot.destroyInstance();
  });
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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const setup = async () => {
      try {
        setIsLoading(true);
        const pckPath = await downloadPck(pckUrl);
        setIsLoading(false);
        initGodot(pckPath);
      } catch (err) {
        console.error('[GodotGame] Error:', err);
        setError(err instanceof Error ? err.message : 'Failed to load game');
        setIsLoading(false);
      }
    };

    setup();

    return () => {
      destroyGodot();
    };
  }, [pckUrl]);

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered, style]}>
        <ActivityIndicator size="large" color="#fff" />
        <Text style={styles.loadingText}>Loading game...</Text>
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
    backgroundColor: '#000',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  godotView: {
    flex: 1,
  },
  loadingText: {
    color: '#fff',
    marginTop: 16,
    fontSize: 16,
  },
  errorText: {
    color: '#ff4444',
    fontSize: 16,
    textAlign: 'center',
    padding: 20,
  },
});
