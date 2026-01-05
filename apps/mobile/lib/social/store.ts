/**
 * Social Store - Zustand-based state management for friends and group study
 * 
 * Features:
 * - Friends list with real-time updates
 * - Group study lobby (Fortnite-style)
 * - Friend invites with pending/ready states
 * - Incoming invite handling
 */

import { create } from 'zustand';
import { getAuth } from '@react-native-firebase/auth';
import { friendsService } from '../firebase/friends';
import { groupsService } from '../firebase/groups';
import { userService } from '../firebase/user';
import type { FriendInfo, GroupSessionDoc, GroupInviteDoc } from '../firebase/types';

// ============================================================================
// Types
// ============================================================================

/** Friend's current status */
export type FriendStatus = 'online-idle' | 'online-studying' | 'offline';

/** Extended friend info with computed status */
export interface FriendWithStatus extends FriendInfo {
  status: FriendStatus;
  lastActiveAt?: number;
  weeklyFocusTime?: number;
}

/** Lobby slot status */
export type LobbySlotStatus = 'empty' | 'pending' | 'ready';

/** Lobby slot data */
export interface LobbySlot {
  odId: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  status: LobbySlotStatus;
  inviteId?: string;
}

/** Incoming group invite */
export interface IncomingInvite {
  inviteId: string;
  hostId: string;
  hostName: string;
  groupId: string;
  buildingName: string;
  plannedDuration: number;
}

// ============================================================================
// Store Types
// ============================================================================

interface SocialState {
  // Friends
  friends: FriendWithStatus[];
  friendsLoading: boolean;
  pendingRequestsCount: number;
  
  // Lobby (group study)
  lobbyGroupId: string | null;
  lobbyHostId: string | null;
  lobbyHostName: string | null;
  lobbySlots: [LobbySlot, LobbySlot, LobbySlot]; // Fixed 3 slots
  lobbyBuildingId: string | null;
  lobbyBuildingName: string | null;
  
  // Group session started (for auto-navigation)
  groupSessionStarted: boolean;
  
  // Incoming invites
  incomingInvites: IncomingInvite[];
  showingInviteModal: boolean;
  currentInvite: IncomingInvite | null;
  
  // UI state
  showingFriendPicker: boolean;
  showingAddFriend: boolean;
}

interface SocialActions {
  // Initialization
  initialize: (userId: string) => () => void;
  
  // Friends
  refreshFriends: (userId: string) => Promise<void>;
  sendFriendRequest: (currentUserId: string, targetUserId: string) => Promise<{ success: boolean; error?: string }>;
  acceptFriendRequest: (friendshipId: string) => Promise<void>;
  declineFriendRequest: (friendshipId: string) => Promise<void>;
  removeFriend: (friendId: string, userId: string) => Promise<void>;
  
  // Lobby
  createLobby: (hostId: string, hostName: string, buildingId: string, buildingName: string, duration: number) => Promise<void>;
  inviteToLobby: (friendId: string, friendName: string, friendAvatar: string | null) => Promise<void>;
  cancelInvite: (slotIndex: number) => Promise<void>;
  cancelLobby: () => Promise<void>;
  canStartSession: () => boolean;
  
  // Incoming invites
  handleIncomingInvite: (invite: IncomingInvite) => void;
  acceptInvite: (inviteId: string) => Promise<void>;
  declineInvite: (inviteId: string) => Promise<void>;
  dismissInviteModal: () => void;
  
  // UI
  setShowingFriendPicker: (showing: boolean) => void;
  setShowingAddFriend: (showing: boolean) => void;
  
  // Group session navigation
  clearGroupSessionStarted: () => void;
  resetLobbyState: () => void;
  
  // Internal
  _updateSlotStatus: (odId: string, status: LobbySlotStatus) => void;
  _removeFromSlot: (odId: string) => void;
}

type SocialStore = SocialState & SocialActions;

// ============================================================================
// Helper: Get friend status
// ============================================================================

function getFriendStatus(friend: FriendInfo): FriendStatus {
  if (friend.currentSession) {
    return 'online-studying';
  }
  if (friend.isOnline) {
    return 'online-idle';
  }
  return 'offline';
}

// ============================================================================
// Module-level refs
// ============================================================================

let friendsUnsubscribe: (() => void) | null = null;
let pendingUnsubscribe: (() => void) | null = null;
let groupUnsubscribe: (() => void) | null = null;
let invitesUnsubscribe: (() => void) | null = null;
let isInitialized = false;
let initializedUserId: string | null = null;

