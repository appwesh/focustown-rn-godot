/**
 * Custom Timer Slider
 * 
 * A pill-shaped slider with rounded thumb matching the app's cozy aesthetic.
 */

import React, { useRef, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  PanResponder,
  LayoutChangeEvent,
} from 'react-native';

interface TimerSliderProps {
  value: number;
  minimumValue: number;
  maximumValue: number;
  step?: number;
  onValueChange: (value: number) => void;
}

const TRACK_HEIGHT = 18;
const THUMB_WIDTH = 20;
const THUMB_HEIGHT = 36;

export function TimerSlider({
  value,
  minimumValue,
  maximumValue,
  step = 1,
  onValueChange,
}: TimerSliderProps) {
  const [trackWidth, setTrackWidth] = useState(0);
  const trackWidthRef = useRef(0);
  const startValueRef = useRef(value);
  
  // Keep refs to latest props for PanResponder callbacks
  const propsRef = useRef({ value, minimumValue, maximumValue, step, onValueChange });
  propsRef.current = { value, minimumValue, maximumValue, step, onValueChange };

  // Calculate value from position
  const getValueFromPosition = (x: number) => {
    const { minimumValue: min, maximumValue: max, step: s } = propsRef.current;
    const usableWidth = trackWidthRef.current - THUMB_WIDTH;
    if (usableWidth <= 0) return min;
    const percentage = Math.max(0, Math.min(1, x / usableWidth));
    let newValue = min + percentage * (max - min);
    
    // Snap to step
    if (s > 0) {
      newValue = Math.round(newValue / s) * s;
    }
    
    return Math.max(min, Math.min(max, newValue));
  };

  const panResponder = useMemo(() => 
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        // Jump to tap position
        const x = evt.nativeEvent.locationX - THUMB_WIDTH / 2;
        const newValue = getValueFromPosition(x);
        propsRef.current.onValueChange(newValue);
        startValueRef.current = newValue;
      },
      onPanResponderMove: (_evt, gestureState) => {
        const { minimumValue: min, maximumValue: max } = propsRef.current;
        const range = max - min;
        const usableWidth = trackWidthRef.current - THUMB_WIDTH;
        if (usableWidth <= 0) return;
        
        const startPercentage = (startValueRef.current - min) / range;
        const startPosition = startPercentage * usableWidth;
        const newPosition = startPosition + gestureState.dx;
        const newValue = getValueFromPosition(newPosition);
        propsRef.current.onValueChange(newValue);
      },
    })
  , []);

  const handleLayout = (event: LayoutChangeEvent) => {
    const width = event.nativeEvent.layout.width;
    trackWidthRef.current = width;
    setTrackWidth(width);
  };

  // Calculate thumb position from value
  const range = maximumValue - minimumValue;
  const percentage = trackWidth > 0 ? (value - minimumValue) / range : 0;
  const thumbPosition = percentage * (trackWidth - THUMB_WIDTH);
  const filledWidth = thumbPosition + THUMB_WIDTH / 2;

  return (
    <View style={styles.container}>
      <View
        style={styles.track}
        onLayout={handleLayout}
        {...panResponder.panHandlers}
      >
        {/* Filled track (left side) */}
        <View
          style={[
            styles.filledTrack,
            { width: Math.max(0, filledWidth) },
          ]}
        />
        
        {/* Thumb */}
        <View
          style={[
            styles.thumb,
            { left: Math.max(0, thumbPosition) },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 48,
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  track: {
    height: TRACK_HEIGHT,
    backgroundColor: '#A89B8C',
    borderRadius: TRACK_HEIGHT / 2,
    position: 'relative',
    overflow: 'visible',
  },
  filledTrack: {
    position: 'absolute',
    left: 0,
    top: 0,
    height: TRACK_HEIGHT,
    backgroundColor: '#6B5344',
    borderRadius: TRACK_HEIGHT / 2,
  },
  thumb: {
    position: 'absolute',
    top: (TRACK_HEIGHT - THUMB_HEIGHT) / 2,
    width: THUMB_WIDTH,
    height: THUMB_HEIGHT,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#A89B8B',
  },
});
