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
// Types
// ============================================================================

/** Location info from Godot when player sits at a study spot */
export interface SpotLocation {
  buildingId: string;
  buildingName: string;
  spotId: string;
}

// ============================================================================
// Module-level callbacks stored for worklet access
// ============================================================================

let sessionHandler: ((duration: number, coins: number) => void) | null = null;
let playerSeatedHandler: ((location: SpotLocation) => void) | null = null;
let playerPositionHandler: ((x: number, y: number, z: number) => void) | null = null;
let sessionTapOutsideHandler: (() => void) | null = null;
let breakTickHandler: ((elapsed: number) => void) | null = null;
let breakEndedHandler: ((duration: number) => void) | null = null;

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
export function setPlayerSeatedHandler(
  handler: ((location: SpotLocation) => void) | null
): void {
  playerSeatedHandler = handler;
}

/**
 * Set the player position handler (called periodically with player position)
 */
export function setPlayerPositionHandler(
  handler: ((x: number, y: number, z: number) => void) | null
): void {
  playerPositionHandler = handler;
}

/**
 * Set the session tap outside handler (called when user taps outside during session)
 * RN should show confirm end session modal when this fires
 */
export function setSessionTapOutsideHandler(
  handler: (() => void) | null
): void {
  sessionTapOutsideHandler = handler;
}

/**
 * Set the break tick handler (called each second during break)
 */
export function setBreakTickHandler(
  handler: ((elapsed: number) => void) | null
): void {
  breakTickHandler = handler;
}

/**
 * Set the break ended handler (called when break ends)
 */
export function setBreakEndedHandler(
  handler: ((duration: number) => void) | null
): void {
  breakEndedHandler = handler;
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
 * Location comes from Godot's study spot node
 */
function handlePlayerSeated(
  buildingId: string,
  buildingName: string,
  spotId: string
): void {
  console.log('[Bridge] Player seated at:', buildingId, spotId);
  if (playerSeatedHandler) {
    playerSeatedHandler({ buildingId, buildingName, spotId });
  }
}

/**
 * Called from worklet - bridges player position to JS thread
 */
function handlePlayerPosition(x: number, y: number, z: number): void {
  if (playerPositionHandler) {
    playerPositionHandler(x, y, z);
  }
}

/**
 * Called from worklet - bridges session tap outside to JS thread
 * This fires when user taps outside during a focus session
 */
function handleSessionTapOutside(): void {
  console.log('[Bridge] Session tap outside detected');
  if (sessionTapOutsideHandler) {
    sessionTapOutsideHandler();
  }
}

/**
 * Called from worklet - bridges break tick to JS thread
 */
function handleBreakTick(elapsed: number): void {
  if (breakTickHandler) {
    breakTickHandler(elapsed);
  }
}

/**
 * Called from worklet - bridges break ended to JS thread
 */
function handleBreakEnded(duration: number): void {
  console.log('[Bridge] Break ended:', duration, 's');
  if (breakEndedHandler) {
    breakEndedHandler(duration);
  }
}

// Create worklet-compatible functions that can be called from Godot thread
const handleSessionCompleteWorklet = Worklets.createRunOnJS(handleSessionComplete);
const handlePlayerSeatedWorklet = Worklets.createRunOnJS(handlePlayerSeated) as (
  buildingId: string,
  buildingName: string,
  spotId: string
) => void;
const handlePlayerPositionWorklet = Worklets.createRunOnJS(handlePlayerPosition) as (
  x: number,
  y: number,
  z: number
) => void;
const handleSessionTapOutsideWorklet = Worklets.createRunOnJS(handleSessionTapOutside);
const handleBreakTickWorklet = Worklets.createRunOnJS(handleBreakTick) as (
  elapsed: number
) => void;
const handleBreakEndedWorklet = Worklets.createRunOnJS(handleBreakEnded) as (
  duration: number
) => void;

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
 * Receives location info (buildingId, buildingName, spotId) from Godot
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
      (rnBridge as any).set_player_seated_callback(function (
        buildingId: string,
        buildingName: string,
        spotId: string
      ) {
        'worklet';
        handlePlayerSeatedWorklet(buildingId, buildingName, spotId);
      });
      console.log('[Bridge] Player seated callback registered');
    }
  });
}

/**
 * Register player position callback with Godot for multiplayer sync
 * Fires periodically with local player's position
 */
export function registerPlayerPositionCallback(): void {
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
      (rnBridge as any).set_player_position_callback(function (
        x: number,
        y: number,
        z: number
      ) {
        'worklet';
        handlePlayerPositionWorklet(x, y, z);
      });
      console.log('[Bridge] Player position callback registered');
    }
  });
}

