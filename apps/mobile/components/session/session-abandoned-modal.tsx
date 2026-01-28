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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useSessionStore } from '@/lib/session';
import { useAmbienceStore } from '@/lib/sound';
import { Button } from '@/components/ui/button';

interface SessionAbandonedModalProps {
  visible: boolean;
  onTripleTap?: () => void;
}

export function SessionAbandonedModal({ visible, onTripleTap }: SessionAbandonedModalProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const goHomeFromAbandoned = useSessionStore((s) => s.goHomeFromAbandoned);
  const showBreakSetup = useSessionStore((s) => s.showBreakSetup);
  const stopNonMusic = useAmbienceStore((s) => s.stopNonMusic);

  const handleGoHome = useCallback(() => {
    stopNonMusic();
    goHomeFromAbandoned();
    router.dismissTo('/home');
  }, [stopNonMusic, goHomeFromAbandoned, router]);

  const handleContinue = useCallback(() => {
    // Clear the abandoned state, then go to break setup (like success modal)
    goHomeFromAbandoned();
    showBreakSetup();
  }, [goHomeFromAbandoned, showBreakSetup]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      supportedOrientations={['portrait', 'landscape']}
    >
      <Pressable style={[styles.backdrop, { paddingTop: insets.top + 16 }]} onPress={onTripleTap}>
        <View style={styles.container}>
          {/* Title */}
          <Text style={styles.title}>Session Ended Early</Text>

          {/* Message */}
          <Text style={styles.message}>
            No worries! You can always start another session when you're ready.
          </Text>

          {/* Buttons */}
          <View style={styles.buttonColumn}>
            <Button
              title="Leave Cafe"
              onPress={handleGoHome}
              variant="muted"
              size="medium"
              style={styles.button}
            />
            <Button
              title="Start Another"
              onPress={handleContinue}
              size="medium"
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
    maxWidth: 320,
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#83715B',
    borderBottomWidth: 7,
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
  buttonColumn: {
    width: '100%',
    gap: 12,
  },
  button: {
    width: '100%',
  },
});

