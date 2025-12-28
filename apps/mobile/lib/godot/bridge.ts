/**
 * Bridge module for Godot <-> React Native communication
 *
 * @see https://github.com/borndotcom/react-native-godot
 *
 * Session callbacks use worklets-core runOnJS to cross from Godot thread
 * back to JS, where Firebase writes can be executed.
 */

import { RTNGodot, runOnGodotThread } from '@borndotcom/react-native-godot';
import { Worklets } from 'react-native-worklets-core';

// Module-level callback stored for worklet access
let sessionHandler: ((duration: number, coins: number) => void) | null = null;

/**
 * Set the session handler (called from JS thread when session completes)
 */
export function setSessionHandler(
  handler: ((duration: number, coins: number) => void) | null
): void {
  sessionHandler = handler;
}

/**
 * Called from worklet - bridges to JS thread
 */
function handleSessionComplete(duration: number, coins: number): void {
  console.log('[Bridge] Session complete:', duration, 's,', coins, 'coins');
  if (sessionHandler) {
    sessionHandler(duration, coins);
  }
}

// Create a worklet-compatible function that can be called from Godot thread
const handleSessionCompleteWorklet = Worklets.createRunOnJS(handleSessionComplete);

/**
 * Check if Godot instance is ready
 */
export function isGodotReady(): boolean {
  return RTNGodot.getInstance() != null;
}

/**
 * Register session callback with Godot
 * When session completes, fires callback that writes to Firebase
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
        // Use worklets-core to cross back to JS thread for Firebase write
        handleSessionCompleteWorklet(duration, coins);
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
