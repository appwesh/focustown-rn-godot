/**
 * Godot Bridge - React Native <-> Godot communication layer
 *
 * @see https://github.com/borndotcom/react-native-godot
 *
 * Usage:
 *   import { useJoystick, useInteract, useGodotSession, usePlayerSeated } from '@/lib/godot';
 *
 *   const { onMove } = useJoystick();
 *   const { onInteract } = useInteract();
 *   useGodotSession((focusTime, coins) => {
 *     // Called when session completes - write to Firebase here
 *   });
 *   usePlayerSeated(() => {
 *     // Called when player sits at a study spot - show session setup modal
 *   });
 */

// Types
export type { JoystickInput, SessionResult, SpotLocation } from './types';

// Bridge functions (for direct use)
export {
  setJoystickInput,
  triggerInteract,
  pauseGame,
  resumeGame,
  isGamePaused,
  isGodotReady,
  registerSessionCallback,
  registerPlayerSeatedCallback,
  startGodotSession,
  endGodotSession,
  cancelGodotSessionSetup,
  // Multiplayer
  spawnRemotePlayer,
  updateRemotePlayerState,
  updateRemotePlayerPosition,
  removeRemotePlayer,
  // Position sync
  setPlayerPositionHandler,
  registerPlayerPositionCallback,
  startPositionSync,
  stopPositionSync,
} from './bridge';

// React hooks (recommended)
export {
  useJoystick,
  useInteract,
  useGameControls,
  useGodotSession,
  usePlayerSeated,
  useSessionControls,
  usePositionSync,
} from './hooks';
