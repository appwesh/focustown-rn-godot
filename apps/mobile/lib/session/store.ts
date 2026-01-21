/**
 * Session Store - Zustand-based focus session state management
 * 
 * State machine: idle -> setup -> active -> complete -> (break -> idle | idle)
 * 
 * Features:
 * - Start-time based timer calculation (accurate, no drift)
 * - AppState handling with phone lock vs app switch detection
 * - Notifications for session completion and return reminders
 * - Firebase integration for presence and session history
 * - Heartbeat system for real-time presence updates
 * - Global access from anywhere (Godot bridge, Firebase, components)
 */

import { create } from 'zustand';
import { AppState, AppStateStatus } from 'react-native';
import * as Notifications from 'expo-notifications';
import type {
  SessionPhase,
  SessionConfig,
  ActiveSession,
  CompletedSession,
  BreakSession,
} from './types';
import { DEFAULT_CONFIG } from './types';
import { sessionService } from '../firebase/sessions';
import { groupsService } from '../firebase/groups';
import type { WorkType } from '../firebase/types';

// ============================================================================
// Constants
// ============================================================================

/** Threshold to distinguish phone lock (<200ms) from app switch (>200ms) */
const LOCK_DETECTION_THRESHOLD_MS = 200;

/** Grace period before failing session when user switches apps */
const GRACE_PERIOD_MS = 15000;

/** When to send reminder notification after backgrounding */
const REMINDER_NOTIFICATION_DELAY_S = 10;

/** Coins earned per minute of focus */
const COINS_PER_MINUTE = 10;

/** Heartbeat interval for presence updates */
const HEARTBEAT_INTERVAL_MS = 30000;

// ============================================================================
// Notification Helpers
// ============================================================================

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Request notification permissions
 */
async function requestNotificationPermissions(): Promise<boolean> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  
  return finalStatus === 'granted';
}

/**
 * Schedule success notification for when session completes
 */
async function scheduleSuccessNotification(durationSeconds: number): Promise<string | null> {
  try {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Focus Session Complete! 🎉',
        body: 'Great job staying focused!',
        sound: true,
      },
      trigger: { seconds: durationSeconds, type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL },
    });
    console.log('[SessionStore] Scheduled success notification:', id);
    return id;
  } catch (error) {
    console.error('[SessionStore] Failed to schedule success notification:', error);
    return null;
  }
}

/**
 * Schedule reminder notification when user leaves app
 */
async function scheduleReminderNotification(): Promise<string | null> {
  try {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Come back to focus!',
        body: 'Your session is still running...',
        sound: true,
      },
      trigger: { seconds: REMINDER_NOTIFICATION_DELAY_S, type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL },
    });
    console.log('[SessionStore] Scheduled reminder notification:', id);
    return id;
  } catch (error) {
    console.error('[SessionStore] Failed to schedule reminder notification:', error);
    return null;
  }
}

/**
 * Cancel all scheduled notifications
 */
async function cancelAllNotifications(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    console.log('[SessionStore] Cancelled all notifications');
  } catch (error) {
    console.error('[SessionStore] Failed to cancel notifications:', error);
  }
}

// ============================================================================
// Store Types
// ============================================================================

/** Location info from Godot */
export interface SessionLocation {
  buildingId: string;
  buildingName: string;
  spotId: string;
}

/** User info for Firebase writes */
export interface SessionUser {
  odId: string;
  displayName: string;
}

interface SessionState {
  // Current phase
  phase: SessionPhase;
  
  // Session data
  config: SessionConfig;
  activeSession: ActiveSession | null;
  completedSession: CompletedSession | null;
  breakSession: BreakSession | null;
  breakDurationMinutes: number;
  showingAbandonConfirm: boolean;
  
  // Track if user has done at least one session this sitting (for showing break option)
  hasCompletedAnySession: boolean;
  
  // Firebase integration
  firebaseSessionId: string | null;
  currentLocation: SessionLocation | null;
  currentUser: SessionUser | null;
  
  // Group session
  groupSessionId: string | null;
  isGroupSession: boolean;
  
  // Internal state
  _isAbandoning: boolean;
  _sessionAutoCompleted: boolean;
}

