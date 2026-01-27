/**
 * Ambience Mixer
 *
 * In-game ambience controls for music and environment layers.
 * Uses looping audio tracks with per-track volume control.
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Modal, View, Text, Pressable, StyleSheet, PanResponder } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAmbienceStore, useSoundStore, type AmbienceTrackId } from '@/lib/sound';

type TrackId = AmbienceTrackId;

const TRACKS: Array<{
  id: TrackId;
  label: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  defaultVolume: number;
}> = [
  { id: 'music', label: 'Music', icon: 'music-note', defaultVolume: 0.6 },
  { id: 'cafe', label: 'Cafe', icon: 'coffee', defaultVolume: 0.0 },
  { id: 'rain', label: 'Rain', icon: 'weather-rainy', defaultVolume: 0.0 },
  { id: 'brown', label: 'Brown', icon: 'sine-wave', defaultVolume: 0.0 },
  { id: 'fire', label: 'Fire', icon: 'fire', defaultVolume: 0.0 },
  { id: 'white', label: 'White', icon: 'waveform', defaultVolume: 0.0 },
];

const KNOB_SIZE = 72;
const KNOB_MIN_ANGLE = -135;
const KNOB_MAX_ANGLE = 135;

function Knob({
  value,
  enabled,
  icon,
  onChange,
  onToggle,
}: {
  value: number;
  enabled: boolean;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  onChange: (nextValue: number) => void;
  onToggle: () => void;
}) {
  const startValueRef = useRef(value);
  const movedRef = useRef(false);

  const angle = KNOB_MIN_ANGLE + (KNOB_MAX_ANGLE - KNOB_MIN_ANGLE) * value;

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          startValueRef.current = value;
          movedRef.current = false;
        },
        onPanResponderMove: (_evt, gestureState) => {
          if (Math.abs(gestureState.dx) > 2 || Math.abs(gestureState.dy) > 2) {
            movedRef.current = true;
          }
          const delta = (gestureState.dx - gestureState.dy) / 200;
          const nextValue = Math.max(0, Math.min(1, startValueRef.current + delta));
          onChange(nextValue);
        },
        onPanResponderRelease: () => {
          if (!movedRef.current) {
            onToggle();
          }
        },
      }),
    [onChange, value]
  );

  return (
    <View style={styles.knobWrapper} {...panResponder.panHandlers}>
      <View style={[styles.knobOuter, !enabled && styles.knobOuterDisabled]}>
        <View style={[styles.knobInner, !enabled && styles.knobInnerDisabled]}>
          <View style={[styles.knobFace, !enabled && styles.knobFaceDisabled]}>
            <View style={[styles.knobIndicatorContainer, { transform: [{ rotate: `${angle}deg` }] }]}>
              <View style={[styles.knobIndicator, !enabled && styles.knobIndicatorDisabled]} />
            </View>
            <MaterialCommunityIcons
              name={icon}
              size={22}
              color={enabled ? '#8F6930' : '#B8AFA2'}
            />
          </View>
        </View>
      </View>
    </View>
  );
}

export function AmbienceMixer() {
  const insets = useSafeAreaInsets();
  const musicEnabled = useSoundStore((s) => s.musicEnabled);
  const volumes = useAmbienceStore((s) => s.volumes);
  const setVolume = useAmbienceStore((s) => s.setVolume);
  const gameOverrideEnabled = useAmbienceStore((s) => s.gameOverrideEnabled);
  const setGameOverrideEnabled = useAmbienceStore((s) => s.setGameOverrideEnabled);
  const [visible, setVisible] = useState(false);
  const defaultVolumes = useMemo(() => {
    const defaults: Record<string, number> = {};
    TRACKS.forEach((track) => {
      defaults[track.id] = track.defaultVolume;
    });
    return defaults as Record<TrackId, number>;
  }, []);

  const lastNonZeroRef = useRef<Record<TrackId, number>>(defaultVolumes);

  const volumePercentages = useMemo(() => {
    const percentages: Record<string, number> = {};
    TRACKS.forEach((track) => {
      const value = volumes[track.id] ?? 0;
      percentages[track.id] = Math.round(value * 100);
    });
    return percentages as Record<TrackId, number>;
  }, [volumes]);

  const handleVolumeChange = useCallback(
    (trackId: TrackId, value: number) => {
      if (!musicEnabled && !gameOverrideEnabled) {
        setGameOverrideEnabled(true);
      }
      if (value > 0) {
        lastNonZeroRef.current[trackId] = value;
      }
      setVolume(trackId, value);
    },
    [musicEnabled, gameOverrideEnabled, setGameOverrideEnabled, setVolume]
  );

  const handleToggleTrack = useCallback(
    (trackId: TrackId) => {
      if (!musicEnabled && !gameOverrideEnabled) {
        setGameOverrideEnabled(true);
      }
      const current = volumes[trackId] ?? 0;
      if (current > 0) {
        setVolume(trackId, 0);
      } else {
        const remembered = lastNonZeroRef.current[trackId];
        const restore = remembered && remembered > 0 ? remembered : 0.5;
        setVolume(trackId, restore);
      }
    },
    [musicEnabled, gameOverrideEnabled, setGameOverrideEnabled, setVolume, volumes]
  );

  return (
    <>
      <Pressable
        style={({ pressed }) => [
          styles.mixerButton,
          pressed && styles.mixerButtonPressed,
        ]}
        onPress={() => setVisible(true)}
      >
        <MaterialCommunityIcons name="tune-variant" size={22} color="#5D4037" />
      </Pressable>

      <Modal
        transparent
        visible={visible}
        animationType="fade"
        onRequestClose={() => setVisible(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setVisible(false)}>
          <Pressable
            style={[styles.modalCard, { marginTop: insets.top + 60 }]}
            onPress={() => {}}
          >
            <Text style={styles.title}>Ambience</Text>
            {!musicEnabled && !gameOverrideEnabled && (
              <Text style={styles.mutedNote}>
                Music is off in Settings. Move a knob to override in-game.
              </Text>
            )}

            <View style={styles.trackGrid}>
              {TRACKS.map((track) => (
                <View key={track.id} style={styles.trackTile}>
                  <Knob
                    value={volumes[track.id] ?? 0}
                    enabled={(volumes[track.id] ?? 0) > 0}
                    icon={track.icon}
                    onChange={(value) => handleVolumeChange(track.id, value)}
                    onToggle={() => handleToggleTrack(track.id)}
                  />
                  <Text style={styles.trackValue}>
                    {volumePercentages[track.id]}%
                  </Text>
                </View>
              ))}
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.closeButton,
                pressed && styles.closeButtonPressed,
              ]}
              onPress={() => setVisible(false)}
            >
              <Text style={styles.closeButtonText}>Done</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  mixerButton: {
    backgroundColor: '#FFF8E7',
    borderRadius: 100,
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#DDD5C7',
  },
  mixerButtonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    paddingHorizontal: 20,
  },
  modalCard: {
    backgroundColor: '#FFF8E7',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#DDD5C7',
    padding: 20,
    gap: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#5D4037',
  },
  mutedNote: {
    fontSize: 13,
    color: '#8B7355',
  },
  trackGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  trackTile: {
    width: '33.33%',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
  },
  trackValue: {
    fontSize: 12,
    fontWeight: '800',
    color: '#8B7355',
  },
  placeholderNote: {
    fontSize: 12,
    color: '#A89880',
    textAlign: 'center',
  },
  knobWrapper: {
    width: KNOB_SIZE + 8,
    height: KNOB_SIZE + 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  knobOuter: {
    width: KNOB_SIZE,
    height: KNOB_SIZE,
    borderRadius: KNOB_SIZE / 2,
    backgroundColor: '#F0E8DC',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 6,
  },
  knobOuterDisabled: {
    backgroundColor: '#F5EFE6',
    shadowOpacity: 0.08,
  },
  knobInner: {
    width: KNOB_SIZE - 6,
    height: KNOB_SIZE - 6,
    borderRadius: (KNOB_SIZE - 6) / 2,
    backgroundColor: '#E8DFD2',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D5CABC',
  },
  knobInnerDisabled: {
    backgroundColor: '#EDE7DE',
    borderColor: '#E0D8CE',
  },
  knobFace: {
    width: KNOB_SIZE - 14,
    height: KNOB_SIZE - 14,
    borderRadius: (KNOB_SIZE - 14) / 2,
    backgroundColor: '#FBF7F0',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FFF',
    shadowOffset: { width: -2, height: -2 },
    shadowOpacity: 0.8,
    shadowRadius: 3,
  },
  knobFaceDisabled: {
    backgroundColor: '#F8F4ED',
  },
  knobIndicatorContainer: {
    position: 'absolute',
    width: KNOB_SIZE - 14,
    height: KNOB_SIZE - 14,
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  knobIndicator: {
    width: 4,
    height: 12,
    backgroundColor: '#C4553D',
    borderRadius: 2,
    marginTop: 2,
  },
  knobIndicatorDisabled: {
    backgroundColor: '#C8BFB2',
  },
  closeButton: {
    alignSelf: 'flex-end',
    backgroundColor: '#8F6930',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  closeButtonPressed: {
    opacity: 0.85,
  },
  closeButtonText: {
    color: '#FFF8E7',
    fontWeight: '700',
  },
});
