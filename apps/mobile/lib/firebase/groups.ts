/**
 * Group Sessions service for Firestore operations
 *
 * Handles:
 * - Creating group sessions
 * - Inviting friends
 * - Starting/completing group sessions
 * - Participant management
 */

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  deleteField,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  onSnapshot,
  addDoc,
  arrayUnion,
  increment,
} from "firebase/firestore";
import { db } from "./config";
import type {
  GroupSessionDoc,
  GroupSessionStatus,
  GroupInviteDoc,
  InviteStatus,
  CreateGroupSessionInput,
  UserDoc,
} from "./types";

// Collection references
const groupSessionsCollection = collection(db, "groupSessions");
const groupInvitesCollection = collection(db, "groupInvites");
const usersCollection = collection(db, "users");

/** Invite expiration time (24 hours) */
const INVITE_EXPIRY_MS = 24 * 60 * 60 * 1000;

/** Max group size */
const MAX_GROUP_SIZE = 20;

/**
 * Group Sessions service
 */
export const groupsService = {
  // ==========================================================================
  // Group Session Management
  // ==========================================================================

  /**
   * Create a new group session (pending state)
   * Host can then invite friends before starting
   */
  async createGroupSession(input: CreateGroupSessionInput): Promise<string> {
    const now = Date.now();

    const groupData: Omit<GroupSessionDoc, "id"> = {
      hostId: input.hostId,
      hostName: input.hostName,
      buildingId: input.buildingId,
      buildingName: input.buildingName,
      plannedDuration: input.plannedDuration,
      workType: input.workType,
      deepFocusMode: input.deepFocusMode,
      participantIds: [input.hostId], // Host is first participant
      participantCount: 1,
      status: "pending",
      startedAt: null,
      endedAt: null,
      createdAt: now,
    };

    const docRef = await addDoc(groupSessionsCollection, groupData);
    await updateDoc(docRef, { id: docRef.id });

    console.log("[Groups] Created group session:", docRef.id);
    return docRef.id;
  },

  /**
   * Get group session by ID
   */
  async getGroupSession(groupId: string): Promise<GroupSessionDoc | null> {
    const docRef = doc(groupSessionsCollection, groupId);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? (docSnap.data() as GroupSessionDoc) : null;
  },

  /**
   * Start a group session
   * Sets startedAt so all participants can sync their timers
   */
  async startGroupSession(groupId: string, hostId: string): Promise<void> {
    const group = await this.getGroupSession(groupId);
    if (!group) throw new Error("Group session not found");
    if (group.hostId !== hostId) throw new Error("Only host can start session");
    if (group.status !== "pending")
      throw new Error("Session already started or completed");

    const now = Date.now();

    await updateDoc(doc(groupSessionsCollection, groupId), {
      status: "active" as GroupSessionStatus,
      startedAt: now,
    });

    // Decline all pending invites (session started)
    const invitesQuery = query(
      groupInvitesCollection,
      where("groupId", "==", groupId),
      where("status", "==", "pending")
    );
    const invitesSnap = await getDocs(invitesQuery);
    for (const inviteDoc of invitesSnap.docs) {
      await updateDoc(inviteDoc.ref, {
        status: "declined" as InviteStatus,
        respondedAt: now,
      });
    }

    console.log("[Groups] Started group session:", groupId);
  },

  /**
   * Complete a group session
   */
  async completeGroupSession(groupId: string): Promise<void> {
    const group = await this.getGroupSession(groupId);
    if (!group) throw new Error("Group session not found");
    if (group.status !== "active") throw new Error("Session not active");

    await updateDoc(doc(groupSessionsCollection, groupId), {
      status: "completed" as GroupSessionStatus,
      endedAt: Date.now(),
    });

    console.log("[Groups] Completed group session:", groupId);
  },

  /**
   * Cancel a group session (host only)
   */
  async cancelGroupSession(groupId: string, hostId: string): Promise<void> {
    const group = await this.getGroupSession(groupId);
    if (!group) throw new Error("Group session not found");
    if (group.hostId !== hostId)
      throw new Error("Only host can cancel session");

    const now = Date.now();

    await updateDoc(doc(groupSessionsCollection, groupId), {
      status: "cancelled" as GroupSessionStatus,
      endedAt: now,
    });

    // Cancel all pending invites
    const invitesQuery = query(
      groupInvitesCollection,
      where("groupId", "==", groupId),
      where("status", "==", "pending")
    );
    const invitesSnap = await getDocs(invitesQuery);
    for (const inviteDoc of invitesSnap.docs) {
      await deleteDoc(inviteDoc.ref);
    }

    console.log("[Groups] Cancelled group session:", groupId);
  },

  /**
   * Leave a group session (participant)
   */
  async leaveGroupSession(groupId: string, odId: string): Promise<void> {
    const group = await this.getGroupSession(groupId);
    if (!group) throw new Error("Group session not found");
    if (!group.participantIds.includes(odId))
      throw new Error("Not a participant");
    if (group.hostId === odId)
      throw new Error("Host cannot leave - cancel session instead");

    // Remove from participants
    const newParticipants = group.participantIds.filter((id) => id !== odId);

    await updateDoc(doc(groupSessionsCollection, groupId), {
      participantIds: newParticipants,
      participantCount: increment(-1),
    });

    console.log("[Groups] User left group session:", odId, groupId);
  },

  // ==========================================================================
  // Invites
  // ==========================================================================

  /**
   * Invite a friend to a group session
   */
  async inviteFriend(
    groupId: string,
    hostId: string,
    hostName: string,
    friendId: string
  ): Promise<void> {
    const group = await this.getGroupSession(groupId);
    if (!group) throw new Error("Group session not found");
    if (group.hostId !== hostId) throw new Error("Only host can invite");
    if (group.status !== "pending")
      throw new Error("Cannot invite after session started");
    if (group.participantCount >= MAX_GROUP_SIZE)
      throw new Error("Group is full");
    if (group.participantIds.includes(friendId))
      throw new Error("Already in group");

    const inviteId = `${friendId}_${groupId}`;
    const docRef = doc(groupInvitesCollection, inviteId);

    // Check if invite already exists
    const existing = await getDoc(docRef);
    if (existing.exists()) {
      const data = existing.data() as GroupInviteDoc;
      if (data.status === "pending") throw new Error("Already invited");
      if (data.status === "accepted") throw new Error("Already joined");
    }

    const now = Date.now();
    const invite: GroupInviteDoc = {
      odId: friendId,
      groupId,
      hostId,
      hostName,
      status: "pending",
      invitedAt: now,
      respondedAt: null,
      expiresAt: now + INVITE_EXPIRY_MS,
    };

    await setDoc(docRef, invite);
    console.log("[Groups] Sent invite:", inviteId);
  },

  /**
   * Accept an invite
   */
  async acceptInvite(inviteId: string, odId: string): Promise<void> {
    const docRef = doc(groupInvitesCollection, inviteId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) throw new Error("Invite not found");

    const invite = docSnap.data() as GroupInviteDoc;
    if (invite.odId !== odId) throw new Error("Not your invite");
    if (invite.status !== "pending") throw new Error("Invite already handled");
    if (invite.expiresAt < Date.now()) throw new Error("Invite expired");

    const group = await this.getGroupSession(invite.groupId);
    if (!group) throw new Error("Group session no longer exists");
    if (group.status !== "pending")
      throw new Error("Group session already started");
    if (group.participantCount >= MAX_GROUP_SIZE)
      throw new Error("Group is full");

    const now = Date.now();

    // Update invite status
    await updateDoc(docRef, {
      status: "accepted" as InviteStatus,
      respondedAt: now,
    });

    // Add to group participants
    await updateDoc(doc(groupSessionsCollection, invite.groupId), {
      participantIds: arrayUnion(odId),
      participantCount: increment(1),
    });

    console.log("[Groups] Accepted invite:", inviteId);
  },

  /**
   * Decline an invite
   */
  async declineInvite(inviteId: string, odId: string): Promise<void> {
    const docRef = doc(groupInvitesCollection, inviteId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) throw new Error("Invite not found");

    const invite = docSnap.data() as GroupInviteDoc;
    if (invite.odId !== odId) throw new Error("Not your invite");
    if (invite.status !== "pending") throw new Error("Invite already handled");

    await updateDoc(docRef, {
      status: "declined" as InviteStatus,
      respondedAt: Date.now(),
    });

    console.log("[Groups] Declined invite:", inviteId);
  },

  /**
   * Cancel an invite (host only)
   */
  async cancelInvite(inviteId: string, hostId: string): Promise<void> {
    const docRef = doc(groupInvitesCollection, inviteId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) throw new Error("Invite not found");

    const invite = docSnap.data() as GroupInviteDoc;
    if (invite.hostId !== hostId) throw new Error("Not your invite");

    await deleteDoc(docRef);
    console.log("[Groups] Cancelled invite:", inviteId);
  },

  // ==========================================================================
  // Queries
  // ==========================================================================

  /**
   * Get pending invites for a user
   */
  async getPendingInvites(odId: string): Promise<
    Array<{
      inviteId: string;
      invite: GroupInviteDoc;
      group: GroupSessionDoc;
    }>
  > {
    const q = query(
      groupInvitesCollection,
      where("odId", "==", odId),
      where("status", "==", "pending"),
      orderBy("invitedAt", "desc")
    );

    const snap = await getDocs(q);
    const results: Array<{
      inviteId: string;
      invite: GroupInviteDoc;
      group: GroupSessionDoc;
    }> = [];

    for (const inviteDoc of snap.docs) {
      const invite = inviteDoc.data() as GroupInviteDoc;

      // Skip expired
      if (invite.expiresAt < Date.now()) continue;

      const group = await this.getGroupSession(invite.groupId);
      if (group && group.status === "pending") {
        results.push({
          inviteId: inviteDoc.id,
          invite,
          group,
        });
      }
    }

    return results;
  },

  /**
   * Get group sessions user is part of
   */
  async getUserGroups(
    odId: string,
    status?: GroupSessionStatus
  ): Promise<GroupSessionDoc[]> {
    let q = query(
      groupSessionsCollection,
      where("participantIds", "array-contains", odId),
      orderBy("createdAt", "desc"),
      limit(20)
    );

    if (status) {
      q = query(
        groupSessionsCollection,
        where("participantIds", "array-contains", odId),
        where("status", "==", status),
        orderBy("createdAt", "desc"),
        limit(20)
      );
    }

    const snap = await getDocs(q);
    return snap.docs.map((doc) => doc.data() as GroupSessionDoc);
  },

  /**
   * Get participants info for a group
   */
  async getParticipantsInfo(
    groupId: string
  ): Promise<Array<{ odId: string; displayName: string | null; avatarUrl: string | null }>> {
    const group = await this.getGroupSession(groupId);
    if (!group) return [];

    const participants: Array<{
      odId: string;
      displayName: string | null;
      avatarUrl: string | null;
    }> = [];

    for (const odId of group.participantIds) {
      const userDoc = await getDoc(doc(usersCollection, odId));
      if (userDoc.exists()) {
        const user = userDoc.data() as UserDoc;
        participants.push({
          odId,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
        });
      }
    }

    return participants;
  },

  /**
   * Subscribe to a group session (real-time updates)
   */
  subscribeToGroupSession(
    groupId: string,
    onUpdate: (group: GroupSessionDoc | null) => void
  ): () => void {
    const docRef = doc(groupSessionsCollection, groupId);

    return onSnapshot(
      docRef,
      (docSnap) => {
        onUpdate(docSnap.exists() ? (docSnap.data() as GroupSessionDoc) : null);
      },
      (error) => {
        console.error("[Groups] Subscription error:", error);
        onUpdate(null);
      }
    );
  },

  /**
   * Subscribe to pending invites count (for notification badge)
   */
  subscribeToPendingInvitesCount(
    odId: string,
    onUpdate: (count: number) => void
  ): () => void {
    const q = query(
      groupInvitesCollection,
      where("odId", "==", odId),
      where("status", "==", "pending")
    );

    return onSnapshot(
      q,
      (snap) => {
        // Filter out expired invites
        const validCount = snap.docs.filter(
          (doc) => (doc.data() as GroupInviteDoc).expiresAt > Date.now()
        ).length;
        onUpdate(validCount);
      },
      (error) => {
        console.error("[Groups] Invites subscription error:", error);
        onUpdate(0);
      }
    );
  },

  // ==========================================================================
  // Participant State (for multiplayer sync - simplified, state-based only)
  // ==========================================================================

  /**
   * Update a participant's state (entrance or seated)
   * When seated, also claims the spot
   */
  async updateParticipantState(
    groupId: string,
    odId: string,
    displayName: string,
    state: "entrance" | "seated",
    spotId: string | null
  ): Promise<void> {
    const docRef = doc(groupSessionsCollection, groupId);

    const updates: Record<string, unknown> = {
      [`participantStates.${odId}`]: {
        displayName,
        state,
        spotId,
      },
    };

    // Handle seat occupancy
    if (state === "seated" && spotId) {
      // Claim the spot
      updates[`occupiedSpots.${spotId}`] = odId;
    }

    await updateDoc(docRef, updates);
    console.log("[Groups] Updated participant state:", odId, state, spotId);
  },

  /**
   * Check if a spot is occupied
   */
  async isSpotOccupied(groupId: string, spotId: string): Promise<boolean> {
    const docRef = doc(groupSessionsCollection, groupId);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return false;
    
    const data = docSnap.data() as GroupSessionDoc;
    return data.occupiedSpots?.[spotId] !== undefined;
  },

  /**
   * Get who occupies a spot (or null if empty)
   */
  async getSpotOccupant(groupId: string, spotId: string): Promise<string | null> {
    const docRef = doc(groupSessionsCollection, groupId);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return null;
    
    const data = docSnap.data() as GroupSessionDoc;
    return data.occupiedSpots?.[spotId] ?? null;
  },

  /**
   * Release a participant's spot when they leave
   */
  async releaseSpot(groupId: string, odId: string, spotId: string): Promise<void> {
    const docRef = doc(groupSessionsCollection, groupId);
    
    // Only release if this user owns the spot
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return;
    
    const data = docSnap.data() as GroupSessionDoc;
    if (data.occupiedSpots?.[spotId] === odId) {
      await updateDoc(docRef, {
        [`occupiedSpots.${spotId}`]: deleteField(),
      });
      console.log("[Groups] Released spot:", spotId, "by", odId);
    }
  },

  /**
   * Remove a participant's state when they leave
   * Also releases their spot if they had one
   */
  async removeParticipantState(groupId: string, odId: string): Promise<void> {
    const docRef = doc(groupSessionsCollection, groupId);
    
    // First get current state to find their spot
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return;
    
    const data = docSnap.data() as GroupSessionDoc;
    const updates: Record<string, unknown> = {
      [`participantStates.${odId}`]: deleteField(),
    };
    
    // Release their spot if they had one
    const participantState = data.participantStates?.[odId];
    if (participantState?.spotId && data.occupiedSpots?.[participantState.spotId] === odId) {
      updates[`occupiedSpots.${participantState.spotId}`] = deleteField();
    }

    await updateDoc(docRef, updates);
    console.log("[Groups] Removed participant state:", odId);
  },

  /**
   * Check if all participants are seated
   */
  async areAllParticipantsSeated(groupId: string): Promise<boolean> {
    const docRef = doc(groupSessionsCollection, groupId);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return false;
    
    const data = docSnap.data() as GroupSessionDoc;
    const { participantIds, participantStates } = data;
    
    if (!participantStates) return false;
    
    // Check if all participants have state 'seated'
    return participantIds.every(id => participantStates[id]?.state === 'seated');
  },

  /**
   * Fail a group session (when someone cancels early)
   */
  async failGroupSession(groupId: string): Promise<void> {
    const docRef = doc(groupSessionsCollection, groupId);
    await updateDoc(docRef, {
      status: "failed",
      endedAt: Date.now(),
    });
    console.log("[Groups] Failed group session:", groupId);
  },
};

