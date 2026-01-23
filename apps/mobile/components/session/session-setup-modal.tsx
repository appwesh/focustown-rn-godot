/**
 * Session Setup Modal
 * 
 * Shown when player sits at a study spot.
 * User configures timer duration and deep focus mode.
 */

import React from 'react';
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
  const config = useSessionStore((s) => s.config);
  const updateConfig = useSessionStore((s) => s.updateConfig);
  const startSession = useSessionStore((s) => s.startSession);
  const showBreakSetup = useSessionStore((s) => s.showBreakSetup);
  const hasCompletedAnySession = useSessionStore((s) => s.hasCompletedAnySession);

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
            onPress={startSession}
            variant="primary"
            size="big"
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
  clockIcon: {
    width: 44,
    height: 44,
    resizeMode: 'contain',
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
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
  },
  toggleLabel: {
    fontSize: 18,
    color: '#3D3D3D',
    fontWeight: '500',
  },
  linkButton: {
    marginBottom: 20,
  },
  linkText: {
    fontSize: 14,
    color: '#8B7355',
    textDecorationLine: 'underline',
  },
  startButton: {
    width: '100%',
  },
  buttonsContainer: {
    width: '100%',
    flexDirection: 'column',
    gap: 12,
    alignItems: 'center',
  },
});
