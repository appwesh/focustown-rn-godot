/**
 * Session Setup Modal
 * 
 * Shown when player sits at a study spot.
 * User configures timer duration and deep focus mode.
 */

import React, { useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  Switch,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSessionStore, formatMinutesDisplay } from '@/lib/session';
import { useButtonSound } from '@/lib/sound';
import { Button, TimerSlider } from '@/components/ui';

const clockIcon = require('@/assets/ui/clock.png');

interface SessionSetupModalProps {
  visible: boolean;
  onTripleTap?: () => void;
}

// Duration range (minutes)
const MIN_DURATION = 1;
const MAX_DURATION = 120;
const DEFAULT_DURATION = 20;
const STEP = 1;

export function SessionSetupModal({ visible, onTripleTap }: SessionSetupModalProps) {
  const insets = useSafeAreaInsets();
  const { playButtonSound } = useButtonSound();
  const config = useSessionStore((s) => s.config);
  const updateConfig = useSessionStore((s) => s.updateConfig);
  const startSession = useSessionStore((s) => s.startSession);
  const showBreakSetup = useSessionStore((s) => s.showBreakSetup);
  const hasCompletedAnySession = useSessionStore((s) => s.hasCompletedAnySession);

  const handleStartSession = useCallback(() => {
    playButtonSound();
    startSession();
  }, [playButtonSound, startSession]);

  const handleDurationChange = (value: number) => {
    // Snap to nearest step
    const snapped = Math.round(value / STEP) * STEP;
    updateConfig({ durationMinutes: snapped || DEFAULT_DURATION });
  };

  const handleToggleDeepFocus = (value: boolean) => {
    updateConfig({ deepFocusMode: value });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      supportedOrientations={['portrait', 'landscape']}
    >
      <Pressable style={[styles.backdrop, { paddingTop: insets.top + 16 }]} onPress={onTripleTap}>
        <View style={styles.container}>
          {/* Timer Icon */}
          <View style={styles.iconContainer}>
            <Image source={clockIcon} style={styles.clockIcon} />
          </View>

          {/* Timer Display */}
          <Text style={styles.timerDisplay}>
            {formatMinutesDisplay(config.durationMinutes)}
          </Text>

          {/* Duration Slider */}
          <View style={styles.sliderContainer}>
            <TimerSlider
              minimumValue={MIN_DURATION}
              maximumValue={MAX_DURATION}
              step={STEP}
              value={config.durationMinutes}
              onValueChange={handleDurationChange}
            />
          </View>

          {/* Deep Focus Toggle */}
          {/* TODO: Add deep focus toggle back in when we have a deep focus mode */}
          <View style={styles.toggleRow}>
            <Switch
              value={config.deepFocusMode}
              onValueChange={handleToggleDeepFocus}
              trackColor={{ false: '#DDD5C7', true: '#4A7C59' }}
              thumbColor="#FFF"
              ios_backgroundColor="#DDD5C7"
            />
            <Text style={styles.toggleLabel}>Deep focus mode</Text>
          </View>
          <View style={styles.buttonsContainer}> 
          {/* Take a break link - only shown after completing at least one session */}
          {hasCompletedAnySession && (
            <Button 
              title="Take a break instead"
              onPress={showBreakSetup}
              variant="muted"
              size="small"
            />
          )}

          {/* Start Button */}
          <Button
            title="Start Session"
            onPress={handleStartSession}
            variant="primary"
            size="medium"
            />
          </View>
        </View>
      </Pressable>
    </Modal>
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
  clockIcon: {
    width: 44,
    height: 44,
    resizeMode: 'contain',
  },
  timerDisplay: {
    fontSize: 80,
    fontFamily: 'Poppins_700Bold',
    color: '#735A42',

  },
  sliderContainer: {
    width: '100%',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 12,
    margin: 24,
    width: '100%',
  },
  toggleLabel: {
    fontSize: 18,
    color: '#735A42',
    fontWeight: '500',
  },
  startButton: {
    width: '100%',
  },
  buttonsContainer: {
    width: '100%',
    flexDirection: 'column',
    gap: 12,
  },
});
