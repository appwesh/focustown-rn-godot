/**
 * Analytics event types and properties
 */

// Screen names for tracking
export type ScreenName =
  | "index"
  | "onboarding"
  | "home"
  | "social"
  | "game"
  | "profile"
  | "settings"
  | "store"
  | "character";

// Event names
export type AnalyticsEvent =
  | "screen_view"
  | "session_start"
  | "session_end"
  | "sign_in"
  | "sign_out";

// Event properties
export interface ScreenViewProperties {
  screen_name: ScreenName;
}

export interface SessionStartProperties {
  work_type?: string;
  duration_minutes?: number;
}

export interface SessionEndProperties {
  duration_seconds: number;
  coins_earned: number;
  completed: boolean;
}

export interface SignInProperties {
  method: "phone";
}

// User properties for identification
export interface UserProperties {
  name?: string;
  phone_number?: string;
  display_name?: string;
  created_at?: string;
  // Onboarding properties
  gender?: string;
  avatar?: string;
  age_range?: string;
  study_location?: string[];
  social_baseline?: string;
  study_frequency?: string;
  session_length?: string;
  focus_friction?: string;
  focus_for?: string;
  goal?: string[];
}

