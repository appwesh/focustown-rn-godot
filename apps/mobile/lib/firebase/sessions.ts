/**
 * Session service for Firestore operations
 *
 * Handles:
 * - Creating/ending sessions
 * - Heartbeat updates for presence
 * - Building presence queries
 * - Session history
 */

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  onSnapshot,
  addDoc,
  increment,
  Timestamp,
} from "firebase/firestore";
import { db } from "./config";
import type {
  SessionDoc,
  SessionStatus,
  CreateSessionInput,
  BuildingPresence,
  UserDoc,
} from "./types";

// Collection references
const sessionsCollection = collection(db, "sessions");
const usersCollection = collection(db, "users");

/**
 * Session service for Firestore operations
 */
export const sessionService = {
  // ==========================================================================
  // Session CRUD
  // ==========================================================================

  /**
   * Create a new active session
   * Returns the session ID
   */
  async createSession(input: CreateSessionInput): Promise<string> {
    const now = Date.now();

    const sessionData: Omit<SessionDoc, "id"> = {
      odId: input.odId,
      displayName: input.displayName,
      buildingId: input.buildingId,
      buildingName: input.buildingName,
      spotId: input.spotId,
      plannedDuration: input.plannedDuration,
      actualDuration: null,
      remainingSeconds: input.plannedDuration,
      startedAt: now,
      endedAt: null,
      updatedAt: now,
      workType: input.workType,
      deepFocusMode: input.deepFocusMode,
      status: "active",
      coinsEarned: null,
      groupSessionId: input.groupSessionId ?? null,
      isGroupSession: !!input.groupSessionId,
    };

    const docRef = await addDoc(sessionsCollection, sessionData);

    // Update the doc with its own ID
    await updateDoc(docRef, { id: docRef.id });

    console.log("[Sessions] Created session:", docRef.id);
    return docRef.id;
  },

  /**
   * Get a session by ID
   */
  async getSession(sessionId: string): Promise<SessionDoc | null> {
    const docRef = doc(sessionsCollection, sessionId);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? (docSnap.data() as SessionDoc) : null;
  },

  /**
   * Update session heartbeat (remainingSeconds + updatedAt)
   * Called every 30s to keep presence alive
   */
  async updateHeartbeat(
    sessionId: string,
    remainingSeconds: number
  ): Promise<void> {
    const docRef = doc(sessionsCollection, sessionId);
    await updateDoc(docRef, {
      remainingSeconds,
      updatedAt: Date.now(),
    });
  },

  /**
   * Complete a session successfully
   * Updates session status and user stats atomically
   */
  async completeSession(
    sessionId: string,
    actualDuration: number,
    coinsEarned: number
  ): Promise<void> {
    const session = await this.getSession(sessionId);
    if (!session) {
      console.error("[Sessions] Session not found:", sessionId);
      return;
    }

    const now = Date.now();

    // Update session
    const sessionRef = doc(sessionsCollection, sessionId);
    await updateDoc(sessionRef, {
      status: "completed" as SessionStatus,
      actualDuration,
      coinsEarned,
      remainingSeconds: 0,
      endedAt: now,
      updatedAt: now,
    });

    // Update user stats with atomic increments
    const userRef = doc(usersCollection, session.odId);
    await updateDoc(userRef, {
      totalCoins: increment(coinsEarned),
      totalFocusTime: increment(actualDuration),
      sessionsCompleted: increment(1),
      lastActiveAt: now,
    });

    console.log("[Sessions] Completed session:", sessionId);
  },

  /**
   * Mark session as abandoned (user quit early, no rewards)
   */
  async abandonSession(sessionId: string): Promise<void> {
    const session = await this.getSession(sessionId);
    if (!session) return;

    const now = Date.now();
    const actualDuration = Math.floor((now - session.startedAt) / 1000);

    const sessionRef = doc(sessionsCollection, sessionId);
    await updateDoc(sessionRef, {
      status: "abandoned" as SessionStatus,
      actualDuration,
      coinsEarned: 0,
      remainingSeconds: 0,
      endedAt: now,
      updatedAt: now,
    });

    console.log("[Sessions] Abandoned session:", sessionId);
  },

  /**
   * Mark session as failed (user away too long)
   */
  async failSession(sessionId: string): Promise<void> {
    const session = await this.getSession(sessionId);
    if (!session) return;

    const now = Date.now();
    const actualDuration = Math.floor((now - session.startedAt) / 1000);

    const sessionRef = doc(sessionsCollection, sessionId);
    await updateDoc(sessionRef, {
      status: "failed" as SessionStatus,
      actualDuration,
      coinsEarned: 0,
      remainingSeconds: 0,
      endedAt: now,
      updatedAt: now,
    });

    console.log("[Sessions] Failed session:", sessionId);
  },

  // ==========================================================================
  // Presence Queries
  // ==========================================================================

  /**
   * Get active sessions in a building (for presence display)
   * Returns users currently studying in this building
   */
  async getBuildingPresence(buildingId: string): Promise<BuildingPresence[]> {
    const q = query(
      sessionsCollection,
      where("buildingId", "==", buildingId),
      where("status", "==", "active"),
      orderBy("startedAt", "desc"),
      limit(50)
    );

    const snap = await getDocs(q);

    return snap.docs.map((doc) => {
      const session = doc.data() as SessionDoc;
      return {
        odId: session.odId,
        displayName: session.displayName,
        spotId: session.spotId,
        remainingSeconds: session.remainingSeconds,
        workType: session.workType,
        isGroupSession: session.isGroupSession,
      };
    });
  },

  /**
   * Subscribe to building presence changes (real-time)
   */
  subscribeToBuildingPresence(
    buildingId: string,
    onUpdate: (presence: BuildingPresence[]) => void
  ): () => void {
    const q = query(
      sessionsCollection,
      where("buildingId", "==", buildingId),
      where("status", "==", "active"),
      orderBy("startedAt", "desc"),
      limit(50)
    );

    return onSnapshot(
      q,
      (snap) => {
        const presence = snap.docs.map((doc) => {
          const session = doc.data() as SessionDoc;
          return {
            odId: session.odId,
            displayName: session.displayName,
            spotId: session.spotId,
            remainingSeconds: session.remainingSeconds,
            workType: session.workType,
            isGroupSession: session.isGroupSession,
          };
        });
        onUpdate(presence);
      },
      (error) => {
        console.error("[Sessions] Presence subscription error:", error);
        onUpdate([]);
      }
    );
  },

  /**
   * Get user's active session (if any)
   */
  async getActiveSession(odId: string): Promise<SessionDoc | null> {
    const q = query(
      sessionsCollection,
      where("odId", "==", odId),
      where("status", "==", "active"),
      limit(1)
    );

    const snap = await getDocs(q);
    return snap.empty ? null : (snap.docs[0].data() as SessionDoc);
  },

  // ==========================================================================
  // Session History
  // ==========================================================================

  /**
   * Get user's session history (most recent first)
   */
  async getSessionHistory(
    odId: string,
    limitCount: number = 20
  ): Promise<SessionDoc[]> {
    const q = query(
      sessionsCollection,
      where("odId", "==", odId),
      orderBy("startedAt", "desc"),
      limit(limitCount)
    );

    const snap = await getDocs(q);
    return snap.docs.map((doc) => doc.data() as SessionDoc);
  },

  /**
   * Get user's completed sessions for a date range
   */
  async getCompletedSessionsInRange(
    odId: string,
    startTime: number,
    endTime: number
  ): Promise<SessionDoc[]> {
    const q = query(
      sessionsCollection,
      where("odId", "==", odId),
      where("status", "==", "completed"),
      where("startedAt", ">=", startTime),
      where("startedAt", "<=", endTime),
      orderBy("startedAt", "desc")
    );

    const snap = await getDocs(q);
    return snap.docs.map((doc) => doc.data() as SessionDoc);
  },

  /**
   * Get today's focus time for a user
   */
  async getTodaysFocusTime(odId: string): Promise<number> {
    const now = new Date();
    const startOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    ).getTime();

    const sessions = await this.getCompletedSessionsInRange(
      odId,
      startOfDay,
      Date.now()
    );

    return sessions.reduce((sum, s) => sum + (s.actualDuration ?? 0), 0);
  },
};

