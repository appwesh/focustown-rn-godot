/**
 * Session Context - manages focus session state
 * 
 * State machine: idle -> setup -> active -> complete -> (break -> idle | idle)
 */

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
} from 'react';
import type {
  SessionPhase,
  SessionConfig,
  ActiveSession,
  CompletedSession,
  BreakSession,
} from './types';
import { DEFAULT_CONFIG } from './types';

// ============================================================================
// Context Types
// ============================================================================

interface SessionContextValue {
  // Current phase
  phase: SessionPhase;
  
  // Session data (depends on phase)
  config: SessionConfig;
  activeSession: ActiveSession | null;
  completedSession: CompletedSession | null;
  breakSession: BreakSession | null;
  breakDurationMinutes: number;
  showingAbandonConfirm: boolean;
  
  // Actions
  onPlayerSeated: () => void;
  updateConfig: (updates: Partial<SessionConfig>) => void;
  startSession: () => void;
  cancelSetup: () => void;
  endSession: (durationSeconds: number, coinsEarned: number) => void;
  requestAbandonSession: () => void;  // Show confirmation
  confirmAbandonSession: () => void;  // Actually abandon
  cancelAbandonSession: () => void;   // Cancel confirmation
  goHome: () => void;
  goHomeFromAbandoned: () => void;    // Go home from abandoned modal
  continueFromAbandoned: () => void;  // Start new session from abandoned
  showBreakSetup: () => void;
  setBreakDuration: (minutes: number) => void;
  startBreak: () => void;
  endBreak: () => void;
  startAnotherSession: () => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

// ============================================================================
// Provider
// ============================================================================

interface SessionProviderProps {
  children: React.ReactNode;
  onStartSession?: () => void;      // Called when session starts in Godot
  onCancelSetup?: () => void;       // Called when setup is cancelled
  onEndSession?: () => void;        // Called when session ends in Godot
}

export function SessionProvider({
  children,
  onStartSession,
  onCancelSetup,
  onEndSession,
}: SessionProviderProps) {
  // State
  const [phase, setPhase] = useState<SessionPhase>('idle');
  const [config, setConfig] = useState<SessionConfig>(DEFAULT_CONFIG);
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [completedSession, setCompletedSession] = useState<CompletedSession | null>(null);
  const [breakSession, setBreakSession] = useState<BreakSession | null>(null);
  const [breakDurationMinutes, setBreakDurationMinutes] = useState(5);
  const [showingAbandonConfirm, setShowingAbandonConfirm] = useState(false);
  const [isAbandoning, setIsAbandoning] = useState(false);
  
  // Timer ref
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);
  
  // --------------------------------------------------------------------------
  // Timer tick handler
  // --------------------------------------------------------------------------
  const tickActiveSession = useCallback(() => {
    setActiveSession(prev => {
      if (!prev) return null;
      
      const newRemaining = prev.remainingSeconds - 1;
      
      if (newRemaining <= 0) {
        // Timer complete - will be handled by Godot callback
        // For now just stop at 0
        return { ...prev, remainingSeconds: 0 };
      }
      
      return { ...prev, remainingSeconds: newRemaining };
    });
  }, []);
  
  const tickBreakSession = useCallback(() => {
    setBreakSession(prev => {
      if (!prev) return null;
      
      const newRemaining = prev.remainingSeconds - 1;
      
      if (newRemaining <= 0) {
        // Break complete - go to session setup
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        setPhase('setup');
        return null;
      }
      
      return { ...prev, remainingSeconds: newRemaining };
    });
  }, []);
  
  // --------------------------------------------------------------------------
  // Actions
  // --------------------------------------------------------------------------
  
  // Called when player sits at a study spot
  const onPlayerSeated = useCallback(() => {
    console.log('[Session] Player seated - showing setup');
    setPhase('setup');
  }, []);
  
  // Update session config
  const updateConfig = useCallback((updates: Partial<SessionConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  }, []);
  
  // Start the focus session
  const startSession = useCallback(() => {
    console.log('[Session] Starting session:', config);
    
    const session: ActiveSession = {
      config,
      startedAt: Date.now(),
      remainingSeconds: config.durationMinutes * 60,
    };
    
    setActiveSession(session);
    setPhase('active');
    
    // Start countdown timer
    timerRef.current = setInterval(tickActiveSession, 1000);
    
    // Notify Godot
    onStartSession?.();
  }, [config, tickActiveSession, onStartSession]);
  
  // Cancel setup - player stands up
  const cancelSetup = useCallback(() => {
    console.log('[Session] Setup cancelled');
    setPhase('idle');
    onCancelSetup?.();
  }, [onCancelSetup]);
  
