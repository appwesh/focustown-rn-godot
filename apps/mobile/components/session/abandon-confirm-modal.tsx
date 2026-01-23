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
import { Button } from '@/components/ui/button';

interface AbandonConfirmModalProps {
  visible: boolean;
  onTripleTap?: () => void;
}

export function AbandonConfirmModal({ visible, onTripleTap }: AbandonConfirmModalProps) {
  const confirmAbandonSession = useSessionStore((s) => s.confirmAbandonSession);
  const cancelAbandonSession = useSessionStore((s) => s.cancelAbandonSession);
  const isGroupSession = useSessionStore((s) => s.isGroupSession);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      supportedOrientations={['portrait', 'landscape']}
    >
      <Pressable style={styles.backdrop} onPress={onTripleTap}>
        <View style={styles.container}>
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
            <Button
              title="Keep Going"
              onPress={cancelAbandonSession}
              size="small"
              style={styles.button}
            />
            <Button
              title={isGroupSession ? 'End for All' : 'End Session'}
              onPress={confirmAbandonSession}
              variant="muted"
              size="small"
              style={styles.button}
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
  title: {
    fontSize: 24,
    fontFamily: 'Poppins_700Bold',
    color: '#5D4037',
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
  },
});