interface SessionActions {
  // Setup
  setUser: (user: SessionUser | null) => void;
  setLocation: (location: SessionLocation | null) => void;
  setGroupSession: (groupId: string | null) => void;
  
  // Actions
  onPlayerSeated: (location: SessionLocation) => void;
  updateConfig: (updates: Partial<SessionConfig>) => void;
  startSession: () => Promise<void>;
  cancelSetup: () => void;
  endSession: (durationSeconds: number, coinsEarned: number) => void;
  requestAbandonSession: () => void;
  confirmAbandonSession: (skipGroupFail?: boolean) => Promise<void>;
  cancelAbandonSession: () => void;
  goHome: () => void;
  goHomeFromAbandoned: () => void;
  continueFromAbandoned: () => void;
  showBreakSetup: () => void;
  setBreakDuration: (minutes: number) => void;
  startBreak: () => void;
  endBreak: () => void;
  startAnotherSession: () => void;
  
  // Internal actions (for timer/appstate)
  _tick: () => void;
  _failSession: () => Promise<void>;
  _completeSessionInternal: (durationSeconds: number, coinsEarned: number) => Promise<void>;
  _sendHeartbeat: () => void;
  
  // Lifecycle
  _initialize: () => () => void;
}

type SessionStore = SessionState & SessionActions;

// ============================================================================
// Module-level refs (outside React, accessible from Godot bridge)
// ============================================================================

let timerRef: ReturnType<typeof setInterval> | null = null;
let heartbeatRef: ReturnType<typeof setInterval> | null = null;
let failTimeoutRef: ReturnType<typeof setTimeout> | null = null;
let appStateSubscription: ReturnType<typeof AppState.addEventListener> | null = null;

// AppState tracking
let appStateRef: AppStateStatus = AppState.currentState;
let inactiveStartTimeRef: number | null = null;
let backgroundStartTimeRef: number | null = null;

// Godot callbacks (set externally via setGodotCallbacks)
let onGodotStartSession: (() => void) | null = null;
let onGodotEndSession: (() => void) | null = null;
let onGodotCancelSetup: (() => void) | null = null;
let onGodotStartBreak: (() => void) | null = null;
let onGodotEndBreak: (() => void) | null = null;

/**
 * Set Godot callbacks for session events
 * Call this from the game screen to connect Godot
 */
export function setGodotCallbacks(callbacks: {
  onStartSession?: () => void;
  onEndSession?: () => void;
  onCancelSetup?: () => void;
  onStartBreak?: () => void;
  onEndBreak?: () => void;
}) {
  onGodotStartSession = callbacks.onStartSession ?? null;
  onGodotEndSession = callbacks.onEndSession ?? null;
  onGodotCancelSetup = callbacks.onCancelSetup ?? null;
  onGodotStartBreak = callbacks.onStartBreak ?? null;
  onGodotEndBreak = callbacks.onEndBreak ?? null;
}

/**
 * Clear Godot callbacks (on unmount)
 */
export function clearGodotCallbacks() {
  onGodotStartSession = null;
  onGodotEndSession = null;
  onGodotCancelSetup = null;
  onGodotStartBreak = null;
  onGodotEndBreak = null;
}

// ============================================================================
// Store
// ============================================================================

