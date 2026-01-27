import type { FirebaseAuthTypes } from "@react-native-firebase/auth";

// ============================================================================
// User
// ============================================================================

/**
 * Character appearance data for customization
 * All items are regular parts that can be mixed and matched
 */
export interface CharacterSkin {
  SkinTone?: number;
  Face?: number;
  EyeColor?: number;
  Hair?: number;
  HairColor?: number;
  Top?: number;        // 0=None, 1-8=standard, 9=LofiTop
  TopVariant?: number;
  Bottom?: number;     // 0=None, 1-6=standard, 7=LofiPants
  BottomVariant?: number;
  Shoes?: number;
  ShoesVariant?: number;
  Hat?: number;        // 0=None, 1-12=standard, 13=Headphone
  HatVariant?: number;
  Glasses?: number;
  GlassesVariant?: number;
  Neck?: number;       // 0=None, 1=SpikedCollar, 2=LofiScarf
  NeckVariant?: number;
}

export interface OnboardingAnswers {
  ageRange: string | null;
  studyLocation: string | null;
  socialBaseline: string | null;
  studyFrequency: string | null;
  sessionLength: string | null;
  focusFriction: string | null;
  focusFor: string | null;
  goal: string | null;
}

/**
 * User document stored in Firestore
 * Flat structure to avoid nested writes and complex queries
 */
export interface UserDoc {
  // Core identity (set on creation, rarely changes)
  uid: string;
  phoneNumber: string;
  createdAt: number; // Unix timestamp (ms)

  // Profile (user can edit)
  displayName: string | null;
  username: string | null; // Unique, lowercase, for friend search
  avatarUrl: string | null;
  bio: string | null; // Short bio, max 50 characters
  birthday: number | null; // Unix timestamp (ms) for birthday date
  location: string | null; // e.g., "Villanova University"
  onboarding: OnboardingAnswers | null;

  // Character customization
  characterSkin: CharacterSkin | null;

  // Store / Inventory
  ownedItems: string[]; // Array of item IDs the user has purchased
  wishlistItem: string | null; // Single wishlisted item ID (only one at a time)
  dailyRefreshSeed: number; // Seed for daily finds generation
  dailyRefreshDate: string; // YYYY-MM-DD of last refresh (resets when day changes)

  // Game progress (updated frequently via increment())
  totalCoins: number;
  totalFocusTime: number; // in seconds
  sessionsCompleted: number;

  // Streaks
  currentStreak: number;
  longestStreak: number;

  // Social
  friendCount: number;

  // Push Notifications
  expoPushToken: string | null;
  tokenUpdatedAt: number | null;

  // Metadata
  lastActiveAt: number; // Unix timestamp (ms)
}

// ============================================================================
// Sessions
// ============================================================================

/** Session status transitions: active → completed/abandoned/failed */
export type SessionStatus = "active" | "completed" | "abandoned" | "failed";

/** Work type categories */
export type WorkType = "study" | "work" | "creative" | "reading" | "other";

/**
 * Session document - used for both active (presence) and historical records
 */
export interface SessionDoc {
  id: string; // Auto-generated
  odId: string; // User who owns this session
  displayName: string; // Denormalized for presence UI

  // Location
  buildingId: string; // e.g., "cafe", "library"
  buildingName: string; // Display name (denormalized)
  spotId: string; // e.g., "table_1"

  // Timing
  plannedDuration: number; // Selected duration in seconds
  actualDuration: number | null; // Set on completion
  remainingSeconds: number; // Updated via heartbeat for live presence
  startedAt: number; // Unix timestamp when started
  endedAt: number | null; // Unix timestamp when ended
  updatedAt: number; // Heartbeat timestamp

  // Config
  workType: WorkType;
  deepFocusMode: boolean;

  // Results
  status: SessionStatus;
  coinsEarned: number | null; // Set on completion

  // Group session (optional)
  groupSessionId: string | null;
  isGroupSession: boolean;
}

/** Input for creating a new session */
export interface CreateSessionInput {
  odId: string;
  displayName: string;
  buildingId: string;
  buildingName: string;
  spotId: string;
  plannedDuration: number;
  workType: WorkType;
  deepFocusMode: boolean;
  groupSessionId?: string;
}

// ============================================================================
// Friendships
// ============================================================================

/** Friendship status */
export type FriendshipStatus = "pending" | "accepted" | "blocked";

/**
 * Friendship document
 * ID is composite: min(uidA, uidB)_max(uidA, uidB)
 */
export interface FriendshipDoc {
  users: [string, string]; // Both user IDs
  status: FriendshipStatus;
  requesterId: string; // Who sent the request
  createdAt: number;
  acceptedAt: number | null;
}

/** Friend info for display (denormalized from user) */
export interface FriendInfo {
  odId: string;
  displayName: string | null;
  username: string | null;
  avatarUrl: string | null;
  isOnline?: boolean;
  currentSession?: {
    buildingName: string;
    remainingSeconds: number;
  } | null;
}

// ============================================================================
// Group Sessions
// ============================================================================

/** Group session status */
export type GroupSessionStatus = "pending" | "active" | "completed" | "cancelled" | "failed";

/**
 * Group session document
 */
/** Participant state for multiplayer sync (simplified - no position tracking) */
export interface ParticipantState {
  displayName: string;
  state: 'entrance' | 'seated';
  spotId: string | null;
}

export interface GroupSessionDoc {
  id: string;
  hostId: string;
  hostName: string; // Denormalized

  // Location
  buildingId: string;
  buildingName: string;

  // Config (set by host when creating lobby)
  plannedDuration: number; // seconds - set by host when creating lobby
  workType: WorkType;
  deepFocusMode: boolean;

  // Participants (bounded ~20)
  participantIds: string[];
  participantCount: number;

  // Participant states for multiplayer (odId -> state)
  participantStates?: Record<string, ParticipantState>;
  
  // Seat occupancy tracking (spotId -> odId)
  occupiedSpots?: Record<string, string>;

  // Lifecycle
  status: GroupSessionStatus;
  startedAt: number | null; // All timers sync from this (set when all seated)
  endedAt: number | null;
  createdAt: number;
}

/** Input for creating a group session */
export interface CreateGroupSessionInput {
  hostId: string;
  hostName: string;
  buildingId: string;
  buildingName: string;
  plannedDuration: number;
  workType: WorkType;
  deepFocusMode: boolean;
}

// ============================================================================
// Group Invites
// ============================================================================

/** Invite status */
export type InviteStatus = "pending" | "accepted" | "declined";

/**
 * Group invite document
 * ID is composite: {odId}_{groupId}
 */
export interface GroupInviteDoc {
  odId: string; // Invited user
  groupId: string; // Group session ID
  hostId: string;
  hostName: string; // Denormalized
  status: InviteStatus;
  invitedAt: number;
  respondedAt: number | null;
  expiresAt: number; // Auto-expire time
}

// ============================================================================
// Presence (computed from sessions)
// ============================================================================

/** Presence info for a user currently in a building */
export interface BuildingPresence {
  odId: string;
  displayName: string;
  spotId: string;
  remainingSeconds: number;
  workType: WorkType;
  isGroupSession: boolean;
}

// ============================================================================
// Auth (unchanged)
// ============================================================================

export interface AuthState {
  user: FirebaseAuthTypes.User | null;
  userDoc: UserDoc | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export type PhoneAuthStep = "idle" | "sending" | "verifying" | "error";

export interface PhoneAuthState {
  step: PhoneAuthStep;
  verificationId: string | null;
  error: string | null;
}
