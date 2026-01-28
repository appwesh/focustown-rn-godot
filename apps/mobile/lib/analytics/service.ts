/**
 * Analytics service - Mixpanel wrapper
 */

import { Mixpanel } from "mixpanel-react-native";
import type {
  ScreenName,
  ScreenViewProperties,
  SessionStartProperties,
  SessionEndProperties,
  SignInProperties,
  UserProperties,
} from "./types";
import { identifySessionReplay } from "./session-replay";

// Mixpanel instance
let mixpanel: Mixpanel | null = null;

function warnNotInitialized(action: string) {
  console.warn(`[Analytics] Mixpanel not initialized. Skipping: ${action}`);
}

function logEvent(eventName: string, properties?: unknown) {
  if (properties) {
    console.log("[Analytics] Track event:", eventName, properties);
  } else {
    console.log("[Analytics] Track event:", eventName);
  }
}

// ============================================================================
// Initialization
// ============================================================================

/**
 * Initialize Mixpanel with project token
 */
export async function init(token: string): Promise<void> {
  try {
    mixpanel = new Mixpanel(token, true); // true = track automatically
    await mixpanel.init();
    console.log("[Analytics] Mixpanel initialized");
  } catch (error) {
    console.error("[Analytics] Failed to initialize Mixpanel:", error);
  }
}

// ============================================================================
// User Identification
// ============================================================================

/**
 * Identify user after authentication
 */
export function identify(userId: string, properties?: UserProperties): void {
  if (!mixpanel) {
    warnNotInitialized("identify");
    return;
  }

  mixpanel.identify(userId);

  if (properties) {
    mixpanel.getPeople().set(properties);
  }

  // Sync user identity with Session Replay
  identifySessionReplay(userId);

  console.log("[Analytics] User identified:", userId);
}

/**
 * Identify user with Firebase UID and set profile properties
 */
export function identifyUser(
  firebaseUid: string,
  properties?: UserProperties
): void {
  identify(firebaseUid, properties);
}

/**
 * Reset user identity on sign out
 */
export function reset(): void {
  if (!mixpanel) {
    warnNotInitialized("reset");
    return;
  }

  mixpanel.reset();
  console.log("[Analytics] User reset");
}

// ============================================================================
// Event Tracking
// ============================================================================

/**
 * Track screen view
 */
export function trackScreenView(screenName: ScreenName): void {
  if (!mixpanel) {
    warnNotInitialized("trackScreenView");
    return;
  }

  const properties: ScreenViewProperties = { screen_name: screenName };
  logEvent("screen_view", properties);
  mixpanel.track("screen_view", properties);
}

/**
 * Track focus session start
 */
export function trackSessionStart(properties?: SessionStartProperties): void {
  if (!mixpanel) {
    warnNotInitialized("trackSessionStart");
    return;
  }

  logEvent("session_start", properties);
  mixpanel.track("session_start", properties || {});
}

/**
 * Track focus session end
 */
export function trackSessionEnd(properties: SessionEndProperties): void {
  if (!mixpanel) {
    warnNotInitialized("trackSessionEnd");
    return;
  }

  logEvent("session_end", properties);
  mixpanel.track("session_end", properties);
}

/**
 * Track user sign in
 */
export function trackSignIn(properties?: SignInProperties): void {
  if (!mixpanel) {
    warnNotInitialized("trackSignIn");
    return;
  }

  logEvent("sign_in", properties || { method: "phone" });
  mixpanel.track("sign_in", properties || { method: "phone" });
}

/**
 * Track user sign out
 */
export function trackSignOut(): void {
  if (!mixpanel) {
    warnNotInitialized("trackSignOut");
    return;
  }

  logEvent("sign_out");
  mixpanel.track("sign_out");
}

/**
 * Generic track method for custom events
 */
export function track(
  eventName: string,
  properties?: Record<string, unknown>
): void {
  if (!mixpanel) {
    warnNotInitialized(`track:${eventName}`);
    return;
  }

  logEvent(eventName, properties);
  mixpanel.track(eventName, properties);
}

