/**
 * Bridge module for Godot <-> React Native communication
 *
 * @see https://github.com/borndotcom/react-native-godot
 *
 * NOTE: Cross-thread state updates from Godot callbacks to React are not
 * supported by react-native-godot. When DB is added, the callback will
 * write to DB and React will subscribe to changes.
 */

import { RTNGodot, runOnGodotThread } from '@borndotcom/react-native-godot';

/**
 * Check if Godot instance is ready
 */
export function isGodotReady(): boolean {
  return RTNGodot.getInstance() != null;
}

/**
 * Register session callback with Godot
 * Currently just logs - will write to DB when added
 */
export function registerSessionCallback(): void {
  runOnGodotThread(() => {
    'worklet';
    const instance = RTNGodot.getInstance();
    if (!instance) return;

    const Godot = RTNGodot.API();
    const engine = Godot.Engine;
    const sceneTree = engine.get_main_loop();
    const root = sceneTree.get_root();

    const rnBridge = root.get_node_or_null('/root/RNBridge');

    if (rnBridge) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (rnBridge as any).set_session_callback(function (
        duration: number,
        coins: number
      ) {
        'worklet';
        console.log('[Bridge] Session complete:', duration, 's,', coins, 'coins');
        // TODO: When DB is added, write session here:
        // writeSessionToDatabase(userId, duration, coins);
      });
      console.log('[Bridge] Session callback registered');
    }
  });
}

/**
 * Send joystick input to Godot
 */
export function setJoystickInput(x: number, y: number): void {
  runOnGodotThread(() => {
    'worklet';
    const instance = RTNGodot.getInstance();
    if (!instance) return;

    const Godot = RTNGodot.API();
    const engine = Godot.Engine;
    const sceneTree = engine.get_main_loop();
    const root = sceneTree.get_root();
    const rnBridge = root.get_node_or_null('/root/RNBridge');

    if (rnBridge) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (rnBridge as any).set_joystick_input(x, y);
    }
  });
}

/**
 * Trigger interact action in Godot
 */
export function triggerInteract(): void {
  runOnGodotThread(() => {
    'worklet';
    const instance = RTNGodot.getInstance();
    if (!instance) return;

    const Godot = RTNGodot.API();
    const engine = Godot.Engine;
    const sceneTree = engine.get_main_loop();
    const root = sceneTree.get_root();
    const rnBridge = root.get_node_or_null('/root/RNBridge');

    if (rnBridge) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (rnBridge as any).trigger_interact();
    }
  });
}

/**
 * Pause the Godot engine
 */
export function pauseGame(): void {
  RTNGodot.pause();
}

/**
 * Resume the Godot engine
 */
export function resumeGame(): void {
  RTNGodot.resume();
}

/**
 * Check if Godot is paused
 */
export function isGamePaused(): boolean {
  return RTNGodot.is_paused();
}
