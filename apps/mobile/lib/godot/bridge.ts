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

// ============================================================================
// Module-level callbacks stored for worklet access
// ============================================================================

let sessionHandler: ((duration: number, coins: number) => void) | null = null;
let playerSeatedHandler: (() => void) | null = null;

/**
 * Set the session handler (called from JS thread when session completes)
 */
export function setSessionHandler(
  handler: ((duration: number, coins: number) => void) | null
): void {
  sessionHandler = handler;
}

/**
 * Set the player seated handler (called when player sits at a study spot)
 */
export function setPlayerSeatedHandler(handler: (() => void) | null): void {
  playerSeatedHandler = handler;
}

/**
 * Called from worklet - bridges session complete to JS thread
 */
function handleSessionComplete(duration: number, coins: number): void {
  console.log('[Bridge] Session complete:', duration, 's,', coins, 'coins');
  if (sessionHandler) {
    sessionHandler(duration, coins);
  }
}

/**
 * Called from worklet - bridges player seated to JS thread
 */
function handlePlayerSeated(): void {
  console.log('[Bridge] Player seated at study spot');
  if (playerSeatedHandler) {
    playerSeatedHandler();
  }
}

// Create worklet-compatible functions that can be called from Godot thread
const handleSessionCompleteWorklet = Worklets.createRunOnJS(handleSessionComplete);
const handlePlayerSeatedWorklet = Worklets.createRunOnJS(handlePlayerSeated);

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
 * Register player seated callback with Godot
 * Fires when player sits at a study spot (to show session setup modal)
 */
export function registerPlayerSeatedCallback(): void {
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
      (rnBridge as any).set_player_seated_callback(function () {
        'worklet';
        handlePlayerSeatedWorklet();
      });
      console.log('[Bridge] Player seated callback registered');
    }
  });
}

/**
 * Tell Godot to start the session (called after user confirms setup)
 */
export function startGodotSession(): void {
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
      (rnBridge as any).start_session_from_rn();
      console.log('[Bridge] Started session in Godot');
    }
  });
}

/**
 * Tell Godot to end the session (called when RN timer completes or user stops)
 */
export function endGodotSession(): void {
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
      (rnBridge as any).end_session();
      console.log('[Bridge] Ended session in Godot');
    }
  });
}

/**
 * Tell Godot to cancel session setup (player stands up, no session started)
 */
export function cancelGodotSessionSetup(): void {
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
      (rnBridge as any).cancel_session_setup();
      console.log('[Bridge] Cancelled session setup in Godot');
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
