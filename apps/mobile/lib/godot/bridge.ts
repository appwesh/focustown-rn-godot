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
let entranceCinematicFinishedHandler: (() => void) | null = null;

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
 * Set the entrance cinematic finished handler (called when entrance cinematic ends)
 */
export function setEntranceCinematicFinishedHandler(
  handler: (() => void) | null
): void {
  entranceCinematicFinishedHandler = handler;
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

/**
 * Called from worklet - bridges entrance cinematic finished to JS thread
 */
function handleEntranceCinematicFinished(): void {
  console.log('[Bridge] Entrance cinematic finished');
  if (entranceCinematicFinishedHandler) {
    entranceCinematicFinishedHandler();
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
const handleEntranceCinematicFinishedWorklet = Worklets.createRunOnJS(
  handleEntranceCinematicFinished
);

/**
 * Check if Godot instance is ready
 */
export function isGodotReady(): boolean {
  return RTNGodot.getInstance() != null;
}

/**
 * Restart Godot engine completely
 * Destroys the current instance and clears scene tracking
 * The GodotGame component will reinitialize on next render
 */
export function restartGodot(): void {
  console.log('[Bridge] Restarting Godot engine...');
  
  // Reset scene tracking
  currentSceneName = null;
  
  // Destroy the instance on Godot thread
  runOnGodotThread(() => {
    'worklet';
    const instance = RTNGodot.getInstance();
    if (instance) {
      RTNGodot.destroyInstance();
      console.log('[Bridge] Godot instance destroyed');
    }
  });
}

/**
 * Force scene change by restarting if needed
 * This is more aggressive than changeScene() - use when regular scene change fails
 */
export function forceSceneChange(sceneName: 'library' | 'home_showcase' | 'character_showcase'): void {
  const scenePath = SCENE_PATHS[sceneName];
  if (!scenePath) {
    console.error('[Bridge] Unknown scene:', sceneName);
    return;
  }

  console.log('[Bridge] Force changing to scene:', sceneName);
  
  // Reset scene tracking
  currentSceneName = null;
  
  // Check if Godot is ready
  if (!RTNGodot.getInstance()) {
    console.log('[Bridge] No Godot instance, will use scene on init');
    // Store the desired scene for when Godot initializes
    pendingScene = sceneName;
    return;
  }

  // Try the regular pause/change/resume approach
  changeScene(sceneName);
}

// Store pending scene for when Godot initializes
let pendingScene: 'library' | 'home_showcase' | 'character_showcase' | null = null;

/**
 * Get and clear the pending scene (call after Godot init)
 */
export function getPendingScene(): 'library' | 'home_showcase' | 'character_showcase' | null {
  const scene = pendingScene;
  pendingScene = null;
  return scene;
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

/**
 * Register entrance cinematic finished callback with Godot
 * Fires when entrance cinematic completes (to show "pick your spot" text)
 */
export function registerEntranceCinematicFinishedCallback(): void {
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
      (rnBridge as any).set_entrance_cinematic_finished_callback(function () {
        'worklet';
        handleEntranceCinematicFinishedWorklet();
      });
      console.log('[Bridge] Entrance cinematic finished callback registered');
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
 * Toggle camera between third person and overview during focus session
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
 * Switch to setup camera view (front-facing, for modals)
 */
export function switchToSetupCamera(): void {
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
      (rnBridge as any).switch_to_setup_camera();
      console.log('[Bridge] Switched to setup camera');
    }
  });
}

/**
 * Switch to third person camera view
 */
export function switchToThirdPersonCamera(): void {
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
      (rnBridge as any).switch_to_third_person_camera();
      console.log('[Bridge] Switched to third person camera');
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
 * Play celebration animation on the player character (fist pump)
 * Called when a focus session completes successfully
 */
export function playCelebrationAnimation(): void {
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
      (rnBridge as any).play_celebration_animation();
      console.log('[Bridge] Playing celebration animation');
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

// ============================================================================
// Scene Management
// ============================================================================

// Scene paths mapping (must match project structure)
const SCENE_PATHS: Record<string, string> = {
  library: 'res://scenes/main/library_main.tscn',
  home_showcase: 'res://scenes/main/home_character_showcase.tscn',
  character_showcase: 'res://scenes/main/character_customization.tscn',
};

// Track current scene to avoid unnecessary changes
let currentSceneName: string | null = null;

/**
 * Change the current Godot scene safely
 * Pauses the engine, changes scene, then resumes to avoid crashes during layout
 * @param sceneName - 'library', 'home_showcase', or 'character_showcase'
 */
export function changeScene(sceneName: 'library' | 'home_showcase' | 'character_showcase'): void {
  const scenePath = SCENE_PATHS[sceneName];
  if (!scenePath) {
    console.error('[Bridge] Unknown scene:', sceneName);
    return;
  }

  // Skip if already on this scene
  if (currentSceneName === sceneName) {
    console.log('[Bridge] Already on scene:', sceneName);
    return;
  }

  console.log('[Bridge] Changing scene to:', sceneName);

  // Step 1: Pause the engine to get a stable state
  RTNGodot.pause();

  // Step 2: Wait for pause to take effect, then change scene
  setTimeout(() => {
    runOnGodotThread(() => {
      'worklet';
      const instance = RTNGodot.getInstance();
      if (!instance) {
        console.error('[Bridge] No Godot instance for scene change');
        return;
      }

      const Godot = RTNGodot.API();
      const engine = Godot.Engine;
      const sceneTree = engine.get_main_loop();

      if (!sceneTree) {
        console.error('[Bridge] No scene tree available');
        return;
      }

      // Call change_scene_to_file directly on SceneTree
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const error = (sceneTree as any).change_scene_to_file(scenePath);
      if (error !== 0) {
        console.error('[Bridge] Failed to change scene, error:', error);
      } else {
        console.log('[Bridge] Scene change initiated:', sceneName);
      }
    });

    // Step 3: Wait for scene change to process, then resume
    setTimeout(() => {
      RTNGodot.resume();
      currentSceneName = sceneName;
      console.log('[Bridge] Scene change complete, resumed:', sceneName);
    }, 150);
  }, 50);
}

/**
 * Reset scene tracking (call when Godot is restarted)
 */
export function resetSceneTracking(): void {
  currentSceneName = null;
}

// ============================================================================
// Character Customization (for homescreen showcase)
// ============================================================================

/** Character appearance data matching Godot's CharacterPresets format */
export interface CharacterSkin {
  SkinTone?: number;
  Face?: number;
  EyeColor?: number;
  Hair?: number;
  HairColor?: number;
  Top?: number;        // 0=None, 1-8=standard, 9=LofiTop
  TopVariant?: number;
  Bottom?: number;     // 0=None, 1-6=standard, 7=LofiPants
  BottomVariant?: number;
  Shoes?: number;
  ShoesVariant?: number;
  Hat?: number;        // 0=None, 1-12=standard, 13=Headphone
  HatVariant?: number;
  Glasses?: number;
  GlassesVariant?: number;
  Neck?: number;       // 0=None, 1=SpikedCollar, 2=LofiScarf
  NeckVariant?: number;
}

/**
 * Camera zoom target for character customization
 */
export type CameraZoomTarget = 'default' | 'head' | 'feet';

/**
 * Set camera zoom target for character customization preview
 * Used to focus on specific body parts when previewing items
 * @param target - 'default', 'head', or 'feet'
 */
export function setShowcaseCameraZoom(target: CameraZoomTarget): void {
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
      (rnBridge as any).set_showcase_camera_zoom(target);
      console.log('[Bridge] Set showcase camera zoom:', target);
    }
  });
}

/**
 * Set the user's character appearance in Godot
 * Used by the homescreen character showcase
 * @param skinData - Character appearance data
 */
export function setUserCharacter(skinData: CharacterSkin): void {
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
      // Pass individual values - Godot will reconstruct the dictionary
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (rnBridge as any).set_user_character_values(
        skinData.SkinTone ?? -1,
        skinData.Face ?? -1,
        skinData.EyeColor ?? -1,
        skinData.Hair ?? -1,
        skinData.HairColor ?? -1,
        skinData.Top ?? -1,
        skinData.TopVariant ?? -1,
        skinData.Bottom ?? -1,
        skinData.BottomVariant ?? -1,
        skinData.Shoes ?? -1,
        skinData.ShoesVariant ?? -1,
        skinData.Hat ?? -1,
        skinData.HatVariant ?? -1,
        skinData.Glasses ?? -1,
        skinData.GlassesVariant ?? -1,
        skinData.Neck ?? -1,
        skinData.NeckVariant ?? -1
      );
      console.log('[Bridge] Set user character');
    }
  });
}

/**
 * Refresh the NPC characters in the homescreen showcase
 */
export function refreshShowcaseNpcs(): void {
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
      (rnBridge as any).refresh_showcase_npcs();
      console.log('[Bridge] Refreshed showcase NPCs');
    }
  });
}

/**
 * Set the selected café index in the homescreen showcase
 * Triggers smooth animation to switch NPC character groups
 * @param cafeIndex - 0=boston-library, 1=korea-cafe, 2=europe-cafe, 3=ghibli-cafe, 4=japan-cafe
 */
export function setSelectedCafe(cafeIndex: number): void {
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
      (rnBridge as any).set_selected_cafe(cafeIndex);
      console.log('[Bridge] Set selected café:', cafeIndex);
    }
  });
}
