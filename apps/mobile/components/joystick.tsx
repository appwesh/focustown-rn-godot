import { useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  PanResponder,
  Animated,
  GestureResponderEvent,
  PanResponderGestureState,
} from 'react-native';

interface JoystickProps {
  /** Size of the outer joystick ring */
  size?: number;
  /** Callback when joystick position changes (x, y in range -1 to 1) */
  onMove: (x: number, y: number) => void;
  /** Callback when joystick is released */
  onRelease?: () => void;
}

export function Joystick({ size = 140, onMove, onRelease }: JoystickProps) {
  const knobSize = size * 0.5;
  const maxDistance = (size - knobSize) / 2;
  const knobPosition = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const centerRef = useRef({ x: 0, y: 0 });

  const clampMagnitude = (x: number, y: number, maxMag: number) => {
    const mag = Math.sqrt(x * x + y * y);
    if (mag > maxMag) {
      return { x: (x / mag) * maxMag, y: (y / mag) * maxMag };
    }
    return { x, y };
  };

  const handleMove = useCallback(
    (gestureState: PanResponderGestureState) => {
      const { dx, dy } = gestureState;
      const clamped = clampMagnitude(dx, dy, maxDistance);

      knobPosition.setValue(clamped);

      // Normalize to -1 to 1
      const normalizedX = clamped.x / maxDistance;
      const normalizedY = clamped.y / maxDistance;
      onMove(normalizedX, normalizedY);
    },
    [maxDistance, onMove, knobPosition]
  );

  const handleRelease = useCallback(() => {
    Animated.spring(knobPosition, {
      toValue: { x: 0, y: 0 },
      useNativeDriver: false,
      friction: 5,
      tension: 100,
    }).start();
    onMove(0, 0);
    onRelease?.();
  }, [knobPosition, onMove, onRelease]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        // Stop any animation when touch starts
        knobPosition.stopAnimation();
      },
      onPanResponderMove: (_: GestureResponderEvent, gestureState: PanResponderGestureState) => {
        handleMove(gestureState);
      },
      onPanResponderRelease: () => {
        handleRelease();
      },
      onPanResponderTerminate: () => {
        handleRelease();
      },
    })
  ).current;

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        },
      ]}
      {...panResponder.panHandlers}
    >
      {/* Direction indicators */}
      <View style={styles.indicatorContainer}>
        <View style={[styles.indicator, styles.indicatorTop]} />
        <View style={[styles.indicator, styles.indicatorRight]} />
        <View style={[styles.indicator, styles.indicatorBottom]} />
        <View style={[styles.indicator, styles.indicatorLeft]} />
      </View>

      {/* Knob */}
      <Animated.View
        style={[
          styles.knob,
          {
            width: knobSize,
            height: knobSize,
            borderRadius: knobSize / 2,
            transform: [
              { translateX: knobPosition.x },
              { translateY: knobPosition.y },
            ],
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255, 248, 231, 0.25)',
    borderWidth: 3,
    borderColor: 'rgba(255, 248, 231, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  indicatorContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  indicator: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 248, 231, 0.3)',
  },
  indicatorTop: {
    top: 12,
  },
  indicatorRight: {
    right: 12,
  },
  indicatorBottom: {
    bottom: 12,
  },
  indicatorLeft: {
    left: 12,
  },
  knob: {
    backgroundColor: '#FFF8E7',
    shadowColor: '#5D4037',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
    borderWidth: 4,
    borderColor: '#DDD5C7',
  },
});

