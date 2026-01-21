/**
 * Active Session Overlay
 * 
 * Minimal timer display during an active focus session.
 * Shows at the bottom of the screen without blocking the game view.
 * Includes camera toggle button to switch between zoomed and overview.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSessionStore, formatTime } from '@/lib/session';
import { useCameraControls } from '@/lib/godot';

interface ActiveSessionOverlayProps {
  visible: boolean;
  onEndEarly?: () => void;
}

export function ActiveSessionOverlay({ visible, onEndEarly }: ActiveSessionOverlayProps) {
  const insets = useSafeAreaInsets();
  const activeSession = useSessionStore((s) => s.activeSession);
  const config = useSessionStore((s) => s.config);
  const { toggleCamera } = useCameraControls();
  
  // Track camera state locally (starts in zoomed/seated view)
  const [isZoomed, setIsZoomed] = useState(true);

  const handleToggleCamera = useCallback(() => {
    toggleCamera();
    setIsZoomed((prev) => !prev);
  }, [toggleCamera]);

  if (!visible || !activeSession) return null;

  const { remainingSeconds } = activeSession;
  const totalSeconds = config.durationMinutes * 60;
  const progress = 1 - remainingSeconds / totalSeconds;

  return (
    <View style={[styles.container, { bottom: insets.bottom + 24 }]}>
      {/* Camera Toggle Button */}
      <Pressable
        style={({ pressed }) => [
          styles.cameraButton,
          pressed && styles.cameraButtonPressed,
        ]}
        onPress={handleToggleCamera}
      >
        <Text style={styles.cameraButtonText}>{isZoomed ? '🔍' : '👁'}</Text>
      </Pressable>

      <View style={styles.timerCard}>
        {/* Timer Icon */}
        <Text style={styles.icon}>⏱️</Text>

        {/* Timer Display */}
        <Text style={styles.timerText}>{formatTime(remainingSeconds)}</Text>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBackground}>
            <View
              style={[
                styles.progressFill,
                { width: `${progress * 100}%` },
              ]}
            />
          </View>
        </View>

        {/* Deep Focus Indicator */}
        {config.deepFocusMode && (
          <View style={styles.deepFocusBadge}>
            <Text style={styles.deepFocusText}>🧘</Text>
          </View>
        )}
      </View>

      {/* End Early Button */}
      <Pressable
        style={({ pressed }) => [
          styles.endButton,
          pressed && styles.endButtonPressed,
        ]}
        onPress={onEndEarly}
      >
        <Text style={styles.endButtonText}>End</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    zIndex: 10,
  },
  cameraButton: {
    backgroundColor: '#FFF8E7',
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#5D4037',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 2,
    borderColor: '#DDD5C7',
  },
  cameraButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.95 }],
  },
  cameraButtonText: {
    fontSize: 22,
  },
  timerCard: {
    flex: 1,
    backgroundColor: '#FFF8E7',
    borderRadius: 16,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#5D4037',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 2,
    borderColor: '#DDD5C7',
  },
  icon: {
    fontSize: 20,
  },
  timerText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#3D3D3D',
    fontVariant: ['tabular-nums'],
  },
  progressContainer: {
    flex: 1,
    marginLeft: 4,
  },
  progressBackground: {
    height: 6,
    backgroundColor: '#DDD5C7',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4A7C59',
    borderRadius: 3,
  },
  deepFocusBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  deepFocusText: {
    fontSize: 14,
  },
  endButton: {
    backgroundColor: '#8B7355',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    shadowColor: '#5D4037',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  endButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  endButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
