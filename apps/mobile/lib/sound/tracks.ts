/**
 * Ambience track mapping
 *
 * Centralizes building -> music mapping for clean switching logic.
 */

export const MUSIC_TRACKS_BY_BUILDING_ID: Partial<Record<string, number>> = {
  library: require('@/assets/audio/themesong.mp3'),
};
