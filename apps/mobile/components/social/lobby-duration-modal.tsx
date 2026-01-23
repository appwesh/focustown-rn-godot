/**
 * Lobby Duration Modal
 * 
 * Shown when host creates a group study lobby.
 * Host selects the duration for the entire group session.
 */

import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
} from 'react-native';

// Duration options in minutes
const DURATION_OPTIONS = [5, 15, 25, 45, 60, 90];

interface LobbyDurationModalProps {
  visible: boolean;
  onSelect: (durationMinutes: number) => void;
  onCancel: () => void;
}

export function LobbyDurationModal({ visible, onSelect, onCancel }: LobbyDurationModalProps) {
  const [selectedDuration, setSelectedDuration] = useState(25);

  const handleConfirm = () => {
    onSelect(selectedDuration);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <Pressable style={styles.backdrop} onPress={onCancel}>
        <Pressable style={styles.container} onPress={e => e.stopPropagation()}>
          {/* Title */}
          <View style={styles.header}>
            <Text style={styles.emoji}>👥</Text>
            <Text style={styles.title}>Group Study</Text>
            <Text style={styles.subtitle}>Set the session duration for everyone</Text>
          </View>

          {/* Timer Display */}
          <Text style={styles.timerDisplay}>
            {selectedDuration}:00
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
                  selectedDuration === minutes && styles.durationOptionSelected,
                ]}
                onPress={() => setSelectedDuration(minutes)}
              >
                <Text
                  style={[
                    styles.durationOptionText,
                    selectedDuration === minutes && styles.durationOptionTextSelected,
                  ]}
                >
                  {minutes}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          {/* Info Text */}
          <Text style={styles.infoText}>
            Timer will start when everyone sits down
          </Text>

          {/* Buttons */}
          <View style={styles.buttons}>
            <Pressable
              style={({ pressed }) => [
                styles.cancelButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={onCancel}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
            
            <Pressable
              style={({ pressed }) => [
                styles.confirmButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={handleConfirm}
            >
              <Text style={styles.confirmButtonText}>Create Lobby</Text>
            </Pressable>
          </View>
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
    borderWidth: 3,
    borderColor: '#83715B',
    borderBottomWidth: 7,
  },
  header: {
    alignItems: 'center',
    marginBottom: 16,
  },
  emoji: {
    fontSize: 40,
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#3D3D3D',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B6B6B',
    textAlign: 'center',
  },
  timerDisplay: {
    fontSize: 56,
    fontWeight: '700',
    color: '#3D3D3D',
    fontVariant: ['tabular-nums'],
    marginBottom: 16,
  },
  durationScroll: {
    maxHeight: 56,
    marginBottom: 16,
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
  infoText: {
    fontSize: 13,
    color: '#8B8B8B',
    textAlign: 'center',
    marginBottom: 20,
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#FFF',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#DDD5C7',
  },
  cancelButtonText: {
    color: '#6B6B6B',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#4A7C59',
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  buttonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
});

