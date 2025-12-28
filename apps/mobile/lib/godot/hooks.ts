/**
 * React hooks for Godot bridge integration
 */

import { useCallback, useEffect, useRef } from 'react';
import * as Bridge from './bridge';

/**
 * Hook for joystick controls
 */
export function useJoystick() {
  const handleMove = useCallback((x: number, y: number) => {
    Bridge.setJoystickInput(x, y);
  }, []);

  const handleRelease = useCallback(() => {
    Bridge.setJoystickInput(0, 0);
  }, []);

  return {
    onMove: handleMove,
    onRelease: handleRelease,
  };
}

/**
 * Hook for interact action
 */
export function useInteract() {
  const handleInteract = useCallback(() => {
    Bridge.triggerInteract();
  }, []);

  return {
    onInteract: handleInteract,
  };
}

/**
 * Hook for game pause/resume controls
 */
export function useGameControls() {
  const pause = useCallback(() => {
    Bridge.pauseGame();
  }, []);

  const resume = useCallback(() => {
    Bridge.resumeGame();
  }, []);

  return {
    pause,
    resume,
    isPaused: Bridge.isGamePaused,
  };
}

/**
 * Hook to register session callback with Godot
 * When a session completes in Godot, the onSessionComplete callback fires
 * to write the session to Firebase
 *
 * @param onSessionComplete - Callback to handle session completion (e.g., write to Firebase)
 */
export function useGodotSession(
  onSessionComplete?: (focusTime: number, coinsEarned: number) => void
) {
  const callbackRegistered = useRef(false);

  // Set up the session handler that will be called from the worklet
  useEffect(() => {
    if (onSessionComplete) {
      Bridge.setSessionHandler(onSessionComplete);
    }

    return () => {
      Bridge.setSessionHandler(null);
    };
  }, [onSessionComplete]);

  // Register the Godot callback once ready
  useEffect(() => {
    const checkAndRegister = () => {
      if (Bridge.isGodotReady() && !callbackRegistered.current) {
        console.log('[useGodotSession] Registering callback...');
        Bridge.registerSessionCallback();
        callbackRegistered.current = true;
      }
    };

    checkAndRegister();

    const interval = setInterval(() => {
      if (!callbackRegistered.current) {
        checkAndRegister();
      } else {
        clearInterval(interval);
      }
    }, 500);

    return () => clearInterval(interval);
  }, []);
}
