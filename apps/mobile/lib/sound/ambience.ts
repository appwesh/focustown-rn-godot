/**
 * Ambience audio manager
 *
 * Keeps looping ambient audio playing across screens and
 * provides a simple mixer interface via Zustand.
 */

import { useEffect } from 'react';
import { create } from 'zustand';
import { createAudioPlayer } from 'expo-audio';
import { useSoundStore } from './store';

export type AmbienceTrackId = 'music' | 'cafe' | 'rain' | 'brown' | 'fire' | 'white';

const cafeChatterTrack = require('@/assets/audio/cafechatter.mp3');
const rainTrack = require('@/assets/audio/rain.mp3');
const brownNoiseTrack = require('@/assets/audio/soft-brown-noise.mp3');
const fireplaceTrack = require('@/assets/audio/fireplace.mp3');
const whiteNoiseTrack = require('@/assets/audio/whitenoise.mp3');

const musicPlayer = createAudioPlayer(null);
const cafePlayer = createAudioPlayer(cafeChatterTrack);
const rainPlayer = createAudioPlayer(rainTrack);
const brownPlayer = createAudioPlayer(brownNoiseTrack);
const firePlayer = createAudioPlayer(fireplaceTrack);
const whitePlayer = createAudioPlayer(whiteNoiseTrack);
let activeMusicSource: number | null = null;

const clampVolume = (value: number) => Math.max(0, Math.min(1, value));

musicPlayer.loop = true;
cafePlayer.loop = true;
rainPlayer.loop = true;
brownPlayer.loop = true;
firePlayer.loop = true;
whitePlayer.loop = true;

interface AmbienceState {
  musicSource: number | null;
  volumes: Record<AmbienceTrackId, number>;
  gameOverrideEnabled: boolean;
  setMusicSource: (source: number | null) => void;
  setVolume: (trackId: AmbienceTrackId, volume: number) => void;
  setGameOverrideEnabled: (enabled: boolean) => void;
  stopNonMusic: () => void;
}

export const useAmbienceStore = create<AmbienceState>((set) => ({
  musicSource: null,
  volumes: {
    music: 0.8,
    cafe: 0.0,
    rain: 0.0,
    brown: 0.0,
    fire: 0.0,
    white: 0.0,
  },
  gameOverrideEnabled: false,
  setMusicSource: (source) =>
    set((state) => (state.musicSource === source ? state : { musicSource: source })),
  setVolume: (trackId, volume) =>
    set((state) => ({
      volumes: { ...state.volumes, [trackId]: clampVolume(volume) },
    })),
  setGameOverrideEnabled: (enabled) =>
    set((state) => (state.gameOverrideEnabled === enabled ? state : { gameOverrideEnabled: enabled })),
  stopNonMusic: () =>
    set((state) => ({
      volumes: {
        ...state.volumes,
        cafe: 0,
        rain: 0,
        brown: 0,
        fire: 0,
        white: 0,
      },
    })),
}));

const applyVolume = (player: ReturnType<typeof createAudioPlayer>, enabled: boolean, volume: number) => {
  const clamped = clampVolume(volume);
  player.volume = enabled ? clamped : 0;

  if (!enabled || clamped === 0) {
    if (player.playing) {
      player.pause();
    }
    return;
  }

  if (!player.playing) {
    player.play();
  }
};

/**
 * Hook that keeps ambience players in sync with store + settings.
 * Should be used on screens where ambience must stay active.
 */
export function useAmbienceEngine(options?: { musicVolumeOverride?: number }) {
  const musicEnabled = useSoundStore((s) => s.musicEnabled);
  const musicSource = useAmbienceStore((s) => s.musicSource);
  const volumes = useAmbienceStore((s) => s.volumes);
  const gameOverrideEnabled = useAmbienceStore((s) => s.gameOverrideEnabled);
  const audioEnabled = musicEnabled || gameOverrideEnabled;
  const musicVolume =
    typeof options?.musicVolumeOverride === "number"
      ? options.musicVolumeOverride
      : volumes.music;

  useEffect(() => {
    if (!musicSource) {
      applyVolume(musicPlayer, false, 0);
      activeMusicSource = null;
      return;
    }

    if (activeMusicSource !== musicSource) {
      activeMusicSource = musicSource;
      musicPlayer.replace(musicSource);
      musicPlayer.seekTo(0);
    }
    applyVolume(musicPlayer, audioEnabled, musicVolume);
  }, [musicSource, audioEnabled, musicVolume]);

  useEffect(() => {
    applyVolume(cafePlayer, audioEnabled, volumes.cafe);
  }, [audioEnabled, volumes.cafe]);

  useEffect(() => {
    applyVolume(rainPlayer, audioEnabled, volumes.rain);
  }, [audioEnabled, volumes.rain]);

  useEffect(() => {
    applyVolume(brownPlayer, audioEnabled, volumes.brown);
  }, [audioEnabled, volumes.brown]);

  useEffect(() => {
    applyVolume(firePlayer, audioEnabled, volumes.fire);
  }, [audioEnabled, volumes.fire]);

  useEffect(() => {
    applyVolume(whitePlayer, audioEnabled, volumes.white);
  }, [audioEnabled, volumes.white]);
}
