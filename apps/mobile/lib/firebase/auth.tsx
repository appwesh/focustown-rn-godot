import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";
import auth, { FirebaseAuthTypes } from "@react-native-firebase/auth";
import { userService } from "./user";
import type { AuthState, UserDoc, PhoneAuthState } from "./types";

// ============================================================================
// Enable test mode for phone auth in development
// This MUST be set before any auth calls to work properly
// ============================================================================
if (__DEV__) {
  console.log("[Auth] Enabling test mode for phone auth");
  auth().settings.appVerificationDisabledForTesting = true;
}

// ============================================================================
// Context
// ============================================================================

interface AuthContextValue extends AuthState {
  // Phone auth methods
  sendVerificationCode: (phoneNumber: string) => Promise<void>;
  confirmCode: (code: string) => Promise<void>;
  phoneAuthState: PhoneAuthState;
  resetPhoneAuth: () => void;

  // Session tracking
  signOut: () => Promise<void>;
  recordSession: (focusTime: number, coinsEarned: number) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ============================================================================
// Provider
// ============================================================================

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Auth state
  const [user, setUser] = useState<FirebaseAuthTypes.User | null>(null);
  const [userDoc, setUserDoc] = useState<UserDoc | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Phone auth flow state
  const [phoneAuthState, setPhoneAuthState] = useState<PhoneAuthState>({
    step: "idle",
    verificationId: null,
    error: null,
  });

  // Store confirmation for code verification
  const confirmationRef = useRef<FirebaseAuthTypes.ConfirmationResult | null>(
    null
  );

  // User doc subscription cleanup
  const unsubscribeUserRef = useRef<(() => void) | null>(null);

  // --------------------------------------------------------------------------
  // Auth state listener - handles persistence automatically
  // Firebase caches auth state, so user stays logged in across app restarts
  // --------------------------------------------------------------------------
  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged(async (firebaseUser) => {
      console.log(
        "[Auth] State changed:",
        firebaseUser ? firebaseUser.uid : "null"
      );

      setUser(firebaseUser);

      // Clean up previous user subscription
      if (unsubscribeUserRef.current) {
        unsubscribeUserRef.current();
        unsubscribeUserRef.current = null;
      }

      if (firebaseUser) {
        // Subscribe to user document for real-time updates
        unsubscribeUserRef.current = userService.subscribeToUser(
          firebaseUser.uid,
          (doc) => {
            setUserDoc(doc);
            setIsLoading(false);
          }
        );
      } else {
        setUserDoc(null);
        setIsLoading(false);
      }
    });

    return () => {
      unsubscribe();
      if (unsubscribeUserRef.current) {
        unsubscribeUserRef.current();
      }
    };
  }, []);

  // --------------------------------------------------------------------------
  // Phone Auth: Send verification code
  // --------------------------------------------------------------------------
  const sendVerificationCode = useCallback(async (phoneNumber: string) => {
    try {
      setPhoneAuthState({
        step: "sending",
        verificationId: null,
        error: null,
      });

      console.log("[Auth] Sending verification code to:", phoneNumber);
      console.log("[Auth] Test mode enabled:", auth().settings.appVerificationDisabledForTesting);
      
      const confirmation = await auth().signInWithPhoneNumber(phoneNumber);
      console.log("[Auth] Confirmation received:", confirmation.verificationId ? "YES" : "NO");
      
      confirmationRef.current = confirmation;

      console.log("[Auth] Setting state to 'verifying'...");
      setPhoneAuthState({
        step: "verifying",
        verificationId: confirmation.verificationId,
        error: null,
      });
      console.log("[Auth] State set to 'verifying' - UI should update now");
    } catch (error) {
      console.error("[Auth] Send code error:", error);
      setPhoneAuthState({
        step: "error",
        verificationId: null,
        error:
          error instanceof Error ? error.message : "Failed to send code",
      });
    }
  }, []);

  // --------------------------------------------------------------------------
  // Phone Auth: Confirm verification code
  // --------------------------------------------------------------------------
  const confirmCode = useCallback(async (code: string) => {
    if (!confirmationRef.current) {
      setPhoneAuthState((prev) => ({
        ...prev,
        step: "error",
        error: "No verification in progress",
      }));
      return;
    }

    try {
      setPhoneAuthState((prev) => ({ ...prev, step: "verifying" }));

      const result = await confirmationRef.current.confirm(code);

      // Create or get user document
      if (result?.user) {
        await userService.getOrCreateUser(
          result.user.uid,
          result.user.phoneNumber || ""
        );
      }

      // Reset phone auth state on success
      setPhoneAuthState({
        step: "idle",
        verificationId: null,
        error: null,
      });
      confirmationRef.current = null;
    } catch (error) {
      console.error("[Auth] Confirm code error:", error);
      setPhoneAuthState({
        step: "error",
        verificationId: phoneAuthState.verificationId,
        error:
          error instanceof Error ? error.message : "Invalid verification code",
      });
    }
  }, [phoneAuthState.verificationId]);

  // --------------------------------------------------------------------------
  // Reset phone auth state (e.g., to start over)
  // --------------------------------------------------------------------------
  const resetPhoneAuth = useCallback(() => {
    confirmationRef.current = null;
    setPhoneAuthState({
      step: "idle",
      verificationId: null,
      error: null,
    });
  }, []);

  // --------------------------------------------------------------------------
  // Sign out
  // --------------------------------------------------------------------------
  const signOut = useCallback(async () => {
    try {
      await auth().signOut();
      setUserDoc(null);
    } catch (error) {
      console.error("[Auth] Sign out error:", error);
    }
  }, []);

  // --------------------------------------------------------------------------
  // Record session (convenience wrapper)
  // --------------------------------------------------------------------------
  const recordSession = useCallback(
    async (focusTime: number, coinsEarned: number) => {
      if (!user) return;
      await userService.recordSession(user.uid, focusTime, coinsEarned);
    },
    [user]
  );

  // --------------------------------------------------------------------------
  // Context value
  // --------------------------------------------------------------------------
  const value: AuthContextValue = {
    user,
    userDoc,
    isLoading,
    isAuthenticated: !!user,
    phoneAuthState,
    sendVerificationCode,
    confirmCode,
    resetPhoneAuth,
    signOut,
    recordSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ============================================================================
// Hook
// ============================================================================

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

