import { useEffect, useState } from 'react';
import * as FileSystem from 'expo-file-system/legacy';
import { GAME_VERSION, MANIFEST_URL, R2_BASE_URL } from '@/constants/game';
import { clearPckCache } from '@/components/godot-view';

interface GameManifest {
  version: string;
  url: string;
  updated: string;
}

interface UpdateState {
  isChecking: boolean;
  hasUpdate: boolean;
  remoteVersion: string | null;
  error: string | null;
}

const VERSION_CACHE_KEY = 'game_version_installed';

async function getInstalledVersion(): Promise<string | null> {
  try {
    const path = FileSystem.documentDirectory + VERSION_CACHE_KEY;
    const info = await FileSystem.getInfoAsync(path);
    if (info.exists) {
      return await FileSystem.readAsStringAsync(path);
    }
  } catch {
    // Ignore
  }
  return null;
}

async function setInstalledVersion(version: string): Promise<void> {
  const path = FileSystem.documentDirectory + VERSION_CACHE_KEY;
  await FileSystem.writeAsStringAsync(path, version);
}

export function useGameUpdate() {
  const [state, setState] = useState<UpdateState>({
    isChecking: true,
    hasUpdate: false,
    remoteVersion: null,
    error: null,
  });

  const checkForUpdate = async () => {
    setState(prev => ({ ...prev, isChecking: true, error: null }));
    
    try {
      const response = await fetch(MANIFEST_URL, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch manifest: ${response.status}`);
      }
      
      const manifest: GameManifest = await response.json();
      const installedVersion = await getInstalledVersion();
      
      // Check if update needed
      const hasUpdate = installedVersion !== manifest.version;
      
      setState({
        isChecking: false,
        hasUpdate,
        remoteVersion: manifest.version,
        error: null,
      });
      
      return { hasUpdate, manifest };
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to check for updates';
      setState(prev => ({ ...prev, isChecking: false, error }));
      return { hasUpdate: false, manifest: null };
    }
  };

  const applyUpdate = async (): Promise<boolean> => {
    try {
      // Clear cached PCK to force re-download
      await clearPckCache();
      
      if (state.remoteVersion) {
        await setInstalledVersion(state.remoteVersion);
      }
      
      setState(prev => ({ ...prev, hasUpdate: false }));
      return true;
    } catch (err) {
      console.error('[useGameUpdate] Failed to apply update:', err);
      return false;
    }
  };

  // Check on mount
  useEffect(() => {
    checkForUpdate();
  }, []);

  return {
    ...state,
    currentVersion: GAME_VERSION,
    checkForUpdate,
    applyUpdate,
  };
}

/**
 * Get the PCK URL for a specific version
 */
export function getPckUrlForVersion(version: string): string {
  return `${R2_BASE_URL}/v${version}/main.pck`;
}

