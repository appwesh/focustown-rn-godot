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
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSessionStore, formatTime, formatMinutesDisplay } from '@/lib/session';
import { Button, TimerOverlay, TimerSlider } from '@/components/ui';

const palmTreeIcon = require('@/assets/ui/palmtree.png');

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
              <Image source={palmTreeIcon} style={styles.palmTreeIcon} />
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
                color="#4FB458"
              />
            </View>

            {/* Buttons */}
            <View style={styles.buttonsContainer}>
              {/* Start Another Session Button */}
              <Button
                title="Start another session"
                onPress={startAnotherSession}
                variant="muted"
                size="small"
              />

              {/* Start Break Button */}
              <Button
                title="Start Break"
                size="medium"
                variant="break"
                onPress={startBreak}
              />
            </View>
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
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFF8E7',
    borderRadius: 24,
    padding: 28,
    width: '100%',
    maxWidth: 340,
    borderWidth: 3,
    borderColor: '#83715B',
    borderBottomWidth: 7,
  },
  iconContainer: {
    position: 'absolute',
    top: 20,
    left: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  palmTreeIcon: {
    width: 44,
    height: 44,
    resizeMode: 'contain',
  },
  timerDisplay: {
    fontSize: 80,
    fontFamily: 'Poppins_700Bold',
    color: '#4FB458',
  },
  sliderContainer: {
    width: '100%',
  },
  buttonsContainer: {
    width: '100%',
    flexDirection: 'column',
    gap: 12,
    marginTop: 24,
  },
});
