/**
 * Session Abandoned Modal
 * 
 * Shown when user ends a session early.
 * Simple message with go home and continue options.
 */

import React, { useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSessionStore } from '@/lib/session';

interface SessionAbandonedModalProps {
  visible: boolean;
}

export function SessionAbandonedModal({ visible }: SessionAbandonedModalProps) {
  const router = useRouter();
  const goHomeFromAbandoned = useSessionStore((s) => s.goHomeFromAbandoned);
  const continueFromAbandoned = useSessionStore((s) => s.continueFromAbandoned);

  const handleGoHome = useCallback(() => {
    goHomeFromAbandoned();
    router.dismissTo('/home');
  }, [goHomeFromAbandoned, router]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
    >
      <View style={styles.backdrop}>
        <View style={styles.container}>
          {/* Icon */}
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>📚</Text>
          </View>

          {/* Title */}
          <Text style={styles.title}>Session Ended Early</Text>

          {/* Message */}
          <Text style={styles.message}>
            No worries! You can always start another session when you're ready.
          </Text>

          {/* Buttons */}
          <View style={styles.buttonColumn}>
            <Pressable
              style={({ pressed }) => [
                styles.button,
                styles.continueButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={continueFromAbandoned}
            >
              <Text style={styles.continueButtonText}>Continue</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.button,
                styles.homeButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={handleGoHome}
            >
              <Text style={styles.homeButtonText}>Go Home</Text>
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
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#DDD5C7',
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
  buttonColumn: {
    width: '100%',
    gap: 12,
  },
  button: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    width: '100%',
  },
  buttonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  continueButton: {
    backgroundColor: '#4A7C59',
    shadowColor: '#2D4A35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  continueButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
  },
  homeButton: {
    backgroundColor: '#E8E0D5',
    borderWidth: 2,
    borderColor: '#D5CCC0',
  },
  homeButtonText: {
    color: '#8B7355',
    fontSize: 16,
    fontWeight: '600',
  },
});

