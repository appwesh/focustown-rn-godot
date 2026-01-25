import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  increment,
  collection,
  arrayUnion,
} from "firebase/firestore";
import { db } from "./config";
import type { UserDoc, CharacterSkin } from "./types";

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

    // Create new user with all fields
    const newUser: UserDoc = {
      uid,
      phoneNumber,
      createdAt: Date.now(),
      displayName: null,
      username: null,
      avatarUrl: null,
      characterSkin: null,
      ownedItems: [],
      wishlistItem: null,
      totalCoins: 0,
      totalFocusTime: 0,
      sessionsCompleted: 0,
      currentStreak: 0,
      longestStreak: 0,
      friendCount: 0,
      expoPushToken: null,
      tokenUpdatedAt: null,
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
    updates: Pick<Partial<UserDoc>, "displayName" | "username" | "avatarUrl">
  ): Promise<void> {
    const docRef = doc(usersCollection, uid);
    await updateDoc(docRef, {
      ...updates,
      lastActiveAt: Date.now(),
    });
  },

  /**
   * Update user's character skin/appearance.
   */
  async updateCharacterSkin(uid: string, characterSkin: CharacterSkin): Promise<void> {
    const docRef = doc(usersCollection, uid);
    await updateDoc(docRef, {
      characterSkin,
      lastActiveAt: Date.now(),
    });
  },

  /**
   * Purchase an item from the store.
   * Deducts coins and adds item to owned items.
   * Also clears wishlist if the purchased item was wishlisted.
   * @param additionalItemIds - Additional items to grant (e.g., individual items from outfit set)
   */
  async purchaseItem(uid: string, itemId: string, price: number, additionalItemIds?: string[]): Promise<void> {
    const docRef = doc(usersCollection, uid);
    // Get current wishlist to check if we need to clear it
    const docSnap = await getDoc(docRef);
    const userData = docSnap.data() as UserDoc;
    
    // Collect all items to add (main item + any additional items)
    const allItemIds = [itemId, ...(additionalItemIds ?? [])];
    
    const updates: Record<string, unknown> = {
      totalCoins: increment(-price),
      ownedItems: arrayUnion(...allItemIds),
      lastActiveAt: Date.now(),
    };
    
    // Clear wishlist if this item was wishlisted
    if (userData?.wishlistItem === itemId) {
      updates.wishlistItem = null;
    }
    
    await updateDoc(docRef, updates);
  },

  /**
   * Set wishlist item (only one item at a time).
   */
  async setWishlistItem(uid: string, itemId: string | null): Promise<void> {
    const docRef = doc(usersCollection, uid);
    await updateDoc(docRef, {
      wishlistItem: itemId,
      lastActiveAt: Date.now(),
    });
  },

  /**
   * Search for a user by exact username (for friend request)
   */
  async findByUsername(username: string): Promise<UserDoc | null> {
    const { query: firestoreQuery, where, getDocs } = await import("firebase/firestore");
    const q = firestoreQuery(
      usersCollection, 
      where("username", "==", username.toLowerCase())
    );
    const snap = await getDocs(q);
    return snap.empty ? null : (snap.docs[0].data() as UserDoc);
  },

  /**
   * Search users by username prefix (for live search)
   * Returns up to 10 results
   */
  async searchUsers(query: string, currentUserId: string): Promise<UserDoc[]> {
    if (!query.trim()) return [];
    
    const { query: firestoreQuery, where, getDocs, orderBy, limit } = await import("firebase/firestore");
    const searchTerm = query.toLowerCase().trim();
    
    // Search by username prefix
    const q = firestoreQuery(
      usersCollection,
      where("username", ">=", searchTerm),
      where("username", "<=", searchTerm + "\uf8ff"),
      orderBy("username"),
      limit(10)
    );
    
    const snap = await getDocs(q);
    
    // Filter out current user
    return snap.docs
      .map(doc => doc.data() as UserDoc)
      .filter(user => user.uid !== currentUserId);
  },

  /**
   * Find users by phone numbers (for contact book matching)
   * Returns users who have registered with these phone numbers
   */
  async findByPhoneNumbers(phoneNumbers: string[], currentUserId: string): Promise<UserDoc[]> {
    if (phoneNumbers.length === 0) return [];
    
    const { query: firestoreQuery, where, getDocs } = await import("firebase/firestore");
    
    // Firestore 'in' queries are limited to 30 items
    const results: UserDoc[] = [];
    const chunks = [];
    for (let i = 0; i < phoneNumbers.length; i += 30) {
      chunks.push(phoneNumbers.slice(i, i + 30));
    }
    
    for (const chunk of chunks) {
      const q = firestoreQuery(
        usersCollection,
        where("phoneNumber", "in", chunk)
      );
      const snap = await getDocs(q);
      results.push(...snap.docs.map(doc => doc.data() as UserDoc));
    }
    
    // Filter out current user
    return results.filter(user => user.uid !== currentUserId);
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
