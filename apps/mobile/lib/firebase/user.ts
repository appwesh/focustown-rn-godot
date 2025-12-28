import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  increment,
  collection,
} from "firebase/firestore";
import { db } from "./config";
import type { UserDoc } from "./types";

// Collection reference
const usersCollection = collection(db, "users");

/**
 * User service for Firestore operations.
 * Uses Firebase JS SDK (not native) for compatibility with New Architecture.
 *
 * Design decisions for Firebase best practices:
 * - Flat document structure (no nested subcollections for simple user data)
 * - Unix timestamps instead of Firestore timestamps (simpler querying, no timezone issues)
 * - Atomic updates using increment() for counters
 * - All writes go through this service for consistency
 */
export const userService = {
  /**
   * Get or create a user document.
   * Called after successful phone auth.
   */
  async getOrCreateUser(uid: string, phoneNumber: string): Promise<UserDoc> {
    const docRef = doc(usersCollection, uid);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      // Update last active timestamp
      await updateDoc(docRef, {
        lastActiveAt: Date.now(),
      });
      return docSnap.data() as UserDoc;
    }

    // Create new user
    const newUser: UserDoc = {
      uid,
      phoneNumber,
      createdAt: Date.now(),
      displayName: null,
      totalCoins: 0,
      totalFocusTime: 0,
      sessionsCompleted: 0,
      lastActiveAt: Date.now(),
    };

    await setDoc(docRef, newUser);
    return newUser;
  },

  /**
   * Get user document by uid.
   */
  async getUser(uid: string): Promise<UserDoc | null> {
    const docRef = doc(usersCollection, uid);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? (docSnap.data() as UserDoc) : null;
  },

  /**
   * Update user profile fields.
   */
  async updateProfile(
    uid: string,
    updates: Pick<Partial<UserDoc>, "displayName">
  ): Promise<void> {
    const docRef = doc(usersCollection, uid);
    await updateDoc(docRef, {
      ...updates,
      lastActiveAt: Date.now(),
    });
  },

  /**
   * Record a completed focus session.
   * Uses atomic increments to avoid race conditions.
   */
  async recordSession(
    uid: string,
    focusTime: number,
    coinsEarned: number
  ): Promise<void> {
    const docRef = doc(usersCollection, uid);
    await updateDoc(docRef, {
      totalCoins: increment(coinsEarned),
      totalFocusTime: increment(focusTime),
      sessionsCompleted: increment(1),
      lastActiveAt: Date.now(),
    });
  },

  /**
   * Subscribe to user document changes.
   * Returns unsubscribe function.
   */
  subscribeToUser(
    uid: string,
    onUpdate: (user: UserDoc | null) => void
  ): () => void {
    const docRef = doc(usersCollection, uid);
    return onSnapshot(
      docRef,
      (docSnap) => {
        onUpdate(docSnap.exists() ? (docSnap.data() as UserDoc) : null);
      },
      (error) => {
        console.error("[Firebase] User subscription error:", error);
        onUpdate(null);
      }
    );
  },
};
