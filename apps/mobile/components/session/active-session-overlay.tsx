/**
 * Active Session Overlay
 * 
 * Minimal timer display during an active focus session.
 * Shows at the bottom of the screen without blocking the game view.
 * Camera toggle button at top center.
 */

import React, { useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSessionStore, formatTime } from '@/lib/session';
import { useCameraControls } from '@/lib/godot';
import { TimerOverlay } from '@/components/ui';

interface ActiveSessionOverlayProps {
  visible: boolean;
  onEndEarly?: () => void;
  onTripleTap?: () => void;
}

export function ActiveSessionOverlay({ visible, onEndEarly, onTripleTap }: ActiveSessionOverlayProps) {
  const insets = useSafeAreaInsets();
  const activeSession = useSessionStore((s) => s.activeSession);
  const { toggleCamera } = useCameraControls();

  const handleToggleCamera = useCallback(() => {
    toggleCamera();
  }, [toggleCamera]);

  if (!visible || !activeSession) return null;

  const { remainingSeconds } = activeSession;

  return (
    <>
      {/* Camera Toggle Button - Top Center */}
      <Pressable
        style={[styles.cameraToggle, { top: insets.top + 16 }]}
        onPress={handleToggleCamera}
      >
        <Text style={styles.cameraIcon}>🔍</Text>
      </Pressable>

      {/* Bottom Timer Card */}
      <TimerOverlay
        visible={true}
        time={formatTime(remainingSeconds)}
        label="Studying"
        buttonTitle="End Session"
        onButtonPress={onEndEarly ?? (() => {})}
        onTripleTap={onTripleTap}
      />
    </>
  );
}

const styles = StyleSheet.create({
  cameraToggle: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: '#FFF8E7',
    borderRadius: 100,
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#5D4037',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
    borderWidth: 2,
    borderColor: '#DDD5C7',
    zIndex: 10,
  },
  cameraIcon: {
    fontSize: 24,
  },
});
