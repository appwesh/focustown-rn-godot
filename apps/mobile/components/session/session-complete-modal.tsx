/**
 * Session Complete Modal
 * 
 * Shown when focus session ends.
 * Displays session stats with confetti celebration.
 */

import React, { useEffect, useRef, useCallback, useState } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
  Easing,
  Image,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useSessionStore, formatDuration } from '@/lib/session';
import { Button } from '@/components/ui/button';
import * as Bridge from '@/lib/godot/bridge';

const beanIcon = require('@/assets/ui/bean.png');
const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface SessionCompleteModalProps {
  visible: boolean;
  onTripleTap?: () => void;
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

// Flying bean component that animates to the top bean counter
interface FlyingBeanProps {
  delay: number;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  onComplete?: () => void;
}

function FlyingBean({ delay, startX, startY, targetX, targetY, onComplete }: FlyingBeanProps) {
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const deltaX = targetX - startX;
    const deltaY = targetY - startY;

    // Appear, fly to target, then fade out
    Animated.sequence([
      // Initial delay
      Animated.delay(delay),
      // Fade in quickly
      Animated.timing(opacity, {
        toValue: 1,
        duration: 50,
        useNativeDriver: true,
      }),
      // Fly to target with curve
      Animated.parallel([
        Animated.timing(translateX, {
          toValue: deltaX,
          duration: 700,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: deltaY,
          duration: 700,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 0.5,
          duration: 700,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
      // Fade out at destination
      Animated.timing(opacity, {
        toValue: 0,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onComplete?.();
    });
  }, [delay, startX, startY, targetX, targetY, translateX, translateY, scale, opacity, onComplete]);

  return (
    <Animated.View
      style={[
        styles.flyingBean,
        {
          left: startX - 16, // Center the bean (half of 32px width)
          top: startY - 16,  // Center the bean (half of 32px height)
          transform: [
            { translateX },
            { translateY },
            { scale },
          ],
          opacity,
        },
      ]}
    >
      <Image source={beanIcon} style={styles.flyingBeanIcon} />
    </Animated.View>
  );
}

export function SessionCompleteModal({ visible, onTripleTap }: SessionCompleteModalProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const completedSession = useSessionStore((s) => s.completedSession);
  const goHome = useSessionStore((s) => s.goHome);
  const showBreakSetup = useSessionStore((s) => s.showBreakSetup);
  const [showFlyingBeans, setShowFlyingBeans] = useState(false);
  const [beanIconPosition, setBeanIconPosition] = useState<{ x: number; y: number } | null>(null);
  const beanIconRef = useRef<View>(null);

  const handleGoHome = useCallback(() => {
    goHome();
    router.dismissTo('/home');
  }, [goHome, router]);

  // Measure bean icon position when modal becomes visible
  const measureBeanIcon = useCallback(() => {
    if (beanIconRef.current) {
      beanIconRef.current.measureInWindow((x, y, width, height) => {
        setBeanIconPosition({ x: x + width / 2, y: y + height / 2 });
        // Start animation after we have the position
        setTimeout(() => setShowFlyingBeans(true), 100);
      });
    }
  }, []);

  // Reset and start flying beans animation when modal becomes visible
  // Also trigger celebration animation in Godot
  useEffect(() => {
    if (visible && completedSession) {
      // Small delay to ensure modal is rendered before measuring
      const timer = setTimeout(measureBeanIcon, 300);
      
      // Trigger celebration animation in Godot (fist pump)
      Bridge.playCelebrationAnimation();
      
      return () => clearTimeout(timer);
    } else {
      setShowFlyingBeans(false);
      setBeanIconPosition(null);
    }
  }, [visible, completedSession, measureBeanIcon]);

  if (!completedSession) return null;

  const { durationSeconds, coinsEarned, totalTimeToday } = completedSession;

  // Generate confetti pieces
  const confettiPieces = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    delay: Math.random() * 500,
    startX: Math.random() * 300,
  }));

  // Generate flying beans - start from measured bean icon position
  const numFlyingBeans = Math.min(coinsEarned, 10); // Cap at 10 beans for performance
  const targetX = SCREEN_WIDTH - 45; // Top-right where bean counter is (right: 16 + half width)
  const targetY = insets.top + 22; // Match bean counter position (top: insets.top + 12 + half height)

  const flyingBeans = beanIconPosition ? Array.from({ length: numFlyingBeans }, (_, i) => ({
    id: i,
    delay: i * 60, // Stagger the beans
    startX: beanIconPosition.x + (Math.random() - 0.5) * 20,
    startY: beanIconPosition.y + (Math.random() - 0.5) * 20,
  })) : [];

  const handleBeanComplete = useCallback(() => {
    // No need to track completion anymore
  }, []);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      supportedOrientations={['portrait', 'landscape']}
    >
      <Pressable style={[styles.backdrop, { paddingTop: insets.top + 60 }]} onPress={onTripleTap}>
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
                <Text style={styles.timerIcon}>⏱</Text>
                <Text style={styles.statValue}>{formatDuration(durationSeconds)}</Text>
              </View>
            </View>

            {/* <View style={styles.statRow}>
              <Text style={styles.statLabel}>Total Time:</Text>
              <Text style={styles.statValue}>{formatDuration(totalTimeToday)}</Text>
            </View> */}

            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Beans</Text>
              <View style={styles.statValueRow}>
                <View ref={beanIconRef} collapsable={false}>
                  <Image source={beanIcon} style={styles.beanIconImage} />
                </View>
                <Text style={styles.statValue}>{coinsEarned}</Text>
              </View>
            </View>
          </View>

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            <Button
              title="Leave Cafe"
              size="medium"
              onPress={handleGoHome}
              variant="muted"
              style={styles.button}
            />
            <Button
              title="Start Another"
              size="medium"
              onPress={showBreakSetup}
              style={styles.button}
            />
          </View>
        </View>

        {/* Flying beans animation */}
        {showFlyingBeans && beanIconPosition && flyingBeans.map((bean) => (
          <FlyingBean
            key={bean.id}
            delay={bean.delay}
            startX={bean.startX}
            startY={bean.startY}
            targetX={targetX}
            targetY={targetY}
            onComplete={handleBeanComplete}
          />
        ))}
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
    borderWidth: 3,
    borderColor: '#83715B',
    borderBottomWidth: 7,
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
    fontSize: 20,
    fontFamily: 'Poppins_600SemiBold',
    color: '#5D4037',
  },
  statValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statValue: {
    fontSize: 20,
    fontFamily: 'Poppins_700Bold',
    color: '#5D4037',
  },
  timerIcon: {
    fontSize: 20,
  },
  beanIconImage: {
    width: 24,
    height: 24,
    resizeMode: 'contain',
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  button: {
    width: '100%',
  },
  flyingBean: {
    position: 'absolute',
    zIndex: 100,
  },
  flyingBeanIcon: {
    width: 32,
    height: 32,
    resizeMode: 'contain',
  },
});

