/**
 * Timer Overlay
 * 
 * Reusable timer card that displays at the bottom of the screen.
 * Used for both focus sessions and breaks.
 * In landscape mode, positions on the right side only.
 */

import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from './button';

interface TimerOverlayProps {
  visible: boolean;
  time: string;
  label: string;
  buttonTitle: string;
  onButtonPress: () => void;
  onTripleTap?: () => void;
}

export function TimerOverlay({
  visible,
  time,
  label,
  buttonTitle,
  onButtonPress,
  onTripleTap,
}: TimerOverlayProps) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  const isLandscape = width > height;

  if (!visible) return null;

  // In landscape: position on right side only
  const containerStyle = isLandscape
    ? { right: insets.right + 16, bottom: insets.bottom + 16, left: undefined }
    : { left: 16, right: 16, bottom: insets.bottom + 24 };

  return (
    <View style={[styles.container, containerStyle]}>
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
        />
      </Pressable>
    </View>
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
