/**
 * Analytics module
 */

export {
  init,
  identify,
  identifyUser,
  reset,
  trackScreenView,
  trackSessionStart,
  trackSessionEnd,
  trackSignIn,
  trackSignOut,
  track,
} from "./service";

export {
  initSessionReplay,
  startRecording,
  stopRecording,
  isRecording,
  identifySessionReplay,
  MPSessionReplayMask,
} from "./session-replay";
export type { SessionReplayOptions } from "./session-replay";

export { useAnalytics } from "./useAnalytics";

export type {
  ScreenName,
  AnalyticsEvent,
  ScreenViewProperties,
  SessionStartProperties,
  SessionEndProperties,
  SignInProperties,
  UserProperties,
} from "./types";

