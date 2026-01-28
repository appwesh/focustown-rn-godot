/**
 * Mixpanel Session Replay service
 */

import {
  MPSessionReplay,
  MPSessionReplayConfig,
  MPSessionReplayMask,
} from "@mixpanel/react-native-session-replay";

// Track initialization state
let isInitialized = false;

// ============================================================================
// Configuration
// ============================================================================

/**
 * Session Replay configuration options
 */
export interface SessionReplayOptions {
  /** Restrict transmission to WiFi connections only (default: false) */
  wifiOnly?: boolean;
  /** Percentage of sessions to record (0-100, default: 100) */
  recordingSessionsPercent?: number;
  /** Begin recording automatically upon initialization (default: true) */
  autoStartRecording?: boolean;
  /** Recording upload frequency in seconds (default: 10) */
  flushInterval?: number;
  /** Enable debug logging (default: false in production) */
  enableLogging?: boolean;
}

const defaultOptions: SessionReplayOptions = {
  wifiOnly: false,
  recordingSessionsPercent: 100,
  autoStartRecording: true,
  flushInterval: 10,
  enableLogging: __DEV__,
};

// ============================================================================
// Initialization
// ============================================================================

/**
 * Initialize Mixpanel Session Replay
 * @param token - Mixpanel project token
 * @param distinctId - User identifier (can be anonymous initially)
 * @param options - Configuration options
 */
export async function initSessionReplay(
  token: string,
  distinctId: string,
  options?: SessionReplayOptions
): Promise<void> {
  if (isInitialized) {
    console.log("[SessionReplay] Already initialized");
    return;
  }

  try {
    const mergedOptions = { ...defaultOptions, ...options };

    const config = new MPSessionReplayConfig({
      wifiOnly: mergedOptions.wifiOnly,
      recordingSessionsPercent: mergedOptions.recordingSessionsPercent,
      autoStartRecording: mergedOptions.autoStartRecording,
      flushInterval: mergedOptions.flushInterval,
      enableLogging: mergedOptions.enableLogging,
      // Mask sensitive content by default
      autoMaskedViews: [
        MPSessionReplayMask.Text,
        MPSessionReplayMask.Image,
      ],
    });

    await MPSessionReplay.initialize(token, distinctId, config);
    isInitialized = true;
    console.log("[SessionReplay] Initialized successfully");
  } catch (error) {
    console.error("[SessionReplay] Failed to initialize:", error);
  }
}

// ============================================================================
// Recording Controls
// ============================================================================

/**
 * Start recording session
 */
export async function startRecording(): Promise<void> {
  if (!isInitialized) {
    console.warn("[SessionReplay] Not initialized. Call initSessionReplay first.");
    return;
  }

  try {
    await MPSessionReplay.startRecording();
    console.log("[SessionReplay] Recording started");
  } catch (error) {
    console.error("[SessionReplay] Failed to start recording:", error);
  }
}

/**
 * Stop recording session
 */
export async function stopRecording(): Promise<void> {
  if (!isInitialized) {
    console.warn("[SessionReplay] Not initialized. Call initSessionReplay first.");
    return;
  }

  try {
    await MPSessionReplay.stopRecording();
    console.log("[SessionReplay] Recording stopped");
  } catch (error) {
    console.error("[SessionReplay] Failed to stop recording:", error);
  }
}

/**
 * Check if currently recording
 */
export async function isRecording(): Promise<boolean> {
  if (!isInitialized) {
    return false;
  }

  try {
    return await MPSessionReplay.isRecording();
  } catch (error) {
    console.error("[SessionReplay] Failed to check recording status:", error);
    return false;
  }
}

// ============================================================================
// User Identification
// ============================================================================

/**
 * Update user identifier for session replay
 * Call this when user logs in or identity changes
 */
export async function identifySessionReplay(userId: string): Promise<void> {
  if (!isInitialized) {
    console.warn("[SessionReplay] Not initialized. Call initSessionReplay first.");
    return;
  }

  try {
    await MPSessionReplay.identify(userId);
    console.log("[SessionReplay] User identified:", userId);
  } catch (error) {
    console.error("[SessionReplay] Failed to identify user:", error);
  }
}

// ============================================================================
// Exports
// ============================================================================

export { MPSessionReplayMask };
