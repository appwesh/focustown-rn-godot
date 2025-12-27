import { useState, useRef, useCallback } from 'react';
import { StyleSheet, View, Pressable, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GodotGame } from '@/components/godot-view';
import { Joystick } from '@/components/joystick';
import { DebugModal } from '@/components/debug-modal';
import { useJoystick, useInteract, useGodotSession } from '@/lib/godot';
import { PCK_URL } from '@/constants/game';

const TAP_TIMEOUT = 500; // ms between taps
const TAPS_REQUIRED = 3;

export default function GameScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [debugVisible, setDebugVisible] = useState(false);
  const tapCountRef = useRef(0);
  const lastTapRef = useRef(0);

  const { onMove } = useJoystick();
  const { onInteract } = useInteract();

  // Register session callback with Godot (will log for now, write to DB later)
  useGodotSession();

  // Triple-tap handler for debug menu (dev only, works on entire screen)
  const handleScreenTap = useCallback(() => {
    if (!__DEV__) return;

    const now = Date.now();
    if (now - lastTapRef.current < TAP_TIMEOUT) {
      tapCountRef.current += 1;
      if (tapCountRef.current >= TAPS_REQUIRED) {
        setDebugVisible(true);
        tapCountRef.current = 0;
      }
    } else {
      tapCountRef.current = 1;
    }
    lastTapRef.current = now;
  }, []);

  return (
    <View style={styles.container}>
      <GodotGame style={styles.game} pckUrl={PCK_URL} />

      {/* Full-screen tap overlay for debug triple-tap (dev only) */}
      {__DEV__ && (
        <Pressable
          style={styles.debugTapOverlay}
          onPress={handleScreenTap}
        />
      )}

      {/* Floating Buttons */}
      <View style={[styles.floatingButtonsContainer, { top: insets.top + 12 }]}>
        {/* Profile Button - Left */}
        <Pressable
          style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
          onPress={() => router.push('/profile')}
        >
          <Text style={styles.fabIcon}>👤</Text>
        </Pressable>

        {/* Settings Button - Right */}
        <Pressable
          style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
          onPress={() => router.push('/settings')}
        >
          <Text style={styles.fabIcon}>⚙️</Text>
        </Pressable>
      </View>

      {/* Game Controls */}
      <View style={[styles.controlsContainer, { bottom: insets.bottom + 24 }]}>
        {/* Joystick - Left side */}
        <View style={styles.joystickContainer}>
          <Joystick onMove={onMove} size={140} />
        </View>

        {/* Interact Button - Right side */}
        <Pressable
          style={({ pressed }) => [
            styles.interactButton,
            pressed && styles.interactButtonPressed,
          ]}
          onPress={onInteract}
        >
          <Text style={styles.interactButtonText}>A</Text>
        </Pressable>
      </View>

      {/* Debug Modal (dev only, triple-tap settings to open) */}
      {__DEV__ && (
        <DebugModal
          visible={debugVisible}
          onClose={() => setDebugVisible(false)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  game: {
    flex: 1,
  },
  debugTapOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  floatingButtonsContainer: {
    position: 'absolute',
    left: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 2,
  },
  fab: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FFF8E7',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#5D4037',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 3,
    borderColor: '#DDD5C7',
  },
  fabPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.95 }],
  },
  fabIcon: {
    fontSize: 24,
  },
  controlsContainer: {
    position: 'absolute',
    left: 24,
    right: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    zIndex: 2,
  },
  joystickContainer: {
    // Additional styling if needed
  },
  interactButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFF8E7',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#5D4037',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
    borderWidth: 4,
    borderColor: '#DDD5C7',
  },
  interactButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.92 }],
    backgroundColor: '#EEE8D7',
  },
  interactButtonText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#5D4037',
  },
});