// ============================================================================
// Initial State
// ============================================================================

const EMPTY_SLOT: LobbySlot = {
  odId: null,
  displayName: null,
  avatarUrl: null,
  status: 'empty',
};

const initialState: SocialState = {
  friends: [],
  friendsLoading: true,
  pendingRequestsCount: 0,
  lobbyGroupId: null,
  lobbyHostId: null,
  lobbyHostName: null,
  lobbySlots: [
    { ...EMPTY_SLOT }, // Slot 0: User (will be filled on lobby create)
    { ...EMPTY_SLOT }, // Slot 1: Friend
    { ...EMPTY_SLOT }, // Slot 2: Friend
  ],
  lobbyBuildingId: null,
  lobbyBuildingName: null,
  groupSessionStarted: false,
  incomingInvites: [],
  showingInviteModal: false,
  currentInvite: null,
  showingFriendPicker: false,
  showingAddFriend: false,
};

// ============================================================================
// Store
// ============================================================================

export const useSocialStore = create<SocialStore>((set, get) => ({
  ...initialState,
  
  // ==========================================================================
  // Initialization
  // ==========================================================================
  
  initialize: (userId: string) => {
    // Guard against duplicate initialization
    if (isInitialized && initializedUserId === userId) {
      console.log('[SocialStore] Already initialized for user:', userId);
      return () => {}; // Return no-op cleanup
    }
    
    // If initializing for a different user, cleanup first
    if (isInitialized && initializedUserId !== userId) {
      console.log('[SocialStore] Switching user, cleaning up previous...');
      friendsUnsubscribe?.();
      pendingUnsubscribe?.();
      groupUnsubscribe?.();
      invitesUnsubscribe?.();
    }
    
    console.log('[SocialStore] Initializing for user:', userId);
    isInitialized = true;
    initializedUserId = userId;
    
    // Subscribe to friends list
    friendsUnsubscribe = friendsService.subscribeToFriends(userId, (friends) => {
      const friendsWithStatus: FriendWithStatus[] = friends.map(f => ({
        ...f,
        status: getFriendStatus(f),
      }));
      set({ friends: friendsWithStatus, friendsLoading: false });
    });
    
    // Subscribe to pending requests count
    pendingUnsubscribe = friendsService.subscribeToPendingRequests(userId, (count) => {
      set({ pendingRequestsCount: count });
    });
    
    // Subscribe to incoming group invites
    invitesUnsubscribe = groupsService.subscribeToPendingInvitesCount(userId, async (count) => {
      if (count > 0) {
        // Fetch actual invites
        const invites = await groupsService.getPendingInvites(userId);
        const incomingInvites: IncomingInvite[] = invites.map(i => ({
          inviteId: i.inviteId,
          hostId: i.invite.hostId,
          hostName: i.invite.hostName,
          groupId: i.invite.groupId,
          buildingName: i.group.buildingName,
          plannedDuration: i.group.plannedDuration,
        }));
        
        set({ incomingInvites });
        
        // Show first invite if not already showing
        const state = get();
        if (!state.showingInviteModal && incomingInvites.length > 0) {
          set({ showingInviteModal: true, currentInvite: incomingInvites[0] });
        }
      } else {
        set({ incomingInvites: [] });
      }
    });
    
    // Return cleanup function
    return () => {
      console.log('[SocialStore] Cleaning up...');
      friendsUnsubscribe?.();
      pendingUnsubscribe?.();
      groupUnsubscribe?.();
      invitesUnsubscribe?.();
      friendsUnsubscribe = null;
      pendingUnsubscribe = null;
      groupUnsubscribe = null;
      invitesUnsubscribe = null;
      isInitialized = false;
      initializedUserId = null;
    };
  },
  
  // ==========================================================================
  // Friends
  // ==========================================================================
  
  refreshFriends: async (userId: string) => {
    set({ friendsLoading: true });
    try {
      const friends = await friendsService.getFriends(userId);
      const friendsWithStatus: FriendWithStatus[] = friends.map(f => ({
        ...f,
        status: getFriendStatus(f),
      }));
      set({ friends: friendsWithStatus, friendsLoading: false });
    } catch (error) {
      console.error('[SocialStore] Failed to refresh friends:', error);
      set({ friendsLoading: false });
    }
  },
  
  sendFriendRequest: async (currentUserId: string, targetUserId: string) => {
    try {
      if (!currentUserId) {
        return { success: false, error: 'Not logged in' };
      }
      
      // Check if already friends or pending
      const status = await friendsService.getFriendshipStatus(currentUserId, targetUserId);
      
      if (status.status === 'accepted') {
        return { success: false, error: 'Already friends' };
      }
      
      if (status.status === 'pending') {
        // Check if they sent us a request - auto-accept!
        if (status.requesterId === targetUserId) {
          // They sent us a request, accept it
          const friendshipId = currentUserId < targetUserId 
            ? `${currentUserId}_${targetUserId}` 
            : `${targetUserId}_${currentUserId}`;
          await friendsService.acceptRequest(friendshipId, currentUserId);
          return { success: true };
        }
        return { success: false, error: 'Request already pending' };
      }
      
      // Send request
      await friendsService.sendRequest(currentUserId, targetUserId);
      return { success: true };
    } catch (error) {
      console.error('[SocialStore] Failed to send friend request:', error);
      return { success: false, error: 'Failed to send request' };
    }
  },
  
  acceptFriendRequest: async (friendshipId: string) => {
    try {
      const currentUser = getAuth().currentUser;
      if (!currentUser) return;
      await friendsService.acceptRequest(friendshipId, currentUser.uid);
    } catch (error) {
      console.error('[SocialStore] Failed to accept request:', error);
    }
  },
  
  declineFriendRequest: async (friendshipId: string) => {
    try {
      const currentUser = getAuth().currentUser;
      if (!currentUser) return;
      await friendsService.declineRequest(friendshipId, currentUser.uid);
    } catch (error) {
      console.error('[SocialStore] Failed to decline request:', error);
    }
  },
  
  removeFriend: async (friendId: string, userId: string) => {
    try {
      await friendsService.removeFriend(userId, friendId);
    } catch (error) {
      console.error('[SocialStore] Failed to remove friend:', error);
    }
  },
  
  // ==========================================================================
  // Lobby
  // ==========================================================================
  
  createLobby: async (hostId, hostName, buildingId, buildingName, duration) => {
    try {
      const groupId = await groupsService.createGroupSession({
        hostId,
        hostName,
        buildingId,
        buildingName,
        plannedDuration: duration,
        workType: 'study',
        deepFocusMode: true,
      });
      
      // Set up lobby slots - host in first slot
      const hostSlot: LobbySlot = {
        odId: hostId,
        displayName: hostName,
        avatarUrl: null,
        status: 'ready',
      };
      
      set({
        lobbyGroupId: groupId,
        lobbyHostId: hostId,
        lobbyHostName: hostName,
        lobbyBuildingId: buildingId,
        lobbyBuildingName: buildingName,
        lobbySlots: [hostSlot, { ...EMPTY_SLOT }, { ...EMPTY_SLOT }],
      });
      
      // Subscribe to group updates
      groupUnsubscribe = groupsService.subscribeToGroupSession(groupId, (group) => {
        if (!group) {
          // Group cancelled
          get().cancelLobby();
          return;
        }
        
        // Update slot statuses based on participants
        const state = get();
        const updatedSlots = [...state.lobbySlots] as [LobbySlot, LobbySlot, LobbySlot];
        
        for (let i = 1; i < 3; i++) {
          const slot = updatedSlots[i];
          if (slot.odId && group.participantIds.includes(slot.odId)) {
            updatedSlots[i] = { ...slot, status: 'ready' };
          }
        }
        
        set({ lobbySlots: updatedSlots });
      });
      
      console.log('[SocialStore] Created lobby:', groupId);
    } catch (error) {
      console.error('[SocialStore] Failed to create lobby:', error);
    }
  },
  
  inviteToLobby: async (friendId, friendName, friendAvatar) => {
    console.log('[SocialStore] inviteToLobby called:', { friendId, friendName });
    
    const { lobbyGroupId, lobbyHostId, lobbyHostName, lobbySlots } = get();
    console.log('[SocialStore] Current state:', { lobbyGroupId, lobbyHostId, slots: lobbySlots.map(s => s.status) });
    
    if (!lobbyGroupId) {
      console.warn('[SocialStore] No lobbyGroupId - cannot invite');
      return;
    }
    
    if (!lobbyHostId) {
      console.warn('[SocialStore] No lobbyHostId - cannot invite');
      return;
    }
    
    // Find empty slot
    const emptySlotIndex = lobbySlots.findIndex(s => s.status === 'empty');
    console.log('[SocialStore] Empty slot index:', emptySlotIndex);
    
    if (emptySlotIndex === -1) {
      console.warn('[SocialStore] No empty slots');
      return;
    }
    
    try {
      // Send invite using stored host info
      console.log('[SocialStore] Calling groupsService.inviteFriend with host:', { lobbyHostId, lobbyHostName });
      await groupsService.inviteFriend(
        lobbyGroupId,
        lobbyHostId,
        lobbyHostName || 'Anonymous',
        friendId
      );
      console.log('[SocialStore] Firestore invite created');
      
      // Update slot immediately (optimistic)
      const inviteId = `${friendId}_${lobbyGroupId}`;
      const newSlot: LobbySlot = {
        odId: friendId,
        displayName: friendName,
        avatarUrl: friendAvatar,
        status: 'pending',
        inviteId,
      };
      
      const newSlots = [...lobbySlots] as [LobbySlot, LobbySlot, LobbySlot];
      newSlots[emptySlotIndex] = newSlot;
      set({ lobbySlots: newSlots });
      
      console.log('[SocialStore] Updated lobbySlots:', newSlots.map(s => ({ name: s.displayName, status: s.status })));
      console.log('[SocialStore] Invited friend:', friendId);
    } catch (error) {
      console.error('[SocialStore] Failed to invite:', error);
    }
  },
  
  cancelInvite: async (slotIndex: number) => {
    const { lobbySlots, lobbyHostId } = get();
    const slot = lobbySlots[slotIndex];
    if (!slot.inviteId || !lobbyHostId) return;
    
    try {
      await groupsService.cancelInvite(slot.inviteId, lobbyHostId);
      
      // Clear slot
      const newSlots = [...lobbySlots] as [LobbySlot, LobbySlot, LobbySlot];
      newSlots[slotIndex] = { ...EMPTY_SLOT };
      set({ lobbySlots: newSlots });
    } catch (error) {
      console.error('[SocialStore] Failed to cancel invite:', error);
    }
  },
  
  cancelLobby: async () => {
    const { lobbyGroupId } = get();
    
    const { lobbyHostId } = get();
    
    if (lobbyGroupId && lobbyHostId) {
      try {
        await groupsService.cancelGroupSession(lobbyGroupId, lobbyHostId);
      } catch (error) {
        console.error('[SocialStore] Failed to cancel group:', error);
      }
    }
    
    // Clean up subscription
    groupUnsubscribe?.();
    groupUnsubscribe = null;
    
    // Reset lobby state
    set({
      lobbyGroupId: null,
      lobbyHostId: null,
      lobbyHostName: null,
      lobbyBuildingId: null,
      lobbyBuildingName: null,
      lobbySlots: [{ ...EMPTY_SLOT }, { ...EMPTY_SLOT }, { ...EMPTY_SLOT }],
    });
    
    console.log('[SocialStore] Lobby cancelled');
  },
  
  canStartSession: () => {
    const { lobbySlots } = get();
    // Need at least 1 ready friend (not just the host)
    return lobbySlots.slice(1).some(s => s.status === 'ready');
  },
  
  // ==========================================================================
  // Incoming Invites
  // ==========================================================================
  
  handleIncomingInvite: (invite: IncomingInvite) => {
    const { incomingInvites, showingInviteModal } = get();
    
    // Add to queue
    const updated = [...incomingInvites, invite];
    set({ incomingInvites: updated });
    
    // Show modal if not already showing
    if (!showingInviteModal) {
      set({ showingInviteModal: true, currentInvite: invite });
    }
  },
  
  acceptInvite: async (inviteId: string) => {
    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;
      if (!currentUser) return;
      
      // Get the invite info before accepting (we need groupId)
      const { incomingInvites, currentInvite } = get();
      const invite = incomingInvites.find(i => i.inviteId === inviteId) || currentInvite;
      
      if (!invite) {
        console.error('[SocialStore] Invite not found in state:', inviteId);
        return;
      }
      
      // Accept invite in Firestore
      await groupsService.acceptInvite(inviteId, currentUser.uid);
      
      // Remove from invites queue
      const remaining = incomingInvites.filter(i => i.inviteId !== inviteId);
      
      if (remaining.length > 0) {
        set({ incomingInvites: remaining, currentInvite: remaining[0] });
      } else {
        set({ incomingInvites: [], showingInviteModal: false, currentInvite: null });
      }
      
      // Now join the lobby locally
      // Get full group data to populate lobby state
      const group = await groupsService.getGroupSession(invite.groupId);
      if (!group || group.status !== 'pending') {
        console.log('[SocialStore] Group not found or already started');
        return;
      }
      
      // Fetch current user's doc for display name
      const currentUserDoc = await userService.getUser(currentUser.uid);
      
      // Set up user slot (slot 0 is always the current user)
      const userSlot: LobbySlot = {
        odId: currentUser.uid,
        displayName: currentUserDoc?.displayName || 'You',
        avatarUrl: currentUserDoc?.avatarUrl || null,
        status: 'ready',
      };
      
      // Set up other participant slots (host + others who joined)
      const otherParticipants = group.participantIds.filter(id => id !== currentUser.uid);
      const participantsInfo = await groupsService.getParticipantsInfo(invite.groupId);
      
      const slot1: LobbySlot = otherParticipants[0]
        ? {
            odId: otherParticipants[0],
            displayName: participantsInfo.find(p => p.odId === otherParticipants[0])?.displayName || 'Friend',
            avatarUrl: participantsInfo.find(p => p.odId === otherParticipants[0])?.avatarUrl || null,
            status: 'ready',
          }
        : { ...EMPTY_SLOT };
        
      const slot2: LobbySlot = otherParticipants[1]
        ? {
            odId: otherParticipants[1],
            displayName: participantsInfo.find(p => p.odId === otherParticipants[1])?.displayName || 'Friend',
            avatarUrl: participantsInfo.find(p => p.odId === otherParticipants[1])?.avatarUrl || null,
            status: 'ready',
          }
        : { ...EMPTY_SLOT };
      
      // Update lobby state
      set({
        lobbyGroupId: invite.groupId,
        lobbyHostId: invite.hostId,
        lobbyHostName: invite.hostName,
        lobbyBuildingId: group.buildingId,
        lobbyBuildingName: invite.buildingName,
        lobbySlots: [userSlot, slot1, slot2],
      });
      
      // Subscribe to group updates
      groupUnsubscribe?.(); // Clean up any existing subscription
      const userId = currentUser.uid; // Capture for closure
      groupUnsubscribe = groupsService.subscribeToGroupSession(invite.groupId, (updatedGroup) => {
        if (!updatedGroup) {
          // Group cancelled by host
          get().cancelLobby();
          return;
        }
        
        // If session started, trigger auto-navigation (only once)
        // After setting the flag, unsubscribe to prevent repeated triggers
        if (updatedGroup.status === 'active') {
          console.log('[SocialStore] Group session started! Setting flag for auto-nav.');
          set({ groupSessionStarted: true });
          // Unsubscribe immediately to prevent repeated triggers
          groupUnsubscribe?.();
          groupUnsubscribe = null;
          return;
        }
        
        // Update slots based on participants
        const state = get();
        if (!state.lobbyGroupId) return;
        
        const others = updatedGroup.participantIds.filter(id => id !== userId);
        const newSlots = [...state.lobbySlots] as [LobbySlot, LobbySlot, LobbySlot];
        
        // Update slot 1
        if (others[0]) {
          const existing = newSlots[1];
          if (existing.odId !== others[0]) {
            // New participant
            newSlots[1] = {
              odId: others[0],
              displayName: participantsInfo.find(p => p.odId === others[0])?.displayName || 'Friend',
              avatarUrl: participantsInfo.find(p => p.odId === others[0])?.avatarUrl || null,
              status: 'ready',
            };
          }
        } else {
          newSlots[1] = { ...EMPTY_SLOT };
        }
        
        // Update slot 2
        if (others[1]) {
          const existing = newSlots[2];
          if (existing.odId !== others[1]) {
            newSlots[2] = {
              odId: others[1],
              displayName: participantsInfo.find(p => p.odId === others[1])?.displayName || 'Friend',
              avatarUrl: participantsInfo.find(p => p.odId === others[1])?.avatarUrl || null,
              status: 'ready',
            };
          }
        } else {
          newSlots[2] = { ...EMPTY_SLOT };
        }
        
        set({ lobbySlots: newSlots });
      });
      
      console.log('[SocialStore] Joined lobby:', invite.groupId);
    } catch (error) {
      console.error('[SocialStore] Failed to accept invite:', error);
    }
  },
  
  declineInvite: async (inviteId: string) => {
    try {
      const currentUser = getAuth().currentUser;
      if (!currentUser) return;
      
      await groupsService.declineInvite(inviteId, currentUser.uid);
      
      // Remove from queue
      const { incomingInvites } = get();
      const remaining = incomingInvites.filter(i => i.inviteId !== inviteId);
      
      if (remaining.length > 0) {
        set({ incomingInvites: remaining, currentInvite: remaining[0] });
      } else {
        set({ incomingInvites: [], showingInviteModal: false, currentInvite: null });
      }
    } catch (error) {
      console.error('[SocialStore] Failed to decline invite:', error);
    }
  },
  
  dismissInviteModal: () => {
    set({ showingInviteModal: false, currentInvite: null });
  },
  
  // ==========================================================================
  // UI
  // ==========================================================================
  
  setShowingFriendPicker: (showing) => {
    set({ showingFriendPicker: showing });
  },
  
  setShowingAddFriend: (showing) => {
    set({ showingAddFriend: showing });
  },
  
  // ==========================================================================
  // Group Session Navigation
  // ==========================================================================
  
  clearGroupSessionStarted: () => {
    set({ groupSessionStarted: false });
  },
  
  resetLobbyState: () => {
    console.log('[SocialStore] Resetting lobby state (session completed)');
    
    // Clean up subscription
    groupUnsubscribe?.();
    groupUnsubscribe = null;
    
    // Reset lobby state without trying to cancel in Firestore
    set({
      lobbyGroupId: null,
      lobbyHostId: null,
      lobbyHostName: null,
      lobbyBuildingId: null,
      lobbyBuildingName: null,
      groupSessionStarted: false,
      lobbySlots: [{ ...EMPTY_SLOT }, { ...EMPTY_SLOT }, { ...EMPTY_SLOT }],
    });
  },
  
  // ==========================================================================
  // Internal
  // ==========================================================================
  
  _updateSlotStatus: (odId, status) => {
    const { lobbySlots } = get();
    const newSlots = lobbySlots.map(slot => 
      slot.odId === odId ? { ...slot, status } : slot
    ) as [LobbySlot, LobbySlot, LobbySlot];
    set({ lobbySlots: newSlots });
  },
  
  _removeFromSlot: (odId) => {
    const { lobbySlots } = get();
    const newSlots = lobbySlots.map(slot => 
      slot.odId === odId ? { ...EMPTY_SLOT } : slot
    ) as [LobbySlot, LobbySlot, LobbySlot];
    set({ lobbySlots: newSlots });
  },
}));

