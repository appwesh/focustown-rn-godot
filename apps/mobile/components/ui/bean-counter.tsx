/**
 * BeanCounter - Displays user's bean/coin count
 * 
 * Syncs with Firebase user profile automatically.
 * Can be used anywhere in the app with consistent styling.
 * Animates smoothly when count changes.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ViewStyle,
  Pressable,
  Animated,
  Easing,
} from 'react-native';
import { useAuth } from '@/lib/firebase';

const beanIcon = require('@/assets/ui/bean.png');

type BeanCounterSize = 'small' | 'medium' | 'large';

interface BeanCounterProps {
  size?: BeanCounterSize;
  style?: ViewStyle;
  onPress?: () => void;
  /** Delay in ms before increment animation starts (for syncing with flying beans) */
  incrementDelay?: number;
}

// Animated number that counts up/down smoothly
function useAnimatedCount(targetValue: number, duration: number = 600, delay: number = 0) {
  const [displayValue, setDisplayValue] = useState(targetValue);
  const previousValue = useRef(targetValue);
  const animationRef = useRef<number | null>(null);
  const delayTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const startValue = previousValue.current;
    const endValue = targetValue;
    
    if (startValue === endValue) return;

    const startAnimation = () => {
      const startTime = Date.now();
      const diff = endValue - startValue;

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Ease out cubic for smooth deceleration
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const currentValue = Math.round(startValue + diff * easeOut);
        
        setDisplayValue(currentValue);

        if (progress < 1) {
          animationRef.current = requestAnimationFrame(animate);
        } else {
          previousValue.current = endValue;
        }
      };

      animationRef.current = requestAnimationFrame(animate);
    };

    // Only delay for increases (coin gains), not decreases
    const shouldDelay = delay > 0 && endValue > startValue;
    
    if (shouldDelay) {
      delayTimeoutRef.current = setTimeout(startAnimation, delay);
    } else {
      startAnimation();
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (delayTimeoutRef.current) {
        clearTimeout(delayTimeoutRef.current);
      }
    };
  }, [targetValue, duration, delay]);

  return displayValue;
}

const SIZES = {
  small: {
    iconSize: 18,
    fontSize: 14,
    paddingH: 10,
    paddingV: 6,
    gap: 2,
    borderRadius: 14,
  },
  medium: {
    iconSize: 24,
    fontSize: 16,
    paddingH: 12,
    paddingV: 8,
    gap: 6,
    borderRadius: 16,
  },
  large: {
    iconSize: 32,
    fontSize: 20,
    paddingH: 16,
    paddingV: 10,
    gap: 8,
    borderRadius: 20,
  },
};

export function BeanCounter({ size = 'medium', style, onPress, incrementDelay = 0 }: BeanCounterProps) {
  const { userDoc } = useAuth();
  const beans = userDoc?.totalCoins ?? 0;
  const sizeConfig = SIZES[size];
  
  // Animated count that smoothly transitions (with optional delay for flying beans sync)
  const displayBeans = useAnimatedCount(beans, 600, incrementDelay);
  
  // Scale animation for pulse effect when value increases
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const previousBeans = useRef(beans);
  const pulseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  useEffect(() => {
    // Only pulse when beans increase
    if (beans > previousBeans.current) {
      const runPulse = () => {
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.15,
            duration: 150,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 200,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ]).start();
      };
      
      // Delay pulse to sync with flying beans animation
      if (incrementDelay > 0) {
        pulseTimeoutRef.current = setTimeout(runPulse, incrementDelay);
      } else {
        runPulse();
      }
    }
    previousBeans.current = beans;
    
    return () => {
      if (pulseTimeoutRef.current) {
        clearTimeout(pulseTimeoutRef.current);
      }
    };
  }, [beans, scaleAnim, incrementDelay]);

  const content = (
    <Animated.View
      style={[
        styles.outerContainer,
        { 
          borderRadius: sizeConfig.borderRadius,
          transform: [{ scale: scaleAnim }],
        },
        style,
      ]}
    >
      {/* Inner shadow overlay - top/left darker edge */}
      <View
        style={[
          styles.innerShadow,
          { borderRadius: sizeConfig.borderRadius },
        ]}
        pointerEvents="none"
      />
      <View
        style={[
          styles.container,
          {
            paddingHorizontal: sizeConfig.paddingH,
            paddingVertical: sizeConfig.paddingV,
            gap: sizeConfig.gap,
            borderRadius: sizeConfig.borderRadius,
          },
        ]}
      >
        <Image
          source={beanIcon}
          style={{
            width: sizeConfig.iconSize,
            height: sizeConfig.iconSize,
            resizeMode: 'contain',
          }}
        />
        <Text
          style={[
            styles.text,
            { fontSize: sizeConfig.fontSize },
          ]}
        >
          {displayBeans.toLocaleString()}
        </Text>
      </View>
    </Animated.View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => pressed && styles.pressed}
      >
        {content}
      </Pressable>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  outerContainer: {
    position: 'relative',
    overflow: 'hidden',
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F6F4E7',
  },
  innerShadow: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 2,
    borderTopColor: 'rgba(0, 0, 0, 0.12)',
    borderLeftColor: 'rgba(0, 0, 0, 0.08)',
    borderRightColor: 'rgba(255, 255, 255, 0.3)',
    borderBottomColor: 'rgba(255, 255, 255, 0.3)',
    zIndex: 10,
  },
  text: {
    fontWeight: '900',
    color: '#5D4037',
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
});
