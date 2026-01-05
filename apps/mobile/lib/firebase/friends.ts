/**
 * Friends service for Firestore operations
 *
 * Uses composite document IDs: min(uidA, uidB)_max(uidA, uidB)
 * This ensures one document per friendship pair and prevents duplicates.
 */

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
  increment,
} from "firebase/firestore";
import { db } from "./config";
import type {
  FriendshipDoc,
  FriendshipStatus,
  FriendInfo,
  UserDoc,
  SessionDoc,
} from "./types";

// Collection references
const friendshipsCollection = collection(db, "friendships");
const usersCollection = collection(db, "users");
const sessionsCollection = collection(db, "sessions");

/**
 * Generate composite friendship document ID
 * Always orders UIDs consistently to prevent duplicates
 */
function getFriendshipId(uid1: string, uid2: string): string {
  return uid1 < uid2 ? `${uid1}_${uid2}` : `${uid2}_${uid1}`;
}

/**
 * Friends service
 */
export const friendsService = {
  // ==========================================================================
  // Friend Requests
  // ==========================================================================

  /**
   * Send a friend request
   */
  async sendRequest(fromUid: string, toUid: string): Promise<void> {
    if (fromUid === toUid) {
      throw new Error("Cannot send friend request to yourself");
    }

    const friendshipId = getFriendshipId(fromUid, toUid);
    const docRef = doc(friendshipsCollection, friendshipId);

    // Check if friendship already exists
    const existing = await getDoc(docRef);
    if (existing.exists()) {
      const data = existing.data() as FriendshipDoc;
      if (data.status === "accepted") {
        throw new Error("Already friends");
      }
      if (data.status === "pending") {
        throw new Error("Friend request already pending");
      }
      if (data.status === "blocked") {
        throw new Error("Cannot send request");
      }
    }

    const friendship: FriendshipDoc = {
      users: fromUid < toUid ? [fromUid, toUid] : [toUid, fromUid],
      status: "pending",
      requesterId: fromUid,
      createdAt: Date.now(),
      acceptedAt: null,
    };

    await setDoc(docRef, friendship);
    console.log("[Friends] Sent request:", friendshipId);
  },

  /**
   * Accept a friend request
   * Also increments friendCount on both users
   */
  async acceptRequest(friendshipId: string, acceptingUid: string): Promise<void> {
    const docRef = doc(friendshipsCollection, friendshipId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      throw new Error("Friend request not found");
    }

    const friendship = docSnap.data() as FriendshipDoc;

    // Verify the accepting user is not the requester
    if (friendship.requesterId === acceptingUid) {
      throw new Error("Cannot accept your own request");
    }

    // Verify user is part of this friendship
    if (!friendship.users.includes(acceptingUid)) {
      throw new Error("Not authorized");
    }

    const now = Date.now();

    // Update friendship status
    await updateDoc(docRef, {
      status: "accepted" as FriendshipStatus,
      acceptedAt: now,
    });

    // Increment friend count on both users
    const [uid1, uid2] = friendship.users;
    await updateDoc(doc(usersCollection, uid1), {
      friendCount: increment(1),
    });
    await updateDoc(doc(usersCollection, uid2), {
      friendCount: increment(1),
    });

    console.log("[Friends] Accepted request:", friendshipId);
  },

  /**
   * Decline/cancel a friend request
   */
  async declineRequest(friendshipId: string, userId: string): Promise<void> {
    const docRef = doc(friendshipsCollection, friendshipId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      throw new Error("Friend request not found");
    }

    const friendship = docSnap.data() as FriendshipDoc;

    // Verify user is part of this friendship
    if (!friendship.users.includes(userId)) {
      throw new Error("Not authorized");
    }

    // Only allow declining pending requests
    if (friendship.status !== "pending") {
      throw new Error("Can only decline pending requests");
    }

    await deleteDoc(docRef);
    console.log("[Friends] Declined request:", friendshipId);
  },

  /**
   * Remove a friend
   * Also decrements friendCount on both users
   */
  async removeFriend(uid1: string, uid2: string): Promise<void> {
    const friendshipId = getFriendshipId(uid1, uid2);
    const docRef = doc(friendshipsCollection, friendshipId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      throw new Error("Friendship not found");
    }

    const friendship = docSnap.data() as FriendshipDoc;

    if (friendship.status !== "accepted") {
      throw new Error("Not friends");
    }

    // Delete friendship
    await deleteDoc(docRef);

    // Decrement friend count on both users
    await updateDoc(doc(usersCollection, uid1), {
      friendCount: increment(-1),
    });
    await updateDoc(doc(usersCollection, uid2), {
      friendCount: increment(-1),
    });

    console.log("[Friends] Removed friend:", friendshipId);
  },

  /**
   * Block a user
   */
  async blockUser(blockingUid: string, blockedUid: string): Promise<void> {
    const friendshipId = getFriendshipId(blockingUid, blockedUid);
    const docRef = doc(friendshipsCollection, friendshipId);
    const docSnap = await getDoc(docRef);

    const now = Date.now();

    if (docSnap.exists()) {
      const friendship = docSnap.data() as FriendshipDoc;

      // If they were friends, decrement counts
      if (friendship.status === "accepted") {
        await updateDoc(doc(usersCollection, blockingUid), {
          friendCount: increment(-1),
        });
        await updateDoc(doc(usersCollection, blockedUid), {
          friendCount: increment(-1),
        });
      }

      await updateDoc(docRef, {
        status: "blocked" as FriendshipStatus,
        requesterId: blockingUid, // Track who blocked
      });
    } else {
      // Create blocked relationship
      const friendship: FriendshipDoc = {
        users:
          blockingUid < blockedUid
            ? [blockingUid, blockedUid]
            : [blockedUid, blockingUid],
        status: "blocked",
        requesterId: blockingUid,
        createdAt: now,
        acceptedAt: null,
      };
      await setDoc(docRef, friendship);
    }

    console.log("[Friends] Blocked user:", blockedUid);
  },

  // ==========================================================================
  // Queries
  // ==========================================================================

  /**
   * Check if two users are friends
   */
  async areFriends(uid1: string, uid2: string): Promise<boolean> {
    const friendshipId = getFriendshipId(uid1, uid2);
    const docRef = doc(friendshipsCollection, friendshipId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) return false;
    return (docSnap.data() as FriendshipDoc).status === "accepted";
  },

  /**
   * Get friendship status between two users
   */
  async getFriendshipStatus(
    uid1: string,
    uid2: string
  ): Promise<{ status: FriendshipStatus | null; requesterId: string | null }> {
    const friendshipId = getFriendshipId(uid1, uid2);
    const docRef = doc(friendshipsCollection, friendshipId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return { status: null, requesterId: null };
    }

    const data = docSnap.data() as FriendshipDoc;
    return { status: data.status, requesterId: data.requesterId };
  },

  /**
   * Get user's friends list with their info
   */
  async getFriends(uid: string): Promise<FriendInfo[]> {
    // Query friendships where user is a participant and status is accepted
    const q = query(
      friendshipsCollection,
      where("users", "array-contains", uid),
      where("status", "==", "accepted")
    );

    const snap = await getDocs(q);
    const friendships = snap.docs.map((doc) => doc.data() as FriendshipDoc);

    // Get friend UIDs (the other user in each friendship)
    const friendUids = friendships.map((f) =>
      f.users[0] === uid ? f.users[1] : f.users[0]
    );

    // Fetch friend user docs
    const friends: FriendInfo[] = [];

    for (const friendUid of friendUids) {
      const userDoc = await getDoc(doc(usersCollection, friendUid));
      if (userDoc.exists()) {
        const user = userDoc.data() as UserDoc;

        // Check if friend has active session
        const sessionQuery = query(
          sessionsCollection,
          where("odId", "==", friendUid),
          where("status", "==", "active")
        );
        const sessionSnap = await getDocs(sessionQuery);
        const activeSession = sessionSnap.empty
          ? null
          : (sessionSnap.docs[0].data() as SessionDoc);

        friends.push({
          odId: friendUid,
          displayName: user.displayName,
          username: user.username,
          avatarUrl: user.avatarUrl,
          isOnline: !!activeSession,
          currentSession: activeSession
            ? {
                buildingName: activeSession.buildingName,
                remainingSeconds: activeSession.remainingSeconds,
              }
            : null,
        });
      }
    }

    return friends;
  },

  /**
   * Get pending friend requests received
   */
  async getPendingRequests(uid: string): Promise<
    Array<{
      friendshipId: string;
      from: FriendInfo;
      createdAt: number;
    }>
  > {
    const q = query(
      friendshipsCollection,
      where("users", "array-contains", uid),
      where("status", "==", "pending")
    );

    const snap = await getDocs(q);
    const pending: Array<{
      friendshipId: string;
      from: FriendInfo;
      createdAt: number;
    }> = [];

    for (const docSnap of snap.docs) {
      const friendship = docSnap.data() as FriendshipDoc;

      // Only include requests sent TO this user (not from)
      if (friendship.requesterId === uid) continue;

      const fromUid = friendship.requesterId;
      const userDocSnap = await getDoc(doc(usersCollection, fromUid));

      if (userDocSnap.exists()) {
        const user = userDocSnap.data() as UserDoc;
        pending.push({
          friendshipId: docSnap.id,
          from: {
            odId: fromUid,
            displayName: user.displayName,
            username: user.username,
            avatarUrl: user.avatarUrl,
          },
          createdAt: friendship.createdAt,
        });
      }
    }

    return pending;
  },

  /**
   * Subscribe to friend list changes (real-time)
   */
  subscribeToFriends(
    uid: string,
    onUpdate: (friends: FriendInfo[]) => void
  ): () => void {
    const q = query(
      friendshipsCollection,
      where("users", "array-contains", uid),
      where("status", "==", "accepted")
    );

    return onSnapshot(
      q,
      async (snap) => {
        const friendships = snap.docs.map((doc) => doc.data() as FriendshipDoc);
        const friendUids = friendships.map((f) =>
          f.users[0] === uid ? f.users[1] : f.users[0]
        );

        const friends: FriendInfo[] = [];
        for (const friendUid of friendUids) {
          const userDoc = await getDoc(doc(usersCollection, friendUid));
          if (userDoc.exists()) {
            const user = userDoc.data() as UserDoc;
            friends.push({
              odId: friendUid,
              displayName: user.displayName,
              username: user.username,
              avatarUrl: user.avatarUrl,
            });
          }
        }

        onUpdate(friends);
      },
      (error) => {
        console.error("[Friends] Subscription error:", error);
        onUpdate([]);
      }
    );
  },

  /**
   * Subscribe to pending requests (real-time)
   */
  subscribeToPendingRequests(
    uid: string,
    onUpdate: (count: number) => void
  ): () => void {
    const q = query(
      friendshipsCollection,
      where("users", "array-contains", uid),
      where("status", "==", "pending")
    );

    return onSnapshot(
      q,
      (snap) => {
        // Count requests where user is NOT the requester
        const pendingCount = snap.docs.filter(
          (doc) => (doc.data() as FriendshipDoc).requesterId !== uid
        ).length;
        onUpdate(pendingCount);
      },
      (error) => {
        console.error("[Friends] Pending subscription error:", error);
        onUpdate(0);
      }
    );
  },
};

