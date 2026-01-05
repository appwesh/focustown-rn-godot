// Firebase JS SDK Firestore
export { db } from "./config";

// Auth context and hooks
export { AuthProvider, useAuth } from "./auth";

// Services
export { userService } from "./user";
export { sessionService } from "./sessions";
export { friendsService } from "./friends";
export { groupsService } from "./groups";

// Types
export type {
  // User
  UserDoc,
  AuthState,
  PhoneAuthStep,
  PhoneAuthState,
  // Sessions
  SessionDoc,
  SessionStatus,
  WorkType,
  CreateSessionInput,
  BuildingPresence,
  // Friends
  FriendshipDoc,
  FriendshipStatus,
  FriendInfo,
  // Groups
  GroupSessionDoc,
  GroupSessionStatus,
  GroupInviteDoc,
  InviteStatus,
  CreateGroupSessionInput,
} from "./types";
