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

/**
 * Hook to register player seated callback with Godot
 * Fires when player sits at a study spot to show session setup modal
 *
 * @param onPlayerSeated - Callback when player sits at a study spot, receives location info
 */
export function usePlayerSeated(
  onPlayerSeated?: (location: Bridge.SpotLocation) => void
) {
  const callbackRegistered = useRef(false);

  // Set up the handler
  useEffect(() => {
    if (onPlayerSeated) {
      Bridge.setPlayerSeatedHandler(onPlayerSeated);
    }

    return () => {
      Bridge.setPlayerSeatedHandler(null);
    };
  }, [onPlayerSeated]);

  // Register the Godot callback once ready
  useEffect(() => {
    const checkAndRegister = () => {
      if (Bridge.isGodotReady() && !callbackRegistered.current) {
        console.log('[usePlayerSeated] Registering callback...');
        Bridge.registerPlayerSeatedCallback();
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

/**
 * Hook for session controls (start, end, cancel)
 * Used by session context to control Godot session state
 */
export function useSessionControls() {
  const startSession = useCallback(() => {
    Bridge.startGodotSession();
  }, []);

  const endSession = useCallback(() => {
    Bridge.endGodotSession();
  }, []);

  const cancelSetup = useCallback(() => {
    Bridge.cancelGodotSessionSetup();
  }, []);

  return {
    startSession,
    endSession,
    cancelSetup,
  };
}

/**
 * Hook to enable position sync for multiplayer sessions
 * Waits for Godot to be ready, then registers position callback and starts sync
 *
 * @param onPositionUpdate - Callback fired with local player position (x, y, z)
 * @param enabled - Whether position sync should be active
 */
export function usePositionSync(
  onPositionUpdate: ((x: number, y: number, z: number) => void) | null,
  enabled: boolean = true
) {
  const syncStarted = useRef(false);

  // Set up the position handler
  useEffect(() => {
    if (onPositionUpdate && enabled) {
      Bridge.setPlayerPositionHandler(onPositionUpdate);
    }

    return () => {
      Bridge.setPlayerPositionHandler(null);
    };
  }, [onPositionUpdate, enabled]);

  // Register and start position sync once Godot is ready
  useEffect(() => {
    if (!enabled) {
      if (syncStarted.current) {
        console.log('[usePositionSync] Stopping position sync');
        Bridge.stopPositionSync();
        syncStarted.current = false;
      }
      return;
    }

    const checkAndStart = () => {
      if (Bridge.isGodotReady() && !syncStarted.current) {
        console.log('[usePositionSync] Starting position sync...');
        Bridge.registerPlayerPositionCallback();
        Bridge.startPositionSync();
        syncStarted.current = true;
      }
    };

    checkAndStart();

    const interval = setInterval(() => {
      if (!syncStarted.current) {
        checkAndStart();
      } else {
        clearInterval(interval);
      }
    }, 500);

    return () => {
      clearInterval(interval);
      if (syncStarted.current) {
        console.log('[usePositionSync] Cleanup - stopping position sync');
        Bridge.stopPositionSync();
        syncStarted.current = false;
      }
    };
  }, [enabled]);
}