/**
 * Start position sync (tells Godot to periodically send player position)
 */
export function startPositionSync(): void {
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
      (rnBridge as any).start_position_sync();
      console.log('[Bridge] Started position sync');
    }
  });
}

/**
 * Stop position sync
 */
export function stopPositionSync(): void {
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
      (rnBridge as any).stop_position_sync();
      console.log('[Bridge] Stopped position sync');
    }
  });
}

/**
 * Register session tap outside callback with Godot
 * Fires when user taps outside during a focus session (to show confirm end popup)
 */
export function registerSessionTapOutsideCallback(): void {
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
      (rnBridge as any).set_session_tap_outside_callback(function () {
        'worklet';
        handleSessionTapOutsideWorklet();
      });
      console.log('[Bridge] Session tap outside callback registered');
    }
  });
}

// ============================================================================
// Break Control
// ============================================================================

/**
 * Register break tick callback with Godot
 * Fires each second during a break with elapsed time
 */
export function registerBreakTickCallback(): void {
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
      (rnBridge as any).set_break_tick_callback(function (elapsed: number) {
        'worklet';
        handleBreakTickWorklet(elapsed);
      });
      console.log('[Bridge] Break tick callback registered');
    }
  });
}

/**
 * Register break ended callback with Godot
 * Fires when a break ends
 */
export function registerBreakEndedCallback(): void {
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
      (rnBridge as any).set_break_ended_callback(function (duration: number) {
        'worklet';
        handleBreakEndedWorklet(duration);
      });
      console.log('[Bridge] Break ended callback registered');
    }
  });
}

/**
 * Start a break in Godot (camera switches to overview)
 */
export function startGodotBreak(): void {
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
      (rnBridge as any).start_break();
      console.log('[Bridge] Started break in Godot');
    }
  });
}

/**
 * End the current break in Godot
 */
export function endGodotBreak(): void {
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
      (rnBridge as any).end_break();
      console.log('[Bridge] Ended break in Godot');
    }
  });
}

// ============================================================================
// Camera Control (for focus sessions)
// ============================================================================

/**
 * Toggle camera between zoomed (seated) and overview during focus session
 */
export function toggleSessionCamera(): void {
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
      (rnBridge as any).toggle_session_camera();
      console.log('[Bridge] Toggled session camera');
    }
  });
}

/**
 * Switch to zoomed seated camera view
 */
export function switchToSeatedCamera(): void {
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
      (rnBridge as any).switch_to_seated_camera();
      console.log('[Bridge] Switched to seated camera');
    }
  });
}

/**
 * Switch to overview camera view
 */
export function switchToOverviewCamera(): void {
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
      (rnBridge as any).switch_to_overview_camera();
      console.log('[Bridge] Switched to overview camera');
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

// ============================================================================
// Multiplayer - Remote Player Functions
// ============================================================================

/**
 * Spawn a remote player in Godot
 * @param odId - Unique user ID
 * @param displayName - Display name to show above player
 * @param state - 'entrance', 'walking', or 'seated'
 * @param spotId - Spot ID if seated, null otherwise
 */
export function spawnRemotePlayer(
  odId: string,
  displayName: string,
  state: 'entrance' | 'walking' | 'seated',
  spotId: string | null
): void {
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
      (rnBridge as any).spawn_remote_player(odId, displayName, state, spotId || '');
      console.log('[Bridge] Spawned remote player:', odId, displayName, state);
    }
  });
}

/**
 * Update a remote player's state (entrance or seated)
 * @param odId - Unique user ID
 * @param state - 'entrance', 'walking', or 'seated'
 * @param spotId - Spot ID if seated, null otherwise
 */
export function updateRemotePlayerState(
  odId: string,
  state: 'entrance' | 'walking' | 'seated',
  spotId: string | null
): void {
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
      (rnBridge as any).update_remote_player_state(odId, state, spotId || '');
      console.log('[Bridge] Updated remote player state:', odId, state);
    }
  });
}

/**
 * Update a remote player's position
 * @param odId - Unique user ID
 * @param x - X position
 * @param y - Y position  
 * @param z - Z position
 */
export function updateRemotePlayerPosition(
  odId: string,
  x: number,
  y: number,
  z: number
): void {
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
      (rnBridge as any).update_remote_player_position(odId, x, y, z);
    }
  });
}

/**
 * Remove a remote player from Godot
 * @param odId - Unique user ID
 */
export function removeRemotePlayer(odId: string): void {
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
      (rnBridge as any).remove_remote_player(odId);
      console.log('[Bridge] Removed remote player:', odId);
    }
  });
}
