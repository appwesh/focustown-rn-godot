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
 * Currently the callback just logs - will write to DB when added
 * React will then subscribe to DB for real-time updates
 */
export function useGodotSession() {
  const callbackRegistered = useRef(false);

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
