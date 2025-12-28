import type { FirebaseAuthTypes } from "@react-native-firebase/auth";

// User document stored in Firestore
// Using a flat structure to avoid nested writes and complex queries
export interface UserDoc {
  // Core identity (set on creation, rarely changes)
  uid: string;
  phoneNumber: string;
  createdAt: number; // Unix timestamp (ms) - simpler than Firestore timestamps for queries

  // Profile (user can edit)
  displayName: string | null;

  // Game progress (updated frequently)
  totalCoins: number;
  totalFocusTime: number; // in seconds
  sessionsCompleted: number;

  // Metadata
  lastActiveAt: number; // Unix timestamp (ms)
}

// Auth state exposed to the app
export interface AuthState {
  user: FirebaseAuthTypes.User | null;
  userDoc: UserDoc | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

// Phone auth flow states
export type PhoneAuthStep = "idle" | "sending" | "verifying" | "error";

export interface PhoneAuthState {
  step: PhoneAuthStep;
  verificationId: string | null;
  error: string | null;
}

