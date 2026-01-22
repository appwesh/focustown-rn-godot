import { useEffect, useRef } from 'react';
import { StyleSheet, Animated, View } from 'react-native';

interface SceneTransitionProps {
  /** Whether the transition overlay is visible */
  visible: boolean;
  /** Background color of the overlay */
  backgroundColor?: string;
  /** Duration of fade animation in ms */
  fadeDuration?: number;
  /** Delay before starting fade out in ms */
  fadeOutDelay?: number;
}

/**
 * Animated overlay for smooth scene transitions
 * Shows immediately when visible=true, fades out when visible=false
 */
export function SceneTransition({
  visible,
  backgroundColor = '#FFF8E7',
  fadeDuration = 300,
  fadeOutDelay = 0,
}: SceneTransitionProps) {
  const opacity = useRef(new Animated.Value(visible ? 1 : 0)).current;
  const isFirstRender = useRef(true);

  useEffect(() => {
    // Skip animation on first render
    if (isFirstRender.current) {
      isFirstRender.current = false;
      opacity.setValue(visible ? 1 : 0);
      return;
    }

    if (visible) {
      // Fade in immediately
      Animated.timing(opacity, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }).start();
    } else {
      // Fade out with optional delay
      setTimeout(() => {
        Animated.timing(opacity, {
          toValue: 0,
          duration: fadeDuration,
          useNativeDriver: true,
        }).start();
      }, fadeOutDelay);
    }
  }, [visible, opacity, fadeDuration, fadeOutDelay]);

  // Don't render if fully transparent and not visible
  // (but we need to keep it mounted during animation)
  
  return (
    <Animated.View
      style={[
        styles.overlay,
        { backgroundColor, opacity },
      ]}
      pointerEvents={visible ? 'auto' : 'none'}
    >
      {visible && (
        <View style={styles.content}>
          {/* Optional: Add a subtle loading indicator or logo here */}
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  content: {
    alignItems: 'center',
  },
});
