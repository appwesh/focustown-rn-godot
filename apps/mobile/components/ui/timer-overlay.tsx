/**
 * Timer Overlay
 * 
 * Reusable timer card that displays at the bottom of the screen.
 * Used for both focus sessions and breaks.
 * In landscape mode, positions on the right side only.
 * Animates in smoothly from the bottom.
 */

import React, { useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from './button';

type ButtonVariant = 'primary' | 'secondary' | 'muted' | 'disabled' | 'break' | 'danger';

interface TimerOverlayProps {
  visible: boolean;
  time: string;
  label: string;
  buttonTitle: string;
  onButtonPress: () => void;
  onTripleTap?: () => void;
  buttonVariant?: ButtonVariant;
}

export function TimerOverlay({
  visible,
  time,
  label,
  buttonTitle,
  onButtonPress,
  onTripleTap,
  buttonVariant = 'primary',
}: TimerOverlayProps) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  // Animation: slide up from bottom on appear
  const translateY = useSharedValue(150);

  useEffect(() => {
    if (visible) {
      // Reset to off-screen, then animate in
      translateY.value = 150;
      const timer = setTimeout(() => {
        translateY.value = withTiming(0, {
          duration: 300,
          easing: Easing.out(Easing.cubic),
        });
      }, 10);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  if (!visible) return null;

  // In landscape: position on right side only
  const containerStyle = isLandscape
    ? { right: insets.right + 16, bottom: insets.bottom + 16, left: undefined }
    : { left: 16, right: 16, bottom: insets.bottom + 20 };

  return (
    <Animated.View style={[styles.container, containerStyle, animatedStyle]}>
      <Pressable style={styles.card} onPress={onTripleTap}>
        {/* Timer and Label */}
        <View style={styles.timerSection}>
          <Text style={styles.timerText}>{time}</Text>
          <Text style={styles.label}>{label}</Text>
        </View>

        {/* Action Button */}
        <Button
          title={buttonTitle}
          onPress={onButtonPress}
          size="small"
          variant={buttonVariant}
        />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    zIndex: 10,
  },
  card: {
    backgroundColor: '#FFEFD6',
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    borderWidth: 3,
    borderColor: '#83715B',
    borderBottomWidth: 7,
    minWidth: 300,
  },
  timerSection: {
    flexDirection: 'column',
  },
  timerText: {
    fontSize: 28,
    fontFamily: 'Poppins_700Bold',
    color: '#735A42',
  },
  label: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    color: '#735A42',
    marginTop: -2,
  },
});
