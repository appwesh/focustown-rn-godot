/**
 * Session Complete Modal
 * 
 * Shown when focus session ends.
 * Displays session stats with confetti celebration.
 */

import React, { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  Image,
  Dimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSequence,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAudioPlayer } from 'expo-audio';
import { useSessionStore, formatDuration } from '@/lib/session';
import { PrimaryButton } from '@/components/ui/button';
import * as Bridge from '@/lib/godot/bridge';

const beanIcon = require('@/assets/ui/bean.png');
const clockIcon = require('@/assets/ui/clock.png');
const successSound = require('@/assets/audio/success.mp3');
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CONFETTI_COLORS = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#DDA0DD'];

interface SessionCompleteModalProps {
  visible: boolean;
  onTripleTap?: () => void;
}

// Confetti piece component
function ConfettiPiece({ delay, startX, color, driftX, rotateAmount }: { 
  delay: number; 
  startX: number;
  color: string;
  driftX: number;
  rotateAmount: number;
}) {
  const translateY = useSharedValue(-50);
  const translateX = useSharedValue(0);
  const rotate = useSharedValue(0);
  const opacity = useSharedValue(1);

  useEffect(() => {
    translateY.value = withDelay(
      delay,
      withTiming(400, { duration: 2500, easing: Easing.out(Easing.quad) })
    );
    translateX.value = withDelay(
      delay,
      withTiming(driftX, { duration: 2500, easing: Easing.linear })
    );
    rotate.value = withDelay(
      delay,
      withTiming(rotateAmount, { duration: 2500, easing: Easing.linear })
    );
    opacity.value = withDelay(
      delay + 1500,
      withTiming(0, { duration: 1000, easing: Easing.linear })
    );
  }, [delay, driftX, rotateAmount]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { translateX: translateX.value },
      { rotate: `${rotate.value * 360}deg` },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.confetti,
        { left: startX, backgroundColor: color },
        animatedStyle,
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
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0);

  const deltaX = targetX - startX;
  const deltaY = targetY - startY;

  useEffect(() => {
    // Fade in after delay
    opacity.value = withDelay(
      delay,
      withSequence(
        // Fade in quickly
        withTiming(1, { duration: 50 }),
        // Stay visible during flight
        withDelay(700, withTiming(0, { duration: 100 }))
      )
    );

    // Fly to target after delay + fade in
    translateX.value = withDelay(
      delay + 50,
      withTiming(deltaX, { duration: 700, easing: Easing.out(Easing.cubic) })
    );
    translateY.value = withDelay(
      delay + 50,
      withTiming(deltaY, { duration: 700, easing: Easing.in(Easing.quad) })
    );
    scale.value = withDelay(
      delay + 50,
      withTiming(0.5, { duration: 700, easing: Easing.out(Easing.quad) }, (finished) => {
        if (finished && onComplete) {
          runOnJS(onComplete)();
        }
      })
    );
  }, [delay, deltaX, deltaY, onComplete]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.flyingBean,
        {
          left: startX - 16, // Center the bean (half of 32px width)
          top: startY - 16,  // Center the bean (half of 32px height)
        },
        animatedStyle,
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
  const successPlayer = useAudioPlayer(successSound);

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
      
      // Play success sound
      successPlayer.seekTo(0);
      successPlayer.play();
      
      return () => clearTimeout(timer);
    } else {
      setShowFlyingBeans(false);
      setBeanIconPosition(null);
    }
  }, [visible, completedSession, measureBeanIcon, successPlayer]);

  // Pre-compute random values for confetti pieces (memoized to prevent re-generation on re-renders)
  const confettiPieces = useMemo(() => 
    Array.from({ length: 20 }, (_, i) => ({
      id: i,
      delay: Math.random() * 500,
      startX: Math.random() * 300,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      driftX: (Math.random() - 0.5) * 100,
      rotateAmount: Math.random() * 4 - 2,
    })), [visible]); // Regenerate when modal visibility changes

  if (!completedSession) return null;

  const { durationSeconds, coinsEarned, totalTimeToday } = completedSession;

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
              color={piece.color}
              driftX={piece.driftX}
              rotateAmount={piece.rotateAmount}
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
                <Image source={clockIcon} style={styles.clockIconImage} />
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
            <PrimaryButton
              title="Leave Cafe"
              size="medium"
              onPress={handleGoHome}
              variant="muted"
              style={styles.button}
            />
            <PrimaryButton
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
  clockIconImage: {
    width: 24,
    height: 24,
    resizeMode: 'contain',
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

