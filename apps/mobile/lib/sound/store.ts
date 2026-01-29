/**
 * Sound Settings Store
 * 
 * Global state for sound preferences (sound effects & background music).
 * Used throughout the app to respect user's audio preferences.
 */

import { create } from 'zustand';

interface SoundStore {
  /** Whether sound effects are enabled */
  soundEffectsEnabled: boolean;
  /** Whether background music is enabled */
  musicEnabled: boolean;
  
  /** Toggle sound effects on/off */
  setSoundEffectsEnabled: (enabled: boolean) => void;
  /** Toggle background music on/off */
  setMusicEnabled: (enabled: boolean) => void;
}

export const useSoundStore = create<SoundStore>((set) => ({
  soundEffectsEnabled: true,
  musicEnabled: true,
  
  setSoundEffectsEnabled: (enabled) => set({ soundEffectsEnabled: enabled }),
  setMusicEnabled: (enabled) => set({ musicEnabled: enabled }),
}));
