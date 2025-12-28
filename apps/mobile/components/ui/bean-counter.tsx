/**
 * BeanCounter - Displays user's bean/coin count
 * 
 * Syncs with Firebase user profile automatically.
 * Can be used anywhere in the app with consistent styling.
 */

import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ViewStyle,
  Pressable,
} from 'react-native';
import { useAuth } from '@/lib/firebase';

const beanIcon = require('@/assets/ui/bean.png');

type BeanCounterSize = 'small' | 'medium' | 'large';

interface BeanCounterProps {
  size?: BeanCounterSize;
  style?: ViewStyle;
  onPress?: () => void;
}

const SIZES = {
  small: {
    iconSize: 18,
    fontSize: 14,
    paddingH: 10,
    paddingV: 6,
    gap: 4,
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

export function BeanCounter({ size = 'medium', style, onPress }: BeanCounterProps) {
  const { userDoc } = useAuth();
  const beans = userDoc?.totalCoins ?? 0;
  const sizeConfig = SIZES[size];

  const content = (
    <View
      style={[
        styles.container,
        {
          paddingHorizontal: sizeConfig.paddingH,
          paddingVertical: sizeConfig.paddingV,
          gap: sizeConfig.gap,
          borderRadius: sizeConfig.borderRadius,
        },
        style,
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
        {beans.toLocaleString()}
      </Text>
    </View>
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
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E7',
    shadowColor: '#5D4037',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  text: {
    fontWeight: '700',
    color: '#5D4037',
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
});

