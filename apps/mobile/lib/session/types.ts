/**
 * Session types for focus timer
 */

// Session states
export type SessionPhase = 
  | 'idle'      // No session, player free to move
  | 'setup'     // Player seated, showing session config modal
  | 'active'    // Focus session in progress
  | 'complete'  // Session finished, showing results
  | 'abandoned' // Session ended early, no rewards
  | 'break';    // Break timer running

// Session configuration (user selections)
export interface SessionConfig {
  durationMinutes: number;
  deepFocusMode: boolean;
}

// Active session data
export interface ActiveSession {
  config: SessionConfig;
  startedAt: number;        // timestamp
  remainingSeconds: number; // countdown
}

// Completed session data
export interface CompletedSession {
  durationSeconds: number;
  coinsEarned: number;
  totalTimeToday: number;   // cumulative for display
}

// Break timer data
export interface BreakSession {
  durationSeconds: number;
  remainingSeconds: number;
}

// Available duration options (minutes)
export const DURATION_OPTIONS = [5, 10, 15, 25, 30, 45, 60] as const;

// Default session config
export const DEFAULT_CONFIG: SessionConfig = {
  durationMinutes: 25,
  deepFocusMode: true,
};

// Break duration calculation (1 min break per 5 min focus, min 1, max 15)
export function calculateBreakDuration(focusMinutes: number): number {
  const breakMinutes = Math.floor(focusMinutes / 5);
  return Math.max(1, Math.min(15, breakMinutes)) * 60; // return seconds
}

