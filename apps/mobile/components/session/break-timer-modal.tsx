/**
 * Break Timer Modal & Overlay
 * 
 * Shown after completing a focus session.
 * - Setup phase: Modal with duration slider
 * - Active break: Bottom overlay (uses shared TimerOverlay)
 */

import React from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSessionStore, formatTime, formatMinutesDisplay } from '@/lib/session';
import { Button, TimerOverlay, TimerSlider } from '@/components/ui';

// Break duration range (minutes)
const MIN_BREAK = 1;
const MAX_BREAK = 15;
const STEP = 1;

interface BreakTimerModalProps {
  visible: boolean;
  onTripleTap?: () => void;
}

export function BreakTimerModal({ visible, onTripleTap }: BreakTimerModalProps) {
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
        supportedOrientations={['portrait', 'landscape']}
      >
        <Pressable style={[styles.backdrop, { paddingTop: insets.top + 16 }]} onPress={onTripleTap}>
          <View style={styles.container}>
            {/* Rest Icon */}
            <View style={styles.iconContainer}>
              <Text style={styles.icon}>🌴</Text>
            </View>

            {/* Timer Display */}
            <Text style={styles.timerDisplay}>
              {formatMinutesDisplay(breakDurationMinutes)}
            </Text>

            {/* Duration Slider */}
            <View style={styles.sliderContainer}>
              <TimerSlider
                minimumValue={MIN_BREAK}
                maximumValue={MAX_BREAK}
                step={STEP}
                value={breakDurationMinutes}
                onValueChange={handleDurationChange}
              />
            </View>

            {/* Start Another Session Button */}
            <Button
              title="Start another session"
              onPress={startAnotherSession}
              variant="muted"
              size="medium"
              style={styles.secondaryButton}
            />

            {/* Start Break Button */}
            <Button
              title="Start Break"
              size="medium"
              onPress={startBreak}
              style={styles.mainButton}
            />
          </View>
        </Pressable>
      </Modal>
    );
  }

  // Break in progress - show bottom overlay (uses shared TimerOverlay)
  const { remainingSeconds } = breakSession;

  return (
    <TimerOverlay
      visible={visible}
      time={formatTime(remainingSeconds)}
      label="Break"
      buttonTitle="End Break"
      onButtonPress={endBreak}
      onTripleTap={onTripleTap}
    />
  );
}

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
    marginBottom: 24,
  },
  secondaryButton: {
    width: '100%',
    marginBottom: 12,
  },
  mainButton: {
    width: '100%',
  },
});
