/**
 * Break Timer Modal & Overlay
 * 
 * Shown after completing a focus session.
 * - Setup phase: Modal with duration picker
 * - Active break: Bottom overlay (same style as active session)
 */

import React from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSessionStore, formatTime } from '@/lib/session';

// Break duration options in minutes
const BREAK_DURATIONS = [1, 3, 5, 10, 15] as const;

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

  // Break not started yet - show duration picker modal
  if (!breakSession) {
    return (
      <Modal
        visible={visible}
        transparent
        animationType="fade"
      >
        <View style={styles.backdrop}>
          <View style={styles.container}>
            {/* Rest Icon */}
            <View style={styles.iconContainer}>
              <Text style={styles.icon}>🌴</Text>
            </View>

            {/* Timer Display */}
            <Text style={styles.timerDisplay}>
              {breakDurationMinutes}:00
            </Text>

            {/* Duration Picker */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.durationPicker}
              style={styles.durationScroll}
            >
              {BREAK_DURATIONS.map((minutes) => (
                <Pressable
                  key={minutes}
                  style={[
                    styles.durationOption,
                    breakDurationMinutes === minutes && styles.durationOptionSelected,
                  ]}
                  onPress={() => setBreakDuration(minutes)}
                >
                  <Text
                    style={[
                      styles.durationOptionText,
                      breakDurationMinutes === minutes && styles.durationOptionTextSelected,
                    ]}
                  >
                    {minutes}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            {/* Start Another Session Link */}
            <Pressable
              style={styles.linkButton}
              onPress={startAnotherSession}
            >
              <Text style={styles.linkText}>Start another session</Text>
            </Pressable>

            {/* Start Break Button */}
            <Pressable
              style={({ pressed }) => [
                styles.mainButton,
                pressed && styles.mainButtonPressed,
              ]}
              onPress={startBreak}
            >
              <Text style={styles.mainButtonText}>Start Break</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    );
  }

  // Break in progress - show bottom overlay (same style as active session)
  const { durationSeconds, remainingSeconds } = breakSession;
  const progress = 1 - remainingSeconds / durationSeconds;

  if (!visible) return null;

  return (
    <View style={[overlayStyles.container, { bottom: insets.bottom + 24 }]}>
      <View style={overlayStyles.timerCard}>
        {/* Break Icon */}
        <Text style={overlayStyles.icon}>🌴</Text>

        {/* Timer Display */}
        <Text style={overlayStyles.timerText}>{formatTime(remainingSeconds)}</Text>

        {/* Progress Bar */}
        <View style={overlayStyles.progressContainer}>
          <View style={overlayStyles.progressBackground}>
            <View
              style={[
                overlayStyles.progressFill,
                { width: `${progress * 100}%` },
              ]}
            />
          </View>
        </View>
      </View>

      {/* End Break Button */}
      <Pressable
        style={({ pressed }) => [
          overlayStyles.endButton,
          pressed && overlayStyles.endButtonPressed,
        ]}
        onPress={endBreak}
      >
        <Text style={overlayStyles.endButtonText}>End</Text>
      </Pressable>
    </View>
  );
}

// Modal styles (for setup phase)
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
    padding: 28,
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
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#DDD5C7',
  },
  icon: {
    fontSize: 28,
  },
  timerDisplay: {
    fontSize: 72,
    fontWeight: '700',
    color: '#3D3D3D',
    fontVariant: ['tabular-nums'],
    marginBottom: 20,
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
    backgroundColor: '#4A9B8C',
    borderColor: '#3D857A',
  },
  durationOptionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#5D4037',
  },
  durationOptionTextSelected: {
    color: '#FFF',
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
    backgroundColor: '#4A9B8C',
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 16,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#2D6A5E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  mainButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  mainButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
  },
});

// Overlay styles (for active break - same as active session)
const overlayStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    zIndex: 10,
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
    backgroundColor: '#4A9B8C',
    borderRadius: 3,
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
