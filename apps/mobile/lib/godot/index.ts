/**
 * Godot Bridge - React Native <-> Godot communication layer
 *
 * @see https://github.com/borndotcom/react-native-godot
 *
 * Usage:
 *   import { useJoystick, useInteract, useGodotSession } from '@/lib/godot';
 *
 *   const { onMove } = useJoystick();
 *   const { onInteract } = useInteract();
 *   useGodotSession(); // Registers callback for session events
 */

// Types
export type { JoystickInput, SessionResult } from './types';

// Bridge functions (for direct use)
export {
  setJoystickInput,
  triggerInteract,
  pauseGame,
  resumeGame,
  isGamePaused,
  isGodotReady,
  registerSessionCallback,
} from './bridge';

// React hooks (recommended)
export {
  useJoystick,
  useInteract,
  useGameControls,
  useGodotSession,
} from './hooks';
