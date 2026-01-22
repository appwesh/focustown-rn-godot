/**
 * Session Complete Modal
 * 
 * Shown when focus session ends.
 * Displays session stats with confetti celebration.
 */

import React, { useEffect, useRef, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useSessionStore, formatDuration } from '@/lib/session';
import { Button } from '@/components/ui/button';

interface SessionCompleteModalProps {
  visible: boolean;
}

// Confetti piece component
function ConfettiPiece({ delay, startX }: { delay: number; startX: number }) {
  const translateY = useRef(new Animated.Value(-50)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const rotate = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const animate = () => {
      translateY.setValue(-50);
      translateX.setValue(0);
      rotate.setValue(0);
      opacity.setValue(1);

      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 400,
          duration: 2500,
          delay,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(translateX, {
          toValue: (Math.random() - 0.5) * 100,
          duration: 2500,
          delay,
          useNativeDriver: true,
        }),
        Animated.timing(rotate, {
          toValue: Math.random() * 4 - 2,
          duration: 2500,
          delay,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 2500,
          delay: delay + 1500,
          useNativeDriver: true,
        }),
      ]).start();
    };

    animate();
  }, [delay, translateY, translateX, rotate, opacity]);

  const colors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#DDA0DD'];
  const color = colors[Math.floor(Math.random() * colors.length)];

  return (
    <Animated.View
      style={[
        styles.confetti,
        {
          left: startX,
          backgroundColor: color,
          transform: [
            { translateY },
            { translateX },
            { rotate: rotate.interpolate({
              inputRange: [0, 1],
              outputRange: ['0deg', '360deg'],
            })},
          ],
          opacity,
        },
      ]}
    />
  );
}

export function SessionCompleteModal({ visible }: SessionCompleteModalProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const completedSession = useSessionStore((s) => s.completedSession);
  const goHome = useSessionStore((s) => s.goHome);
  const showBreakSetup = useSessionStore((s) => s.showBreakSetup);

  const handleGoHome = useCallback(() => {
    goHome();
    router.dismissTo('/home');
  }, [goHome, router]);

  if (!completedSession) return null;

  const { durationSeconds, coinsEarned, totalTimeToday } = completedSession;

  // Generate confetti pieces
  const confettiPieces = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    delay: Math.random() * 500,
    startX: Math.random() * 300,
  }));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
    >
      <View style={[styles.backdrop, { paddingTop: insets.top + 16 }]}>
        {/* Confetti */}
        <View style={styles.confettiContainer}>
          {confettiPieces.map((piece) => (
            <ConfettiPiece
              key={piece.id}
              delay={piece.delay}
              startX={piece.startX}
            />
          ))}
        </View>

        <View style={styles.container}>
          {/* Success Header */}
          <Text style={styles.successText}>Success!</Text>

          {/* Stats */}
          <View style={styles.statsContainer}>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Session:</Text>
              <View style={styles.statValueRow}>
                <Text style={styles.beanIcon}>☕</Text>
                <Text style={styles.statValue}>{formatDuration(durationSeconds)}</Text>
              </View>
            </View>

            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Total Time:</Text>
              <Text style={styles.statValue}>{formatDuration(totalTimeToday)}</Text>
            </View>

            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Beans</Text>
              <View style={styles.statValueRow}>
                <Text style={styles.beanIcon}>☕</Text>
                <Text style={styles.statValue}>{coinsEarned}</Text>
              </View>
            </View>
          </View>

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            <Button
              title="Leave Cafe"
              onPress={handleGoHome}
              variant="muted"
              style={styles.button}
            />
            <Button
              title="Start Another"
              onPress={showBreakSetup}
              style={styles.button}
            />
          </View>
        </View>

        {/* Floating beans decoration */}
        <Animated.Text style={[styles.floatingBean, styles.bean1]}>☕</Animated.Text>
        <Animated.Text style={[styles.floatingBean, styles.bean2]}>🫘</Animated.Text>
        <Animated.Text style={[styles.floatingBean, styles.bean3]}>☕</Animated.Text>
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
  confettiContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  confetti: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 2,
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
  successText: {
    fontSize: 36,
    fontFamily: 'Poppins_700Bold',
    color: '#5D4037',
    marginBottom: 24,
  },
  statsContainer: {
    width: '100%',
    gap: 12,
    marginBottom: 28,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#5D4037',
  },
  statValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#3D3D3D',
  },
  beanIcon: {
    fontSize: 16,
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  button: {
    width: '100%',
  },
  floatingBean: {
    position: 'absolute',
    fontSize: 40,
  },
  bean1: {
    top: '15%',
    right: '10%',
  },
  bean2: {
    top: '35%',
    right: '5%',
  },
  bean3: {
    top: '55%',
    right: '12%',
  },
});

