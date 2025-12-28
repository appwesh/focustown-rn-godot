// Native Firebase Auth (for phone auth)
import auth from "@react-native-firebase/auth";
export { auth };

// Firebase JS SDK Firestore
export { db } from "./config";

// Auth context and hooks
export { AuthProvider, useAuth } from "./auth";

// User service
export { userService } from "./user";

// Types
export type {
  UserDoc,
  AuthState,
  PhoneAuthStep,
  PhoneAuthState,
} from "./types";