  // Session completed successfully (from Godot callback or timer complete)
  const endSession = useCallback((durationSeconds: number, coinsEarned: number) => {
    // Ignore if we're abandoning (user ended early)
    if (isAbandoning) {
      console.log('[Session] Ignoring Godot callback - session was abandoned');
      setIsAbandoning(false);
      return;
    }
    
    console.log('[Session] Session completed:', durationSeconds, 's,', coinsEarned, 'coins');
    
    // Stop timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    // Store completed session data
    setCompletedSession({
      durationSeconds,
      coinsEarned,
      totalTimeToday: durationSeconds, // TODO: accumulate from Firebase
    });
    
    setActiveSession(null);
    setPhase('complete');
    
    // Notify Godot
    onEndSession?.();
  }, [onEndSession, isAbandoning]);
  
  // Request to abandon session (shows confirmation)
  const requestAbandonSession = useCallback(() => {
    console.log('[Session] Abandon requested - showing confirmation');
    setShowingAbandonConfirm(true);
  }, []);
  
  // Confirm abandoning session (no rewards)
  const confirmAbandonSession = useCallback(() => {
    console.log('[Session] Session abandoned - no rewards');
    
    // Mark as abandoning so we ignore the Godot callback
    setIsAbandoning(true);
    
    // Stop timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    setShowingAbandonConfirm(false);
    setActiveSession(null);
    setPhase('abandoned');
    
    // Notify Godot to end session
    onEndSession?.();
  }, [onEndSession]);
  
  // Cancel abandon confirmation
  const cancelAbandonSession = useCallback(() => {
    setShowingAbandonConfirm(false);
  }, []);
  
  // Go home from complete screen
  const goHome = useCallback(() => {
    console.log('[Session] Going home');
    setCompletedSession(null);
    setPhase('idle');
  }, []);
  
  // Go home from abandoned screen
  const goHomeFromAbandoned = useCallback(() => {
    console.log('[Session] Going home from abandoned');
    setPhase('idle');
  }, []);
  
  // Continue (start new session) from abandoned screen
  const continueFromAbandoned = useCallback(() => {
    console.log('[Session] Continue from abandoned - showing setup');
    setPhase('setup');
  }, []);
  
  // Show break setup (user picks duration before starting)
  const showBreakSetup = useCallback(() => {
    console.log('[Session] Showing break setup');
    setCompletedSession(null);
    setBreakSession(null); // Not started yet
    setPhase('break');
  }, []);
  
  // Set break duration (called from break modal picker)
  const setBreakDuration = useCallback((minutes: number) => {
    setBreakDurationMinutes(minutes);
  }, []);
  
  // Start break timer (called when user taps "Start Break")
  const startBreak = useCallback(() => {
    console.log('[Session] Starting break:', breakDurationMinutes, 'min');
    
    const breakDuration = breakDurationMinutes * 60;
    
    setBreakSession({
      durationSeconds: breakDuration,
      remainingSeconds: breakDuration,
    });
    
    // Start break countdown
    timerRef.current = setInterval(tickBreakSession, 1000);
  }, [breakDurationMinutes, tickBreakSession]);
  
  // End break early - go back to session setup
  const endBreak = useCallback(() => {
    console.log('[Session] Break ended - showing session setup');
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    setBreakSession(null);
    setPhase('setup');
  }, []);
  
  // Start another session from break screen
  const startAnotherSession = useCallback(() => {
    console.log('[Session] Starting another session');
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    setBreakSession(null);
    setPhase('setup');
  }, []);
  
  // --------------------------------------------------------------------------
  // Context value
  // --------------------------------------------------------------------------
  const value: SessionContextValue = {
    phase,
    config,
    activeSession,
    completedSession,
    breakSession,
    breakDurationMinutes,
    showingAbandonConfirm,
    onPlayerSeated,
    updateConfig,
    startSession,
    cancelSetup,
    endSession,
    requestAbandonSession,
    confirmAbandonSession,
    cancelAbandonSession,
    goHome,
    goHomeFromAbandoned,
    continueFromAbandoned,
    showBreakSetup,
    setBreakDuration,
    startBreak,
    endBreak,
    startAnotherSession,
  };
  
  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
}

// ============================================================================
// Hook
// ============================================================================

export function useSession(): SessionContextValue {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
}

// ============================================================================
// Helper: Format seconds to MM:SS
// ============================================================================

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Format seconds to human readable (e.g., "32M" or "1H 24M")
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}H ${mins}M`;
  }
  return `${mins}M`;
}

