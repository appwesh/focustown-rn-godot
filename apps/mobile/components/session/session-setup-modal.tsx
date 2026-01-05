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
  ScrollView,
} from 'react-native';
import { useSessionStore } from '@/lib/session';
import { DURATION_OPTIONS } from '@/lib/session/types';

interface SessionSetupModalProps {
  visible: boolean;
}

export function SessionSetupModal({ visible }: SessionSetupModalProps) {
  const config = useSessionStore((s) => s.config);
  const updateConfig = useSessionStore((s) => s.updateConfig);
  const startSession = useSessionStore((s) => s.startSession);
  const cancelSetup = useSessionStore((s) => s.cancelSetup);

  const handleSelectDuration = (minutes: number) => {
    updateConfig({ durationMinutes: minutes });
  };

  const handleToggleDeepFocus = (value: boolean) => {
    updateConfig({ deepFocusMode: value });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={cancelSetup}
    >
      <Pressable style={styles.backdrop} onPress={cancelSetup}>
        <Pressable style={styles.container} onPress={e => e.stopPropagation()}>
          {/* Timer Icon */}
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>⏱️</Text>
          </View>

          {/* Timer Display */}
          <Text style={styles.timerDisplay}>
            {config.durationMinutes}:00
          </Text>

          {/* Duration Picker */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.durationPicker}
            style={styles.durationScroll}
          >
            {DURATION_OPTIONS.map((minutes) => (
              <Pressable
                key={minutes}
                style={[
                  styles.durationOption,
                  config.durationMinutes === minutes && styles.durationOptionSelected,
                ]}
                onPress={() => handleSelectDuration(minutes)}
              >
                <Text
                  style={[
                    styles.durationOptionText,
                    config.durationMinutes === minutes && styles.durationOptionTextSelected,
                  ]}
                >
                  {minutes}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          {/* Deep Focus Toggle */}
          <View style={styles.toggleRow}>
            <Switch
              value={config.deepFocusMode}
              onValueChange={handleToggleDeepFocus}
              trackColor={{ false: '#DDD5C7', true: '#4A7C59' }}
              thumbColor="#FFF8E7"
              ios_backgroundColor="#DDD5C7"
            />
            <Text style={styles.toggleLabel}>Deep focus mode</Text>
          </View>

          {/* Start Button */}
          <Pressable
            style={({ pressed }) => [
              styles.startButton,
              pressed && styles.startButtonPressed,
            ]}
            onPress={startSession}
          >
            <Text style={styles.startButtonText}>Start Session</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  container: {
    backgroundColor: '#FFF8E7',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 320,
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
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#DDD5C7',
  },
  icon: {
    fontSize: 24,
  },
  timerDisplay: {
    fontSize: 64,
    fontWeight: '700',
    color: '#3D3D3D',
    fontVariant: ['tabular-nums'],
    marginBottom: 16,
  },
  durationScroll: {
    maxHeight: 56,
    marginBottom: 20,
  },
  durationPicker: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 4,
  },
  durationOption: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#DDD5C7',
  },
  durationOptionSelected: {
    backgroundColor: '#4A7C59',
    borderColor: '#3D6A4A',
  },
  durationOptionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#5D4037',
  },
  durationOptionTextSelected: {
    color: '#FFF',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
  },
  toggleLabel: {
    fontSize: 16,
    color: '#3D3D3D',
    fontWeight: '500',
  },
  startButton: {
    backgroundColor: '#4A7C59',
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 16,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#2D4A35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  startButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  startButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
  },
});
