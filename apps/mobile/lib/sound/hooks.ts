/**
 * Sound Hooks
 * 
 * Reusable hooks for playing sounds that respect global settings.
 */

import { useCallback, useEffect } from 'react';
import { useAudioPlayer } from 'expo-audio';
import { useSoundStore } from './store';

const buttonSound = require('@/assets/audio/button.mp3');
const successSound = require('@/assets/audio/success.mp3');

/**
 * Hook for playing the button tap sound effect.
 * Respects the global sound effects setting.
 */
export function useButtonSound() {
  const soundEffectsEnabled = useSoundStore((s) => s.soundEffectsEnabled);
  const player = useAudioPlayer(buttonSound);

  const playButtonSound = useCallback(() => {
    if (!soundEffectsEnabled) return;
    
    player.seekTo(0);
    player.play();
  }, [soundEffectsEnabled, player]);

  return { playButtonSound };
}

/**
 * Hook for playing the success/completion sound effect.
 * Respects the global sound effects setting.
 */
export function useSuccessSound() {
  const soundEffectsEnabled = useSoundStore((s) => s.soundEffectsEnabled);
  const player = useAudioPlayer(successSound);

  const playSuccessSound = useCallback(() => {
    if (!soundEffectsEnabled) return;
    
    player.seekTo(0);
    player.play();
  }, [soundEffectsEnabled, player]);

  return { playSuccessSound };
}

/**
 * Hook for looping background tracks with volume control.
 * Respects global music toggle and local volume.
 */
export function useLoopingAudioPlayer(
  source: Parameters<typeof useAudioPlayer>[0],
  options?: {
    enabled?: boolean;
    volume?: number;
  }
) {
  const player = useAudioPlayer(source ?? null);
  const enabled = options?.enabled ?? true;
  const volume = options?.volume ?? 1;

  useEffect(() => {
    player.loop = true;
  }, [player]);

  useEffect(() => {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    player.volume = enabled ? clampedVolume : 0;

    if (!enabled || clampedVolume === 0) {
      if (player.playing) {
        player.pause();
      }
      return;
    }

    if (!player.playing) {
      player.play();
    }
  }, [player, enabled, volume]);

  return player;
}
