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
import { Button } from '@/components/ui/button';

interface ActiveSessionOverlayProps {
  visible: boolean;
  onEndEarly?: () => void;
}

export function ActiveSessionOverlay({ visible, onEndEarly }: ActiveSessionOverlayProps) {
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
        <Text style={styles.cameraIcon}>👁️</Text>
      </Pressable>

      {/* Bottom Timer Card */}
      <View style={[styles.container, { bottom: insets.bottom + 24 }]}>
        <View style={styles.card}>
          {/* Timer and Label */}
          <View style={styles.timerSection}>
            <Text style={styles.timerText}>{formatTime(remainingSeconds)}</Text>
            <Text style={styles.label}>Focusing</Text>
          </View>

          {/* End Session Button */}
          <Button
            title="End Session"
            onPress={onEndEarly ?? (() => {})}
            size="small"
          />
        </View>
      </View>
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
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 10,
  },
  card: {
    backgroundColor: '#FFF8E7',
    borderRadius: 24,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#5D4037',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 3,
    borderColor: '#DDD5C7',
  },
  timerSection: {
    flexDirection: 'column',
  },
  timerText: {
    fontSize: 32,
    fontFamily: 'Poppins_700Bold',
    color: '#3D3D3D',
  },
  label: {
    fontSize: 16,
    fontFamily: 'Poppins_500Medium',
    color: '#8B7355',
    marginTop: -4,
  },
});