export const useSessionStore = create<SessionStore>((set, get) => ({
  // --------------------------------------------------------------------------
  // Initial State
  // --------------------------------------------------------------------------
  phase: 'idle',
  config: DEFAULT_CONFIG,
  activeSession: null,
  completedSession: null,
  breakSession: null,
  breakDurationMinutes: 5,
  showingAbandonConfirm: false,
  hasCompletedAnySession: false,
  firebaseSessionId: null,
  currentLocation: null,
  currentUser: null,
  groupSessionId: null,
  isGroupSession: false,
  _isAbandoning: false,
  _sessionAutoCompleted: false,
  
  // --------------------------------------------------------------------------
  // Setup
  // --------------------------------------------------------------------------
  
  setUser: (user) => {
    set({ currentUser: user });
  },
  
  setLocation: (location) => {
    set({ currentLocation: location });
  },
  
  setGroupSession: (groupId) => {
    set({ 
      groupSessionId: groupId,
      isGroupSession: groupId !== null,
    });
  },
  
  // --------------------------------------------------------------------------
  // Actions
  // --------------------------------------------------------------------------
  
  onPlayerSeated: (location) => {
    console.log('[SessionStore] Player seated at:', location.buildingId, location.spotId);
    set({ phase: 'setup', currentLocation: location });
  },
  
  updateConfig: (updates) => {
    set((state) => ({ config: { ...state.config, ...updates } }));
  },
  
  startSession: async () => {
    const { config, currentUser, currentLocation, groupSessionId, _tick, _sendHeartbeat } = get();
    console.log('[SessionStore] Starting session:', config, 'groupSessionId:', groupSessionId);
    
    const totalSeconds = config.durationMinutes * 60;
    
    const session: ActiveSession = {
      config,
      startedAt: Date.now(),
      remainingSeconds: totalSeconds,
    };
    
    set({
      activeSession: session,
      phase: 'active',
      _sessionAutoCompleted: false,
    });
    
    // Create Firebase session (if user is logged in)
    if (currentUser && currentLocation) {
      try {
        const sessionId = await sessionService.createSession({
          odId: currentUser.odId,
          displayName: currentUser.displayName || 'Anonymous',
          buildingId: currentLocation.buildingId,
          buildingName: currentLocation.buildingName,
          spotId: currentLocation.spotId,
          plannedDuration: totalSeconds,
          workType: 'study' as WorkType, // TODO: make configurable
          deepFocusMode: config.deepFocusMode,
          groupSessionId: groupSessionId ?? undefined,
        });
        set({ firebaseSessionId: sessionId });
        console.log('[SessionStore] Created Firebase session:', sessionId);
      } catch (error) {
        console.error('[SessionStore] Failed to create Firebase session:', error);
        // Continue anyway - local session will still work
      }
    }
    
    // Schedule success notification
    await scheduleSuccessNotification(totalSeconds);
    
    // Start countdown timer
    if (timerRef) clearInterval(timerRef);
    timerRef = setInterval(_tick, 1000);
    
    // Start heartbeat for presence updates
    if (heartbeatRef) clearInterval(heartbeatRef);
    heartbeatRef = setInterval(_sendHeartbeat, HEARTBEAT_INTERVAL_MS);
    
    // Notify Godot
    onGodotStartSession?.();
  },
  
  cancelSetup: () => {
    console.log('[SessionStore] Setup cancelled');
    set({ phase: 'idle', currentLocation: null });
    onGodotCancelSetup?.();
  },
  
  endSession: (durationSeconds, coinsEarned) => {
    const { _sessionAutoCompleted, _isAbandoning } = get();
    
    // If session was auto-completed by timer, just reset the flag
    if (_sessionAutoCompleted) {
      console.log('[SessionStore] Ignoring callback - session was auto-completed');
      set({ _sessionAutoCompleted: false });
      return;
    }
    
    // Ignore if we're abandoning
    if (_isAbandoning) {
      console.log('[SessionStore] Ignoring callback - session was abandoned');
      set({ _isAbandoning: false });
      return;
    }
    
    console.log('[SessionStore] Session completed via callback:', durationSeconds, 's,', coinsEarned, 'coins');
    
    // Stop timers
    if (timerRef) {
      clearInterval(timerRef);
      timerRef = null;
    }
    if (heartbeatRef) {
      clearInterval(heartbeatRef);
      heartbeatRef = null;
    }
    
    // Cancel notifications
    cancelAllNotifications();
    
    // Complete Firebase session
    const { firebaseSessionId } = get();
    if (firebaseSessionId) {
      sessionService.completeSession(firebaseSessionId, durationSeconds, coinsEarned)
        .catch(err => console.error('[SessionStore] Failed to complete Firebase session:', err));
    }
    
    set({
      completedSession: {
        durationSeconds,
        coinsEarned,
        totalTimeToday: durationSeconds, // TODO: fetch actual today's total
      },
      activeSession: null,
      firebaseSessionId: null,
      currentLocation: null,
      hasCompletedAnySession: true,
      phase: 'complete',
    });
    
    onGodotEndSession?.();
  },
  
  requestAbandonSession: () => {
    console.log('[SessionStore] Abandon requested - showing confirmation');
    set({ showingAbandonConfirm: true });
  },
  
  confirmAbandonSession: async (skipGroupFail = false) => {
    const { firebaseSessionId, isGroupSession, groupSessionId } = get();
    console.log('[SessionStore] Session abandoned - no rewards, isGroup:', isGroupSession, 'skipGroupFail:', skipGroupFail);
    
    // Stop timers
    if (timerRef) {
      clearInterval(timerRef);
      timerRef = null;
    }
    if (heartbeatRef) {
      clearInterval(heartbeatRef);
      heartbeatRef = null;
    }
    
    // Clear fail timeout
    if (failTimeoutRef) {
      clearTimeout(failTimeoutRef);
      failTimeoutRef = null;
    }
    
    // Cancel notifications
    cancelAllNotifications();
    
    // Abandon Firebase session
    if (firebaseSessionId) {
      try {
        await sessionService.abandonSession(firebaseSessionId);
      } catch (err) {
        console.error('[SessionStore] Failed to abandon Firebase session:', err);
      }
    }
    
    // If group session, fail it for everyone (unless triggered externally)
    if (isGroupSession && groupSessionId && !skipGroupFail) {
      try {
        await groupsService.failGroupSession(groupSessionId);
        console.log('[SessionStore] Failed group session for everyone:', groupSessionId);
      } catch (err) {
        console.error('[SessionStore] Failed to fail group session:', err);
      }
    }
    
    set({
      _isAbandoning: true,
      showingAbandonConfirm: false,
      activeSession: null,
      firebaseSessionId: null,
      currentLocation: null,
      hasCompletedAnySession: true,
      phase: 'abandoned',
    });
    
    onGodotEndSession?.();
  },
  
  cancelAbandonSession: () => {
    set({ showingAbandonConfirm: false });
  },
  
  goHome: () => {
    console.log('[SessionStore] Going home');
    set({ completedSession: null, hasCompletedAnySession: false, phase: 'idle' });
  },
  
  goHomeFromAbandoned: () => {
    console.log('[SessionStore] Going home from abandoned');
    set({ _isAbandoning: false, hasCompletedAnySession: false, phase: 'idle' });
  },
  
  continueFromAbandoned: () => {
    console.log('[SessionStore] Continue from abandoned - showing setup');
    set({ _isAbandoning: false, phase: 'setup' });
  },
  
  showBreakSetup: () => {
    console.log('[SessionStore] Showing break setup');
    set({ completedSession: null, breakSession: null, phase: 'break' });
  },
  
  setBreakDuration: (minutes) => {
    set({ breakDurationMinutes: minutes });
  },
  
  startBreak: () => {
    const { breakDurationMinutes } = get();
    console.log('[SessionStore] Starting break:', breakDurationMinutes, 'min');
    
    const breakDuration = breakDurationMinutes * 60;
    
    set({
      breakSession: {
        durationSeconds: breakDuration,
        remainingSeconds: breakDuration,
      },
    });
    
    // Notify Godot to switch camera to overview
    onGodotStartBreak?.();
    
    // Start break countdown (simple decrement for breaks)
    if (timerRef) clearInterval(timerRef);
    timerRef = setInterval(() => {
      const state = get();
      if (!state.breakSession) return;
      
      const newRemaining = state.breakSession.remainingSeconds - 1;
      
      if (newRemaining <= 0) {
        if (timerRef) {
          clearInterval(timerRef);
          timerRef = null;
        }
        set({ breakSession: null, phase: 'setup' });
        onGodotEndBreak?.();
      } else {
        set({
          breakSession: { ...state.breakSession, remainingSeconds: newRemaining },
        });
      }
    }, 1000);
  },
  
  endBreak: () => {
    console.log('[SessionStore] Break ended - showing session setup');
    
    if (timerRef) {
      clearInterval(timerRef);
      timerRef = null;
    }
    
    set({ breakSession: null, phase: 'setup' });
    onGodotEndBreak?.();
  },
  
  startAnotherSession: () => {
    console.log('[SessionStore] Starting another session');
    
    if (timerRef) {
      clearInterval(timerRef);
      timerRef = null;
    }
    
    set({ breakSession: null, phase: 'setup' });
  },
  
  // --------------------------------------------------------------------------
  // Internal Actions
  // --------------------------------------------------------------------------
  
  _tick: () => {
    const state = get();
    if (!state.activeSession) return;
    
    const now = Date.now();
    const elapsedSeconds = Math.floor((now - state.activeSession.startedAt) / 1000);
    const totalSeconds = state.activeSession.config.durationMinutes * 60;
    const newRemaining = Math.max(0, totalSeconds - elapsedSeconds);
    
    if (newRemaining <= 0) {
      // Timer complete
      const coinsEarned = Math.max(1, Math.floor(state.activeSession.config.durationMinutes * COINS_PER_MINUTE));
      state._completeSessionInternal(totalSeconds, coinsEarned);
    } else {
      set({
        activeSession: { ...state.activeSession, remainingSeconds: newRemaining },
      });
    }
  },
  
  _sendHeartbeat: () => {
    const { firebaseSessionId, activeSession } = get();
    if (!firebaseSessionId || !activeSession) return;
    
    sessionService.updateHeartbeat(firebaseSessionId, activeSession.remainingSeconds)
      .catch(err => console.error('[SessionStore] Heartbeat failed:', err));
  },
  
  _failSession: async () => {
    console.log('[SessionStore] Session failed - user away too long');
    
    // Stop timers
    if (timerRef) {
      clearInterval(timerRef);
      timerRef = null;
    }
    if (heartbeatRef) {
      clearInterval(heartbeatRef);
      heartbeatRef = null;
    }
    
    // Clear refs
    backgroundStartTimeRef = null;
    if (failTimeoutRef) {
      clearTimeout(failTimeoutRef);
      failTimeoutRef = null;
    }
    
    // Cancel notifications
    cancelAllNotifications();
    
    // Fail Firebase session
    const { firebaseSessionId } = get();
    if (firebaseSessionId) {
      try {
        await sessionService.failSession(firebaseSessionId);
      } catch (err) {
        console.error('[SessionStore] Failed to fail Firebase session:', err);
      }
    }
    
    set({
      _isAbandoning: true,
      activeSession: null,
      firebaseSessionId: null,
      currentLocation: null,
      hasCompletedAnySession: true,
      phase: 'abandoned',
    });
    
    onGodotEndSession?.();
  },
  
  _completeSessionInternal: async (durationSeconds, coinsEarned) => {
    console.log('[SessionStore] Auto-completing session:', durationSeconds, 's,', coinsEarned, 'coins');
    
    // Stop timers
    if (timerRef) {
      clearInterval(timerRef);
      timerRef = null;
    }
    if (heartbeatRef) {
      clearInterval(heartbeatRef);
      heartbeatRef = null;
    }
    
    // Clear fail timeout
    if (failTimeoutRef) {
      clearTimeout(failTimeoutRef);
      failTimeoutRef = null;
    }
    
    // Cancel notifications
    cancelAllNotifications();
    
    // Complete Firebase session
    const { firebaseSessionId } = get();
    if (firebaseSessionId) {
      try {
        await sessionService.completeSession(firebaseSessionId, durationSeconds, coinsEarned);
      } catch (err) {
        console.error('[SessionStore] Failed to complete Firebase session:', err);
      }
    }
    
    set({
      _sessionAutoCompleted: true,
      completedSession: {
        durationSeconds,
        coinsEarned,
        totalTimeToday: durationSeconds, // TODO: fetch actual today's total
      },
      activeSession: null,
      firebaseSessionId: null,
      currentLocation: null,
      hasCompletedAnySession: true,
      phase: 'complete',
    });
    
    onGodotEndSession?.();
  },
  
  // --------------------------------------------------------------------------
  // Lifecycle
  // --------------------------------------------------------------------------
  
  _initialize: () => {
    console.log('[SessionStore] Initializing...');
    
    // Request notification permissions
    requestNotificationPermissions();
    
    // Set up AppState listener
    appStateSubscription = AppState.addEventListener('change', async (nextState: AppStateStatus) => {
      const state = get();
      const prevState = appStateRef;
      
      console.log('[SessionStore] AppState:', prevState, '->', nextState, 'phase:', state.phase);
      
      // Track when we go inactive
      if (nextState === 'inactive') {
        inactiveStartTimeRef = Date.now();
      }
      
      // Handle going to background during active session
      if (nextState === 'background' && state.phase === 'active') {
        const timeInactive = inactiveStartTimeRef
          ? Date.now() - inactiveStartTimeRef
          : Infinity;
        
        const isAppSwitch = timeInactive > LOCK_DETECTION_THRESHOLD_MS;
        
        console.log('[SessionStore] Background transition:', {
          timeInactive,
          isAppSwitch,
          threshold: LOCK_DETECTION_THRESHOLD_MS,
        });
        
        if (isAppSwitch) {
          console.log('[SessionStore] App switch detected - starting grace period');
          backgroundStartTimeRef = Date.now();
          
          await scheduleReminderNotification();
          
          failTimeoutRef = setTimeout(() => {
            if (backgroundStartTimeRef) {
              get()._failSession();
            }
          }, GRACE_PERIOD_MS);
        } else {
          console.log('[SessionStore] Phone lock detected - timer continues');
        }
      }
      
      // Handle returning to active
      if (nextState === 'active' && prevState !== 'active') {
        const state = get();
        
        if (backgroundStartTimeRef && state.phase === 'active') {
          const timeAway = Date.now() - backgroundStartTimeRef;
          console.log('[SessionStore] Returned after', timeAway, 'ms');
          
          if (failTimeoutRef) {
            clearTimeout(failTimeoutRef);
            failTimeoutRef = null;
          }
          
          await cancelAllNotifications();
          
          // Re-schedule success notification
          if (state.activeSession) {
            const now = Date.now();
            const elapsedSeconds = Math.floor((now - state.activeSession.startedAt) / 1000);
            const totalSeconds = state.activeSession.config.durationMinutes * 60;
            const remainingSeconds = Math.max(0, totalSeconds - elapsedSeconds);
            
            if (remainingSeconds > 0) {
              await scheduleSuccessNotification(remainingSeconds);
            }
          }
          
          backgroundStartTimeRef = null;
        }
        
        inactiveStartTimeRef = null;
      }
      
      appStateRef = nextState;
    });
    
    // Return cleanup function
    return () => {
      console.log('[SessionStore] Cleaning up...');
      
      if (timerRef) {
        clearInterval(timerRef);
        timerRef = null;
      }
      
      if (heartbeatRef) {
        clearInterval(heartbeatRef);
        heartbeatRef = null;
      }
      
      if (failTimeoutRef) {
        clearTimeout(failTimeoutRef);
        failTimeoutRef = null;
      }
      
      if (appStateSubscription) {
        appStateSubscription.remove();
        appStateSubscription = null;
      }
      
      cancelAllNotifications();
    };
  },
}));

// ============================================================================
// Selectors (for performance - only re-render on specific state changes)
// ============================================================================

export const selectPhase = (state: SessionStore) => state.phase;
export const selectConfig = (state: SessionStore) => state.config;
export const selectActiveSession = (state: SessionStore) => state.activeSession;
export const selectCompletedSession = (state: SessionStore) => state.completedSession;
export const selectBreakSession = (state: SessionStore) => state.breakSession;
export const selectBreakDurationMinutes = (state: SessionStore) => state.breakDurationMinutes;
export const selectShowingAbandonConfirm = (state: SessionStore) => state.showingAbandonConfirm;
export const selectCurrentLocation = (state: SessionStore) => state.currentLocation;
export const selectGroupSessionId = (state: SessionStore) => state.groupSessionId;
export const selectIsGroupSession = (state: SessionStore) => state.isGroupSession;
export const selectHasCompletedAnySession = (state: SessionStore) => state.hasCompletedAnySession;

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
