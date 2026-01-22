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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Slider from '@react-native-community/slider';
import { useSessionStore } from '@/lib/session';
import { Button } from '@/components/ui/button';

interface SessionSetupModalProps {
  visible: boolean;
}

// Duration range (minutes)
const MIN_DURATION = 5;
const MAX_DURATION = 60;
const STEP = 5;

export function SessionSetupModal({ visible }: SessionSetupModalProps) {
  const insets = useSafeAreaInsets();
  const config = useSessionStore((s) => s.config);
  const updateConfig = useSessionStore((s) => s.updateConfig);
  const startSession = useSessionStore((s) => s.startSession);
  const showBreakSetup = useSessionStore((s) => s.showBreakSetup);
  const hasCompletedAnySession = useSessionStore((s) => s.hasCompletedAnySession);

  const handleDurationChange = (value: number) => {
    // Snap to nearest step
    const snapped = Math.round(value / STEP) * STEP;
    updateConfig({ durationMinutes: snapped });
  };

  const handleToggleDeepFocus = (value: boolean) => {
    updateConfig({ deepFocusMode: value });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
    >
      <View style={[styles.backdrop, { paddingTop: insets.top + 16 }]}>
        <View style={styles.container}>
          {/* Timer Icon */}
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>⏱️</Text>
          </View>

          {/* Timer Display */}
          <Text style={styles.timerDisplay}>
            {config.durationMinutes}:00
          </Text>

          {/* Duration Slider */}
          <View style={styles.sliderContainer}>
            <Slider
              style={styles.slider}
              minimumValue={MIN_DURATION}
              maximumValue={MAX_DURATION}
              step={STEP}
              value={config.durationMinutes}
              onValueChange={handleDurationChange}
              minimumTrackTintColor="#5D4037"
              maximumTrackTintColor="#D5CCC0"
              thumbTintColor="#FFF"
            />
          </View>

          {/* Deep Focus Toggle */}
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

          {/* Take a break link - only shown after completing at least one session */}
          {hasCompletedAnySession && (
            <Pressable
              style={styles.linkButton}
              onPress={showBreakSetup}
            >
              <Text style={styles.linkText}>Take a break instead</Text>
            </Pressable>
          )}

          {/* Start Button */}
          <Button
            title="Start Session"
            onPress={startSession}
            style={styles.startButton}
          />
        </View>
      </View>
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
});
