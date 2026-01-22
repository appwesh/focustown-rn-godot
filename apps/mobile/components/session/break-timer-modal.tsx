/**
 * Break Timer Modal & Overlay
 * 
 * Shown after completing a focus session.
 * - Setup phase: Modal with duration slider
 * - Active break: Bottom overlay (same style as active session)
 */

import React from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSessionStore, formatTime } from '@/lib/session';
import { Button } from '@/components/ui/button';

// Break duration range (minutes)
const MIN_BREAK = 1;
const MAX_BREAK = 15;
const STEP = 1;

interface BreakTimerModalProps {
  visible: boolean;
}

export function BreakTimerModal({ visible }: BreakTimerModalProps) {
  const insets = useSafeAreaInsets();
  const breakSession = useSessionStore((s) => s.breakSession);
  const breakDurationMinutes = useSessionStore((s) => s.breakDurationMinutes);
  const setBreakDuration = useSessionStore((s) => s.setBreakDuration);
  const startBreak = useSessionStore((s) => s.startBreak);
  const endBreak = useSessionStore((s) => s.endBreak);
  const startAnotherSession = useSessionStore((s) => s.startAnotherSession);

  const handleDurationChange = (value: number) => {
    setBreakDuration(Math.round(value));
  };

  // Break not started yet - show duration picker modal
  if (!breakSession) {
    return (
      <Modal
        visible={visible}
        transparent
        animationType="fade"
      >
        <View style={[styles.backdrop, { paddingTop: insets.top + 16 }]}>
          <View style={styles.container}>
            {/* Rest Icon */}
            <View style={styles.iconContainer}>
              <Text style={styles.icon}>🌴</Text>
            </View>

            {/* Timer Display */}
            <Text style={styles.timerDisplay}>
              {breakDurationMinutes}:00
            </Text>

            {/* Duration Slider */}
            <View style={styles.sliderContainer}>
              <Slider
                style={styles.slider}
                minimumValue={MIN_BREAK}
                maximumValue={MAX_BREAK}
                step={STEP}
                value={breakDurationMinutes}
                onValueChange={handleDurationChange}
                minimumTrackTintColor="#5D4037"
                maximumTrackTintColor="#D5CCC0"
                thumbTintColor="#FFF"
              />
            </View>

            {/* Start Another Session Link */}
            <Pressable
              style={styles.linkButton}
              onPress={startAnotherSession}
            >
              <Text style={styles.linkText}>Start another session</Text>
            </Pressable>

            {/* Start Break Button */}
            <Button
              title="Start Break"
              onPress={startBreak}
              style={styles.mainButton}
            />
          </View>
        </View>
      </Modal>
    );
  }

  // Break in progress - show bottom overlay (same style as active session)
  const { remainingSeconds } = breakSession;

  if (!visible) return null;

  return (
    <View style={[overlayStyles.container, { bottom: insets.bottom + 24 }]}>
      <View style={overlayStyles.card}>
        {/* Timer and Label */}
        <View style={overlayStyles.timerSection}>
          <Text style={overlayStyles.timerText}>{formatTime(remainingSeconds)}</Text>
          <Text style={overlayStyles.label}>Break</Text>
        </View>

        {/* End Break Button */}
        <Button
          title="End Break"
          onPress={endBreak}
          size="small"
        />
      </View>
    </View>
  );
}

// Modal styles (for setup phase)
const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  container: {
    backgroundColor: '#FFF8E7',
    borderRadius: 24,
    padding: 28,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    shadowColor: '#5D4037',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
    borderWidth: 3,
    borderColor: '#DDD5C7',
  },
  iconContainer: {
    position: 'absolute',
    top: 20,
    left: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    fontSize: 32,
  },
  timerDisplay: {
    fontSize: 80,
    fontFamily: 'Poppins_700Bold',
    color: '#5D4037',
    marginTop: 20,
    marginBottom: 16,
  },
  sliderContainer: {
    width: '100%',
    paddingHorizontal: 8,
    marginBottom: 24,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  linkButton: {
    marginBottom: 20,
  },
  linkText: {
    fontSize: 14,
    color: '#8B7355',
    textDecorationLine: 'underline',
  },
  mainButton: {
    width: '100%',
  },
});

// Overlay styles (for active break - same as active session)
const overlayStyles = StyleSheet.create({
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
