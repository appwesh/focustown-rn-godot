import { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  Alert,
  ScrollView,
  TextInput,
} from 'react-native';
import { clearPckCache } from './godot-view';
import { useSocialStore } from '@/lib/social';
import { useSessionStore } from '@/lib/session';
import { useAuth, db, friendsService } from '@/lib/firebase';
import { useRouter } from 'expo-router';
import {
  collection,
  doc,
  getDoc,
  setDoc,
  getDocs,
  deleteDoc,
  updateDoc,
  query,
  where,
  limit,
  arrayUnion,
  increment,
} from 'firebase/firestore';
import type { UserDoc, FriendshipDoc, GroupInviteDoc
 } from '@/lib/firebase';

interface DebugModalProps {
  visible: boolean;
  onClose: () => void;
  onboardingStep?: string | null;
  onSetOnboardingStep?: (step: string) => void;
}

// Tab type
type DebugTab = 'state' | 'session' | 'users' | 'friends' | 'lobby' | 'cache' | 'nav';

// Test user for debug
interface TestUser {
  uid: string;
  displayName: string;
  username: string;
}

// Friendship info
interface FriendshipInfo {
  id: string;
  user1: string;
  user2: string;
  status: string;
  requesterId: string;
}

export function DebugModal({ visible, onClose, onboardingStep, onSetOnboardingStep }: DebugModalProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<DebugTab>('state');
  const [loading, setLoading] = useState<string | null>(null);
  
  // Test users state
  const [testUsers, setTestUsers] = useState<TestUser[]>([]);
  const [newUsername, setNewUsername] = useState('');
  const [selectedUser1, setSelectedUser1] = useState<string | null>(null);
  const [selectedUser2, setSelectedUser2] = useState<string | null>(null);
  
  // Friendships state
  const [friendships, setFriendships] = useState<FriendshipInfo[]>([]);
  
  // Group invites state
  interface GroupInviteInfo {
    id: string;
    odId: string;
    groupId: string;
    hostId: string;
    hostName: string;
    status: string;
  }
  const [groupInvites, setGroupInvites] = useState<GroupInviteInfo[]>([]);
  
  const { user, userDoc, recordSession, signOut } = useAuth();
  
  // Social store state
  const friends = useSocialStore((s) => s.friends);
  const pendingRequestsCount = useSocialStore((s) => s.pendingRequestsCount);
  const lobbyGroupId = useSocialStore((s) => s.lobbyGroupId);
  const lobbySlots = useSocialStore((s) => s.lobbySlots);
  const incomingInvites = useSocialStore((s) => s.incomingInvites);
  const cancelLobby = useSocialStore((s) => s.cancelLobby);
  const createLobby = useSocialStore((s) => s.createLobby);
  const inviteToLobby = useSocialStore((s) => s.inviteToLobby);

  // Load test users when modal opens
  useEffect(() => {
    if (visible && (activeTab === 'users' || activeTab === 'lobby')) {
      loadTestUsers();
    }
    if (visible && activeTab === 'friends') {
      loadFriendships();
    }
    if (visible && activeTab === 'lobby') {
      loadGroupInvites();
    }
  }, [visible, activeTab]);

  // Load all test users from Firestore
  const loadTestUsers = async () => {
    setLoading('loadUsers');
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, limit(50));
      const snap = await getDocs(q);
      
      const users: TestUser[] = snap.docs.map(doc => {
        const data = doc.data() as UserDoc;
        return {
          uid: doc.id,
          displayName: data.displayName || 'No name',
          username: data.username || 'no_username',
        };
      });
      
      setTestUsers(users);
    } catch (error) {
      console.error('[Debug] Failed to load users:', error);
    } finally {
      setLoading(null);
    }
  };

  // Load all friendships
  const loadFriendships = async () => {
    setLoading('loadFriendships');
    try {
      const friendshipsRef = collection(db, 'friendships');
      const snap = await getDocs(friendshipsRef);
      
      const ships: FriendshipInfo[] = snap.docs.map(doc => {
        const data = doc.data() as FriendshipDoc;
        return {
          id: doc.id,
          user1: data.users[0],
          user2: data.users[1],
          status: data.status,
          requesterId: data.requesterId,
        };
      });
      
      setFriendships(ships);
    } catch (error) {
      console.error('[Debug] Failed to load friendships:', error);
    } finally {
      setLoading(null);
    }
  };

  // Load all group invites
  const loadGroupInvites = async () => {
    setLoading('loadInvites');
    try {
      const invitesRef = collection(db, 'groupInvites');
      const snap = await getDocs(invitesRef);
      
      const invites: GroupInviteInfo[] = snap.docs.map(docSnap => {
        const data = docSnap.data() as GroupInviteDoc;
        return {
          id: docSnap.id,
          odId: data.odId,
          groupId: data.groupId,
          hostId: data.hostId,
          hostName: data.hostName,
          status: data.status,
        };
      });
      
      setGroupInvites(invites);
    } catch (error) {
      console.error('[Debug] Failed to load group invites:', error);
    } finally {
      setLoading(null);
    }
  };

  // Accept group invite (bypass normal auth)
  const handleAcceptGroupInvite = async (invite: GroupInviteInfo) => {
    setLoading(`acceptInvite_${invite.id}`);
    try {
      const now = Date.now();
      
      // Update invite status
      await updateDoc(doc(db, 'groupInvites', invite.id), {
        status: 'accepted',
        respondedAt: now,
      });
      
      // Add to group participants
      await updateDoc(doc(db, 'groupSessions', invite.groupId), {
        participantIds: arrayUnion(invite.odId),
        participantCount: increment(1),
      });
      
      await loadGroupInvites();
      Alert.alert('Success', 'Invite accepted!');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to accept');
    } finally {
      setLoading(null);
    }
  };

  // Delete group invite
  const handleDeleteGroupInvite = async (inviteId: string) => {
    setLoading(`deleteInvite_${inviteId}`);
    try {
      await deleteDoc(doc(db, 'groupInvites', inviteId));
      await loadGroupInvites();
    } catch (error) {
      Alert.alert('Error', 'Failed to delete');
    } finally {
      setLoading(null);
    }
  };

  // Create a test user
  const handleCreateTestUser = async () => {
    if (!newUsername.trim()) {
      Alert.alert('Error', 'Enter a username');
      return;
    }
    
    setLoading('createUser');
    try {
      const uid = `test_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const username = newUsername.toLowerCase().replace(/[^a-z0-9_]/g, '');
      
      const newUser: UserDoc = {
        uid,
        phoneNumber: `+1555${Math.floor(Math.random() * 10000000).toString().padStart(7, '0')}`,
        createdAt: Date.now(),
        displayName: newUsername,
        username,
        avatarUrl: null,
        totalCoins: 100,
        totalFocusTime: 0,
        sessionsCompleted: 0,
        currentStreak: 0,
        longestStreak: 0,
        friendCount: 0,
        expoPushToken: null,
        tokenUpdatedAt: null,
        lastActiveAt: Date.now(),
      };
      
      await setDoc(doc(db, 'users', uid), newUser);
      setNewUsername('');
      await loadTestUsers();
      Alert.alert('Success', `Created user @${username}`);
    } catch (error) {
      Alert.alert('Error', 'Failed to create user');
    } finally {
      setLoading(null);
    }
  };

  // Delete a test user
  const handleDeleteUser = async (uid: string) => {
    if (uid === user?.uid) {
      Alert.alert('Error', 'Cannot delete yourself!');
      return;
    }
    
    Alert.alert('Delete User', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setLoading('deleteUser');
          try {
            // Delete user doc
            await deleteDoc(doc(db, 'users', uid));
            
            // Delete related friendships
            const friendshipsRef = collection(db, 'friendships');
            const q = query(friendshipsRef, where('users', 'array-contains', uid));
            const snap = await getDocs(q);
            for (const docSnap of snap.docs) {
              await deleteDoc(docSnap.ref);
            }
            
            await loadTestUsers();
            await loadFriendships();
            
            if (selectedUser1 === uid) setSelectedUser1(null);
            if (selectedUser2 === uid) setSelectedUser2(null);
          } catch (error) {
            Alert.alert('Error', 'Failed to delete user');
          } finally {
            setLoading(null);
          }
        },
      },
    ]);
  };

  // Send friend request from user1 to user2
  const handleSendRequest = async () => {
    if (!selectedUser1 || !selectedUser2) {
      Alert.alert('Error', 'Select two users');
      return;
    }
    if (selectedUser1 === selectedUser2) {
      Alert.alert('Error', 'Cannot send request to yourself');
      return;
    }
    
    setLoading('sendRequest');
    try {
      await friendsService.sendRequest(selectedUser1, selectedUser2);
      await loadFriendships();
      Alert.alert('Success', 'Friend request sent!');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send request');
    } finally {
      setLoading(null);
    }
  };

  // Accept request (user2 accepts request from user1)
  const handleAcceptRequest = async (friendshipId: string, acceptingUid: string) => {
    setLoading('acceptRequest');
    try {
      // Bypass normal validation - directly update
      const docRef = doc(db, 'friendships', friendshipId);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        Alert.alert('Error', 'Friendship not found');
        return;
      }
      
      const data = docSnap.data() as FriendshipDoc;
      
      // Update to accepted
      await setDoc(docRef, {
        ...data,
        status: 'accepted',
        acceptedAt: Date.now(),
      });
      
      await loadFriendships();
      Alert.alert('Success', 'Request accepted!');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to accept');
    } finally {
      setLoading(null);
    }
  };

  // Delete a friendship
  const handleDeleteFriendship = async (friendshipId: string) => {
    setLoading('deleteFriendship');
    try {
      await deleteDoc(doc(db, 'friendships', friendshipId));
      await loadFriendships();
      Alert.alert('Success', 'Friendship deleted');
    } catch (error) {
      Alert.alert('Error', 'Failed to delete');
    } finally {
      setLoading(null);
    }
  };

  // Clear PCK cache
  const handleClearCache = async () => {
    setLoading('cache');
    try {
      await clearPckCache();
      Alert.alert('Cache Cleared', 'Restart app to download fresh copy.');
    } catch (error) {
      Alert.alert('Error', 'Failed to clear cache');
    } finally {
      setLoading(null);
    }
  };

  // Unlock all cafes by setting user progress to meet all requirements
  const handleUnlockAllCafes = async () => {
    if (!user) {
      Alert.alert('Error', 'Must be signed in');
      return;
    }

    setLoading('unlockCafes');
    try {
      // Set values high enough to unlock all cafes:
      // - sessionsCompleted: 10 (for europe-cafe)
      // - totalFocusTime: 10800 seconds / 180 min (for ghibli-cafe)
      // - currentStreak: 7 (for japan-cafe)
      await updateDoc(doc(db, 'users', user.uid), {
        sessionsCompleted: 15,
        totalFocusTime: 12000, // 200 minutes in seconds
        currentStreak: 10,
      });
      Alert.alert('Success', 'All cafes unlocked! Pull down to refresh.');
    } catch (error) {
      Alert.alert('Error', 'Failed to unlock cafes');
    } finally {
      setLoading(null);
    }
  };

  // Get username by uid
  const getUsername = useCallback((uid: string) => {
    if (uid === user?.uid) return `@${userDoc?.username || 'you'} (you)`;
    const found = testUsers.find(u => u.uid === uid);
    return found ? `@${found.username}` : uid.slice(0, 8) + '...';
  }, [testUsers, user, userDoc]);

  // Render tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'state':
        return renderStateTab();
      case 'session':
        return renderSessionTab();
      case 'users':
        return renderUsersTab();
      case 'friends':
        return renderFriendsTab();
      case 'lobby':
        return renderLobbyTab();
      case 'cache':
        return renderCacheTab();
      case 'nav':
        return renderNavTab();
    }
  };

  // Session store for fake sessions
  const sessionPhase = useSessionStore((s) => s.phase);
  const COINS_PER_MINUTE = 1; // Match the store's coin rate
  
  // Trigger fake session completion
  const triggerFakeSession = useCallback((durationMinutes: number) => {
    const durationSeconds = durationMinutes * 60;
    const coinsEarned = Math.max(1, Math.floor(durationMinutes * COINS_PER_MINUTE));
    
    // Actually record the session to Firebase (awards coins)
    recordSession(durationSeconds, coinsEarned);
    
    // Directly set the store state to simulate a completed session
    useSessionStore.setState({
      completedSession: {
        durationSeconds,
        coinsEarned,
        startedAt: Date.now() - durationSeconds * 1000,
      },
      activeSession: null,
      phase: 'complete',
    });
    
    onClose(); // Close debug modal to see the completion screen
  }, [onClose, recordSession]);

  // SESSION TAB
  const renderSessionTab = () => {
    const durations = [5, 15, 25, 45, 60, 90];
    
    return (
      <View style={styles.tabContent}>
        <Text style={styles.sectionTitle}>🎯 Fake Session Complete</Text>
        <Text style={styles.hintText}>
          Trigger a fake session completion to test the success screen.
          Coins are calculated at {COINS_PER_MINUTE} per minute.
        </Text>
        
        <View style={styles.sessionGrid}>
          {durations.map((mins) => {
            const coins = Math.floor(mins * COINS_PER_MINUTE);
            return (
              <Pressable
                key={mins}
                style={[styles.sessionBtn, styles.successBtn]}
                onPress={() => triggerFakeSession(mins)}
              >
                <Text style={styles.sessionBtnTime}>{mins} min</Text>
                <Text style={styles.sessionBtnCoins}>{coins} coins</Text>
              </Pressable>
            );
          })}
        </View>
        
        <View style={styles.divider} />
        
        <Text style={styles.sectionTitle}>📊 Current Session State</Text>
        <View style={styles.stateCard}>
          <Text style={styles.stateLabel}>Phase</Text>
          <Text style={styles.stateValue}>{sessionPhase}</Text>
        </View>
      </View>
    );
  };

  // STATE TAB
  const renderStateTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.stateCard}>
        <Text style={styles.stateLabel}>👥 Friends</Text>
        <Text style={styles.stateValue}>{friends.length}</Text>
      </View>
      <View style={styles.stateCard}>
        <Text style={styles.stateLabel}>📬 Pending Requests</Text>
        <Text style={styles.stateValue}>{pendingRequestsCount}</Text>
      </View>
      <View style={styles.stateCard}>
        <Text style={styles.stateLabel}>📩 Incoming Invites</Text>
        <Text style={styles.stateValue}>{incomingInvites.length}</Text>
      </View>
      <View style={styles.stateCard}>
        <Text style={styles.stateLabel}>🏠 Lobby</Text>
        <Text style={styles.stateValue}>{lobbyGroupId ? 'Active' : 'None'}</Text>
      </View>
      
      <View style={styles.divider} />
      
      <Text style={styles.sectionTitle}>👤 Current User ({user ? 'signed in' : 'not signed in'})</Text>
      <Text style={styles.infoText}>UID: {user?.uid?.slice(0, 12)}...</Text>
      <Text style={styles.infoText}>Name: {userDoc?.displayName || 'none'}</Text>
      <Text style={styles.infoText}>Username: @{userDoc?.username || 'none'}</Text>
      
      <View style={styles.divider} />
      
      <Text style={styles.sectionTitle}>📍 Lobby Slots (Zustand)</Text>
      {lobbySlots.map((slot, i) => (
        <View key={i} style={styles.slotRow}>
          <Text style={styles.slotIndex}>#{i + 1}</Text>
          <Text style={styles.slotName} numberOfLines={1}>
            {slot.displayName || (slot.odId ? slot.odId.slice(0, 8) + '...' : 'Empty')}
          </Text>
          <Text style={[
            styles.slotStatus,
            slot.status === 'ready' && styles.statusAccepted,
            slot.status === 'pending' && styles.statusPending,
          ]}>
            {slot.status}
          </Text>
        </View>
      ))}
      
      {friends.length > 0 && (
        <>
          <View style={styles.divider} />
          <Text style={styles.sectionTitle}>Friends List</Text>
          {friends.map((f, i) => (
            <Text key={f.odId} style={styles.infoText}>
              {i + 1}. {f.displayName} ({f.status})
            </Text>
          ))}
        </>
      )}
    </View>
  );

  // USERS TAB
  const renderUsersTab = () => (
    <View style={styles.tabContent}>
      <Text style={styles.sectionTitle}>➕ Create Test User</Text>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={newUsername}
          onChangeText={setNewUsername}
          placeholder="Username..."
          placeholderTextColor="#999"
          autoCapitalize="none"
        />
        <Pressable
          style={[styles.smallBtn, styles.successBtn]}
          onPress={handleCreateTestUser}
          disabled={loading === 'createUser'}
        >
          <Text style={styles.btnText}>
            {loading === 'createUser' ? '...' : 'Create'}
          </Text>
        </Pressable>
      </View>
      
      <View style={styles.divider} />
      
      <View style={styles.rowBetween}>
        <Text style={styles.sectionTitle}>📋 All Users ({testUsers.length})</Text>
        <Pressable
          style={[styles.tinyBtn, styles.infoBtn]}
          onPress={loadTestUsers}
          disabled={loading === 'loadUsers'}
        >
          <Text style={styles.tinyBtnText}>↻</Text>
        </Pressable>
      </View>
      
      {loading === 'loadUsers' ? (
        <Text style={styles.loadingText}>Loading...</Text>
      ) : (
        testUsers.map((u) => (
          <View key={u.uid} style={styles.userRow}>
            <View style={styles.userInfo}>
              <Text style={styles.userName} numberOfLines={1}>
                {u.displayName}
              </Text>
              <Text style={styles.userUsername}>@{u.username}</Text>
            </View>
            <Pressable
              style={[
                styles.selectBtn,
                selectedUser1 === u.uid && styles.selected1,
              ]}
              onPress={() => setSelectedUser1(u.uid)}
            >
              <Text style={styles.selectBtnText}>1</Text>
            </Pressable>
            <Pressable
              style={[
                styles.selectBtn,
                selectedUser2 === u.uid && styles.selected2,
              ]}
              onPress={() => setSelectedUser2(u.uid)}
            >
              <Text style={styles.selectBtnText}>2</Text>
            </Pressable>
            {u.uid !== user?.uid && (
              <Pressable
                style={[styles.tinyBtn, styles.dangerBtn]}
                onPress={() => handleDeleteUser(u.uid)}
              >
                <Text style={styles.tinyBtnText}>×</Text>
              </Pressable>
            )}
          </View>
        ))
      )}
      
      {selectedUser1 && selectedUser2 && (
        <>
          <View style={styles.divider} />
          <Text style={styles.sectionTitle}>🤝 Actions</Text>
          <Text style={styles.infoText}>
            User 1: {getUsername(selectedUser1)}
          </Text>
          <Text style={styles.infoText}>
            User 2: {getUsername(selectedUser2)}
          </Text>
          <Pressable
            style={[styles.actionBtn, styles.successBtn]}
            onPress={handleSendRequest}
            disabled={loading === 'sendRequest'}
          >
            <Text style={styles.btnText}>
              {loading === 'sendRequest' ? 'Sending...' : '📨 Send Request (1 → 2)'}
            </Text>
          </Pressable>
        </>
      )}
    </View>
  );

  // FRIENDS TAB
  const renderFriendsTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.rowBetween}>
        <Text style={styles.sectionTitle}>🔗 All Friendships ({friendships.length})</Text>
        <Pressable
          style={[styles.tinyBtn, styles.infoBtn]}
          onPress={loadFriendships}
          disabled={loading === 'loadFriendships'}
        >
          <Text style={styles.tinyBtnText}>↻</Text>
        </Pressable>
      </View>
      
      {loading === 'loadFriendships' ? (
        <Text style={styles.loadingText}>Loading...</Text>
      ) : friendships.length === 0 ? (
        <Text style={styles.emptyText}>No friendships yet</Text>
      ) : (
        friendships.map((f) => (
          <View key={f.id} style={styles.friendshipCard}>
            <View style={styles.friendshipInfo}>
              <Text style={styles.friendshipUsers}>
                {getUsername(f.user1)} ↔ {getUsername(f.user2)}
              </Text>
              <Text style={[
                styles.friendshipStatus,
                f.status === 'accepted' && styles.statusAccepted,
                f.status === 'pending' && styles.statusPending,
              ]}>
                {f.status.toUpperCase()}
                {f.status === 'pending' && ` (from ${getUsername(f.requesterId)})`}
              </Text>
            </View>
            <View style={styles.friendshipActions}>
              {f.status === 'pending' && (
                <Pressable
                  style={[styles.tinyBtn, styles.successBtn]}
                  onPress={() => {
                    // Accept as the other user (not the requester)
                    const accepter = f.requesterId === f.user1 ? f.user2 : f.user1;
                    handleAcceptRequest(f.id, accepter);
                  }}
                >
                  <Text style={styles.tinyBtnText}>✓</Text>
                </Pressable>
              )}
              <Pressable
                style={[styles.tinyBtn, styles.dangerBtn]}
                onPress={() => handleDeleteFriendship(f.id)}
              >
                <Text style={styles.tinyBtnText}>×</Text>
              </Pressable>
            </View>
          </View>
        ))
      )}
    </View>
  );

  // NAV TAB
  const renderNavTab = () => {
    const routes = [
      { label: 'Index', path: '/' },
      { label: 'Home', path: '/home' },
      { label: 'Social', path: '/social' },
      { label: 'Game', path: '/game' },
      { label: 'Profile', path: '/profile' },
      { label: 'Settings', path: '/settings' },
    ];

    const onboardingSteps = [
      { label: 'Welcome', value: 'welcome' },
      { label: 'Name', value: 'name' },
      { label: 'Gender', value: 'gender' },
      { label: 'Avatar', value: 'avatar' },
      { label: 'Age', value: 'age' },
      { label: 'Study Location', value: 'studyLocation' },
      { label: 'Social Baseline', value: 'socialBaseline' },
      { label: 'Study Frequency', value: 'studyFrequency' },
      { label: 'Session Length', value: 'sessionLength' },
      { label: 'Focus Friction', value: 'focusFriction' },
      { label: 'Focus For (23+)', value: 'focusFor' },
      { label: 'Goal', value: 'goal' },
      { label: 'Username', value: 'username' },
      { label: 'Phone', value: 'phone' },
      { label: 'Verify', value: 'verify' },
      { label: 'Notifications', value: 'notifications' },
      { label: 'Discord', value: 'discord' },
    ];

    return (
      <View style={styles.tabContent}>
        <Text style={styles.sectionTitle}>🧭 Navigate</Text>
        <Text style={styles.hintText}>Jump to any screen</Text>
        {routes.map((route) => (
          <Pressable
            key={route.path}
            style={[styles.actionBtn, styles.infoBtn]}
            onPress={() => {
              onClose();
              router.push(route.path);
            }}
          >
            <Text style={styles.btnText}>{route.label}</Text>
          </Pressable>
        ))}
        
        <View style={styles.divider} />
        <Text style={styles.sectionTitle}>📋 Onboarding Steps</Text>
        <Text style={styles.hintText}>
          {onSetOnboardingStep ? `Current: ${onboardingStep || 'N/A'}` : 'Navigate to onboarding screen'}
        </Text>
        {onboardingSteps.map((step) => (
          <Pressable
            key={step.value}
            style={[
              styles.actionBtn,
              onboardingStep === step.value ? styles.successBtn : styles.infoBtn,
            ]}
            onPress={() => {
              if (onSetOnboardingStep) {
                onSetOnboardingStep(step.value);
              } else {
                router.push('/onboarding');
              }
              onClose();
            }}
          >
            <Text style={styles.btnText}>{step.label}</Text>
          </Pressable>
        ))}
      </View>
    );
  };

  // LOBBY TAB
  const renderLobbyTab = () => {
    // Filter out current user and users already in lobby
    const invitedUids = lobbySlots.filter(s => s.odId).map(s => s.odId);
    const availableUsers = testUsers.filter(
      u => u.uid !== user?.uid && !invitedUids.includes(u.uid)
    );
    
    return (
      <View style={styles.tabContent}>
        <Text style={styles.sectionTitle}>🏠 Lobby State</Text>
        
        {!lobbyGroupId ? (
          <>
            <Text style={styles.emptyText}>No active lobby</Text>
            <Pressable
              style={[styles.actionBtn, styles.successBtn]}
              onPress={async () => {
                if (!user || !userDoc) return;
                setLoading('createLobby');
                try {
                  await createLobby(user.uid, userDoc.displayName || 'Test', 'cafe', 'Test Cafe', 25 * 60);
                  Alert.alert('Success', 'Lobby created!');
                } finally {
                  setLoading(null);
                }
              }}
              disabled={loading === 'createLobby'}
            >
              <Text style={styles.btnText}>
                {loading === 'createLobby' ? 'Creating...' : '➕ Create Test Lobby'}
              </Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text style={styles.infoText}>ID: {lobbyGroupId.slice(0, 12)}...</Text>
            
            <View style={styles.divider} />
            <Text style={styles.sectionTitle}>📍 Slots</Text>
            <Text style={styles.hintText}>
              Pending users can be marked ready (simulates accept)
            </Text>
            
            {lobbySlots.map((slot, i) => (
              <View key={i} style={styles.slotRow}>
                <Text style={styles.slotIndex}>#{i + 1}</Text>
                <Text style={styles.slotName} numberOfLines={1}>
                  {slot.displayName || 'Empty'}
                </Text>
                <Text style={[
                  styles.slotStatus,
                  slot.status === 'ready' && styles.statusAccepted,
                  slot.status === 'pending' && styles.statusPending,
                ]}>
                  {slot.status}
                </Text>
                {slot.status === 'pending' && slot.odId && (
                  <Pressable
                    style={[styles.tinyBtn, styles.successBtn]}
                    onPress={async () => {
                      // Mark as ready by accepting the invite
                      const inviteId = `${slot.odId}_${lobbyGroupId}`;
                      setLoading(`ready_${slot.odId}`);
                      try {
                        await handleAcceptGroupInvite({
                          id: inviteId,
                          odId: slot.odId!,
                          groupId: lobbyGroupId!,
                          hostId: '',
                          hostName: '',
                          status: 'pending',
                        });
                      } finally {
                        setLoading(null);
                      }
                    }}
                    disabled={loading === `ready_${slot.odId}`}
                  >
                    <Text style={styles.tinyBtnText}>✓</Text>
                  </Pressable>
                )}
              </View>
            ))}
            
            <View style={styles.divider} />
            <Text style={styles.sectionTitle}>📨 Invite Users</Text>
            <Text style={styles.hintText}>
              Store = uses Zustand (updates slots) | Direct = Firestore only
            </Text>
            
            {availableUsers.length === 0 ? (
              <Text style={styles.emptyText}>
                {testUsers.length <= 1 
                  ? 'Create test users in Users tab first' 
                  : 'All users already invited'}
              </Text>
            ) : (
              availableUsers.map((u) => (
                <View key={u.uid} style={styles.userRow}>
                  <View style={styles.userInfo}>
                    <Text style={styles.userName} numberOfLines={1}>
                      {u.displayName}
                    </Text>
                    <Text style={styles.userUsername}>@{u.username}</Text>
                  </View>
                  <Pressable
                    style={[styles.smallBtn, styles.infoBtn]}
                    onPress={async () => {
                      console.log('[Debug] Store invite pressed for:', u.uid, u.displayName);
                      console.log('[Debug] Current lobbyGroupId:', lobbyGroupId);
                      setLoading(`invite_${u.uid}`);
                      try {
                        // Use store's inviteToLobby (updates local state)
                        await inviteToLobby(u.uid, u.displayName, null);
                        await loadGroupInvites();
                        Alert.alert('Success', `Invited ${u.displayName}!`);
                      } catch (error: any) {
                        console.error('[Debug] Store invite error:', error);
                        Alert.alert('Error', error.message || 'Failed to invite');
                      } finally {
                        setLoading(null);
                      }
                    }}
                    disabled={loading === `invite_${u.uid}`}
                  >
                    <Text style={styles.btnText}>
                      {loading === `invite_${u.uid}` ? '...' : 'Store'}
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[styles.smallBtn, styles.warningBtn]}
                    onPress={async () => {
                      if (!lobbyGroupId) {
                        Alert.alert('Error', 'No active lobby - create one first');
                        return;
                      }
                      setLoading(`direct_${u.uid}`);
                      try {
                        // Direct Firestore invite (bypasses store)
                        const inviteId = `${u.uid}_${lobbyGroupId}`;
                        const now = Date.now();
                        await setDoc(doc(db, 'groupInvites', inviteId), {
                          odId: u.uid,
                          groupId: lobbyGroupId,
                          hostId: user?.uid,
                          hostName: userDoc?.displayName || 'Host',
                          status: 'pending',
                          invitedAt: now,
                          respondedAt: null,
                          expiresAt: now + 24 * 60 * 60 * 1000,
                        });
                        await loadGroupInvites();
                        Alert.alert('Success', `Direct invite created for ${u.displayName}!`);
                      } catch (error: any) {
                        Alert.alert('Error', error.message || 'Failed');
                      } finally {
                        setLoading(null);
                      }
                    }}
                    disabled={loading === `direct_${u.uid}`}
                  >
                    <Text style={styles.btnText}>
                      {loading === `direct_${u.uid}` ? '...' : 'Direct'}
                    </Text>
                  </Pressable>
                </View>
              ))
            )}
            
            <View style={styles.divider} />
            
            <Pressable
              style={[styles.actionBtn, styles.dangerBtn]}
              onPress={async () => {
                setLoading('cancelLobby');
                try {
                  await cancelLobby();
                  await loadGroupInvites();
                  Alert.alert('Success', 'Lobby cancelled');
                } finally {
                  setLoading(null);
                }
              }}
              disabled={loading === 'cancelLobby'}
            >
              <Text style={styles.btnText}>
                {loading === 'cancelLobby' ? 'Cancelling...' : '❌ Cancel Lobby'}
              </Text>
            </Pressable>
          </>
        )}
        
        {/* All Group Invites Section */}
        <View style={styles.divider} />
        <View style={styles.rowBetween}>
          <Text style={styles.sectionTitle}>📬 All Group Invites ({groupInvites.length})</Text>
          <Pressable
            style={[styles.tinyBtn, styles.infoBtn]}
            onPress={loadGroupInvites}
            disabled={loading === 'loadInvites'}
          >
            <Text style={styles.tinyBtnText}>↻</Text>
          </Pressable>
        </View>
        
        {loading === 'loadInvites' ? (
          <Text style={styles.loadingText}>Loading...</Text>
        ) : groupInvites.length === 0 ? (
          <Text style={styles.emptyText}>No group invites</Text>
        ) : (
          groupInvites.map((inv) => (
            <View key={inv.id} style={styles.friendshipCard}>
              <View style={styles.friendshipInfo}>
                <Text style={styles.friendshipUsers}>
                  {getUsername(inv.hostId)} → {getUsername(inv.odId)}
                </Text>
                <Text style={[
                  styles.friendshipStatus,
                  inv.status === 'accepted' && styles.statusAccepted,
                  inv.status === 'pending' && styles.statusPending,
                ]}>
                  {inv.status.toUpperCase()}
                </Text>
                <Text style={styles.userUsername}>
                  Group: {inv.groupId.slice(0, 8)}...
                </Text>
              </View>
              <View style={styles.friendshipActions}>
                {inv.status === 'pending' && (
                  <Pressable
                    style={[styles.tinyBtn, styles.successBtn]}
                    onPress={() => handleAcceptGroupInvite(inv)}
                    disabled={loading === `acceptInvite_${inv.id}`}
                  >
                    <Text style={styles.tinyBtnText}>✓</Text>
                  </Pressable>
                )}
                <Pressable
                  style={[styles.tinyBtn, styles.dangerBtn]}
                  onPress={() => handleDeleteGroupInvite(inv.id)}
                  disabled={loading === `deleteInvite_${inv.id}`}
                >
                  <Text style={styles.tinyBtnText}>×</Text>
                </Pressable>
              </View>
            </View>
          ))
        )}
      </View>
    );
  };

  // Handle sign out
  const handleSignOut = async () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          setLoading('signOut');
          try {
            await signOut();
            onClose();
            router.replace('/');
          } catch (error) {
            Alert.alert('Error', 'Failed to sign out');
          } finally {
            setLoading(null);
          }
        },
      },
    ]);
  };

  // CACHE TAB
  const renderCacheTab = () => (
    <View style={styles.tabContent}>
      <Text style={styles.sectionTitle}>💾 Cache Management</Text>
      <Text style={styles.infoText}>
        Clear downloaded game files to force a fresh download on next launch.
      </Text>
      <Pressable
        style={[styles.actionBtn, styles.warningBtn]}
        onPress={handleClearCache}
        disabled={loading === 'cache'}
      >
        <Text style={styles.btnText}>
          {loading === 'cache' ? 'Clearing...' : '🗑 Clear PCK Cache'}
        </Text>
      </Pressable>

      <View style={styles.divider} />

      <Text style={styles.sectionTitle}>☕ Cafes</Text>
      <Text style={styles.infoText}>
        Unlock all cafes by setting progress to meet requirements.
      </Text>
      <Pressable
        style={[styles.actionBtn, styles.successBtn]}
        onPress={handleUnlockAllCafes}
        disabled={loading === 'unlockCafes'}
      >
        <Text style={styles.btnText}>
          {loading === 'unlockCafes' ? 'Unlocking...' : '🔓 Unlock All Cafes'}
        </Text>
      </Pressable>

      <View style={styles.divider} />

      <Text style={styles.sectionTitle}>🚪 Account</Text>
      <Text style={styles.infoText}>
        Sign out of your account and return to the login screen.
      </Text>
      <Pressable
        style={[styles.actionBtn, styles.dangerBtn]}
        onPress={handleSignOut}
        disabled={loading === 'signOut'}
      >
        <Text style={styles.btnText}>
          {loading === 'signOut' ? 'Signing out...' : '🚪 Sign Out'}
        </Text>
      </Pressable>
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.container} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modal}>
              <Text style={styles.title}>🛠 Debug Menu</Text>
              <Text style={styles.subtitle}>Dev tools</Text>

              {/* Tabs */}
              <View style={styles.tabs}>
                {(['state', 'session', 'users', 'friends', 'lobby', 'cache', 'nav'] as DebugTab[]).map((tab) => (
              <Pressable
                    key={tab}
                    style={[styles.tab, activeTab === tab && styles.tabActive]}
                    onPress={() => setActiveTab(tab)}
                  >
                    <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                      {tab === 'state' && '📊'}
                      {tab === 'session' && '🎯'}
                      {tab === 'users' && '👤'}
                      {tab === 'friends' && '🤝'}
                      {tab === 'lobby' && '🏠'}
                      {tab === 'cache' && '💾'}
                      {tab === 'nav' && '🧭'}
                </Text>
              </Pressable>
                ))}
              </View>

              <ScrollView 
                style={styles.scrollView}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {renderTabContent()}
              </ScrollView>

              <View style={styles.footer}>
                <Pressable style={styles.closeBtn} onPress={onClose}>
                  <Text style={styles.closeBtnText}>Close</Text>
              </Pressable>
              </View>
            </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
    alignItems: 'stretch',
  },
  container: {
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
  },
  modal: {
    backgroundColor: '#FFF8E7',
    borderRadius: 20,
    padding: 16,
    borderWidth: 3,
    borderColor: '#83715B',
    borderBottomWidth: 7,
    maxHeight: '100%',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#5D4037',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 12,
    color: '#8D6E63',
    textAlign: 'center',
    marginBottom: 12,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#EDE4CF',
    borderRadius: 12,
    padding: 4,
    marginBottom: 12,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 10,
  },
  tabActive: {
    backgroundColor: '#FFF8E7',
  },
  tabText: {
    fontSize: 18,
    opacity: 0.5,
  },
  tabTextActive: {
    opacity: 1,
  },
  scrollView: {
    minHeight: 200,
    maxHeight: 450,
  },
  tabContent: {
    paddingBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#5D4037',
    marginBottom: 8,
  },
  divider: {
    height: 1,
    backgroundColor: '#DDD5C7',
    marginVertical: 12,
  },
  stateCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F5EDD8',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
  },
  stateLabel: {
    fontSize: 14,
    color: '#5D4037',
  },
  stateValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#5D4037',
  },
  infoText: {
    fontSize: 13,
    color: '#6B5344',
    marginBottom: 4,
  },
  loadingText: {
    fontSize: 13,
    color: '#8D6E63',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 20,
  },
  emptyText: {
    fontSize: 13,
    color: '#8D6E63',
    textAlign: 'center',
    paddingVertical: 12,
  },
  hintText: {
    fontSize: 11,
    color: '#A0A0A0',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#F5EDD8',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#3D3D3D',
    borderWidth: 1,
    borderColor: '#DDD5C7',
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5EDD8',
    padding: 10,
    borderRadius: 10,
    marginBottom: 6,
    gap: 6,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3D3D3D',
  },
  userUsername: {
    fontSize: 11,
    color: '#8B7355',
  },
  selectBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#DDD5C7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B5344',
  },
  selected1: {
    backgroundColor: '#64B5F6',
  },
  selected2: {
    backgroundColor: '#81C784',
  },
  friendshipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5EDD8',
    padding: 10,
    borderRadius: 10,
    marginBottom: 6,
  },
  friendshipInfo: {
    flex: 1,
  },
  friendshipUsers: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3D3D3D',
  },
  friendshipStatus: {
    fontSize: 10,
    fontWeight: '600',
    color: '#8B7355',
    marginTop: 2,
  },
  statusAccepted: {
    color: '#388E3C',
  },
  statusPending: {
    color: '#F57C00',
  },
  friendshipActions: {
    flexDirection: 'row',
    gap: 6,
  },
  slotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5EDD8',
    padding: 10,
    borderRadius: 10,
    marginBottom: 6,
    gap: 10,
  },
  slotIndex: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8B7355',
    width: 24,
  },
  slotName: {
    flex: 1,
    fontSize: 13,
    color: '#3D3D3D',
  },
  slotStatus: {
    fontSize: 11,
    fontWeight: '600',
    color: '#8B7355',
  },
  smallBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 2,
  },
  actionBtn: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
    borderWidth: 2,
  },
  tinyBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  btnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  tinyBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  infoBtn: {
    backgroundColor: '#64B5F6',
    borderColor: '#1976D2',
  },
  successBtn: {
    backgroundColor: '#81C784',
    borderColor: '#388E3C',
  },
  warningBtn: {
    backgroundColor: '#FF8A65',
    borderColor: '#E64A19',
  },
  dangerBtn: {
    backgroundColor: '#E57373',
    borderColor: '#C62828',
  },
  footer: {
    alignItems: 'center',
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#DDD5C7',
    paddingTop: 12,
  },
  closeBtn: {
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  closeBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8D6E63',
  },
  sessionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  sessionBtn: {
    width: '31%',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
  },
  sessionBtnTime: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  sessionBtnCoins: {
    fontSize: 11,
    color: '#fff',
    opacity: 0.85,
    marginTop: 2,
  },
});
