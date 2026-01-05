/**
 * Abandon Session Confirmation Modal
 * 
 * Shown when user tries to end a session early.
 * Warns them they won't earn any coins.
 * For group sessions, warns that it will FAIL for everyone (no rewards).
 */

import React from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
} from 'react-native';
import { useSessionStore } from '@/lib/session';

interface AbandonConfirmModalProps {
  visible: boolean;
}

export function AbandonConfirmModal({ visible }: AbandonConfirmModalProps) {
  const confirmAbandonSession = useSessionStore((s) => s.confirmAbandonSession);
  const cancelAbandonSession = useSessionStore((s) => s.cancelAbandonSession);
  const isGroupSession = useSessionStore((s) => s.isGroupSession);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
    >
      <View style={styles.backdrop}>
        <View style={styles.container}>
          {/* Warning Icon */}
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>{isGroupSession ? '👥' : '⚠️'}</Text>
          </View>

          {/* Title */}
          <Text style={styles.title}>End Session Early?</Text>

          {/* Message */}
          <Text style={styles.message}>
            {isGroupSession
              ? "This will fail the session for everyone.\nNo one in your group will earn any coins!"
              : "You won't earn any coins if you quit now.\nYour progress will be lost."}
          </Text>

          {/* Buttons */}
          <View style={styles.buttonRow}>
            <Pressable
              style={({ pressed }) => [
                styles.button,
                styles.cancelButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={cancelAbandonSession}
            >
              <Text style={styles.cancelButtonText}>Keep Going</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.button,
                styles.confirmButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={confirmAbandonSession}
            >
              <Text style={styles.confirmButtonText}>
                {isGroupSession ? 'End for All' : 'End Session'}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
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
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFF3E0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#FFB74D',
  },
  icon: {
    fontSize: 32,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#3D3D3D',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    color: '#6B6B6B',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  buttonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  cancelButton: {
    backgroundColor: '#4A7C59',
    shadowColor: '#2D4A35',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  cancelButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
  confirmButton: {
    backgroundColor: '#E8E0D5',
    borderWidth: 2,
    borderColor: '#D5CCC0',
  },
  confirmButtonText: {
    color: '#8B7355',
    fontSize: 15,
    fontWeight: '600',
  },
});