// ============================================================================
// Selectors
// ============================================================================

export const selectFriends = (state: SocialStore) => state.friends;
export const selectFriendsLoading = (state: SocialStore) => state.friendsLoading;
export const selectPendingRequestsCount = (state: SocialStore) => state.pendingRequestsCount;
export const selectLobbySlots = (state: SocialStore) => state.lobbySlots;
export const selectLobbyGroupId = (state: SocialStore) => state.lobbyGroupId;
export const selectGroupSessionStarted = (state: SocialStore) => state.groupSessionStarted;
export const selectShowingInviteModal = (state: SocialStore) => state.showingInviteModal;
export const selectCurrentInvite = (state: SocialStore) => state.currentInvite;
export const selectShowingFriendPicker = (state: SocialStore) => state.showingFriendPicker;
export const selectShowingAddFriend = (state: SocialStore) => state.showingAddFriend;

// ============================================================================
// Static cleanup (for use in auth signOut)
// ============================================================================

export function cleanupSocialStore() {
  console.log('[SocialStore] Static cleanup called');
  friendsUnsubscribe?.();
  pendingUnsubscribe?.();
  groupUnsubscribe?.();
  invitesUnsubscribe?.();
  friendsUnsubscribe = null;
  pendingUnsubscribe = null;
  groupUnsubscribe = null;
  invitesUnsubscribe = null;
  isInitialized = false;
  initializedUserId = null;
  
  // Reset store state
  useSocialStore.setState({
    friends: [],
    friendsLoading: true,
    pendingRequestsCount: 0,
    lobbyGroupId: null,
    lobbyHostId: null,
    lobbyHostName: null,
    lobbyBuildingId: null,
    lobbyBuildingName: null,
    groupSessionStarted: false,
    lobbySlots: [
      { odId: null, displayName: null, avatarUrl: null, status: 'empty' },
      { odId: null, displayName: null, avatarUrl: null, status: 'empty' },
      { odId: null, displayName: null, avatarUrl: null, status: 'empty' },
    ],
    incomingInvites: [],
    showingInviteModal: false,
    currentInvite: null,
    showingFriendPicker: false,
    showingAddFriend: false,
  });
}

