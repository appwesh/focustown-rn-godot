import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  Pressable,
  ScrollView,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth, groupsService } from '@/lib/firebase';
import { useSocialStore, type LobbySlot } from '@/lib/social';
import { BeanCounter } from '@/components/ui';
import { FriendPickerModal, InviteReceivedModal, LobbyDurationModal } from '@/components/social';
import { DebugModal } from '@/components/debug-modal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CAROUSEL_ITEM_WIDTH = SCREEN_WIDTH * 0.55;
const CAROUSEL_ITEM_SPACING = 12;

// Cafe data
const CAFES = [
  {
    id: 'korea-cafe',
    name: 'cafe in korea',
    buildingId: 'cafe',
    buildingName: 'Brooklyn Cafe',
    image: require('@/assets/ui/koreacafe.png'),
    locked: false,
  },
  {
    id: 'boston-library',
    name: 'boston library',
    buildingId: 'library',
    buildingName: 'Boston Library',
    image: require('@/assets/ui/bostonlibrary.png'),
    locked: true,
  },
];

type NavTab = 'social' | 'main' | 'shop';

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [selectedCafe, setSelectedCafe] = useState(0);
  const [activeTab, setActiveTab] = useState<NavTab>('main');
  const [showDebugModal, setShowDebugModal] = useState(false);
  const [showDurationModal, setShowDurationModal] = useState(false);

  const { user, userDoc } = useAuth();

  // Social store
  const friends = useSocialStore((s) => s.friends);
  const lobbySlots = useSocialStore((s) => s.lobbySlots);
  const lobbyGroupId = useSocialStore((s) => s.lobbyGroupId);
  const lobbyHostId = useSocialStore((s) => s.lobbyHostId);
  const pendingRequestsCount = useSocialStore((s) => s.pendingRequestsCount);
  const showingFriendPicker = useSocialStore((s) => s.showingFriendPicker);
  const showingInviteModal = useSocialStore((s) => s.showingInviteModal);
  const currentInvite = useSocialStore((s) => s.currentInvite);
  const groupSessionStarted = useSocialStore((s) => s.groupSessionStarted);
  const setShowingFriendPicker = useSocialStore((s) => s.setShowingFriendPicker);
  const dismissInviteModal = useSocialStore((s) => s.dismissInviteModal);
  const createLobby = useSocialStore((s) => s.createLobby);
  const cancelLobby = useSocialStore((s) => s.cancelLobby);
  const cancelInvite = useSocialStore((s) => s.cancelInvite);
  const canStartSession = useSocialStore((s) => s.canStartSession);
  const clearGroupSessionStarted = useSocialStore((s) => s.clearGroupSessionStarted);
  const initialize = useSocialStore((s) => s.initialize);

  // Initialize social store
  useEffect(() => {
    if (user) {
      const cleanup = initialize(user.uid);
      return cleanup;
    }
  }, [user, initialize]);

  // Auto-navigate to game when group session starts (for invited users)
  useEffect(() => {
    if (groupSessionStarted) {
      console.log('[Home] Group session started, auto-navigating to game');
      clearGroupSessionStarted();
      router.push('/game');
    }
  }, [groupSessionStarted, clearGroupSessionStarted, router]);

  // Note: We intentionally DON'T cancel the lobby when navigating away
  // because the user might be going to the game screen for a group session.
  // The lobby will be cleaned up when the session ends or is explicitly cancelled.

  // Get user's display name (first name only for UI)
  const userName = useMemo(() => {
    if (!userDoc?.displayName) return 'You';
    return userDoc.displayName.split(' ')[0];
  }, [userDoc?.displayName]);

  // Handle add friend slot tap
  const handleAddFriendSlot = useCallback(async () => {
    // If no lobby exists, show duration modal first
    if (!lobbyGroupId && user && userDoc) {
      // If no friends, go to social tab
      if (friends.length === 0) {
        router.push('/social');
      } else {
        // Show duration picker modal
        setShowDurationModal(true);
      }
      return;
    }

    // Lobby exists, show friend picker
    if (friends.length === 0) {
      router.push('/social');
    } else {
      setShowingFriendPicker(true);
    }
  }, [lobbyGroupId, user, userDoc, friends.length, router, setShowingFriendPicker]);

  // Handle duration selected - create lobby with that duration
  const handleDurationSelected = useCallback(async (durationMinutes: number) => {
    setShowDurationModal(false);
    
    if (!user || !userDoc) return;
    
    const cafe = CAFES[selectedCafe];
    await createLobby(
      user.uid,
      userDoc.displayName || 'Anonymous',
      cafe.buildingId,
      cafe.buildingName,
      durationMinutes * 60 // Convert to seconds
    );
    
    // Now show friend picker
    setShowingFriendPicker(true);
  }, [user, userDoc, selectedCafe, createLobby, setShowingFriendPicker]);

  // Handle slot long press to cancel invite
  const handleSlotLongPress = useCallback((index: number) => {
    const slot = lobbySlots[index];
    if (slot.status === 'pending' || slot.status === 'ready') {
      cancelInvite(index);
    }
  }, [lobbySlots, cancelInvite]);

  const handleGoToCafe = useCallback(async () => {
    if (CAFES[selectedCafe].locked) return;

    // If we have a lobby with ready friends, start the group session first
    const hasReadyFriends = lobbySlots.slice(1).some(s => s.status === 'ready');
    if (lobbyGroupId && lobbyHostId && hasReadyFriends) {
      try {
        await groupsService.startGroupSession(lobbyGroupId, lobbyHostId);
        console.log('[Home] Started group session:', lobbyGroupId);
      } catch (error) {
        console.error('[Home] Failed to start group session:', error);
        // Continue anyway - will be a solo session
      }
    }

    router.push('/game');
  }, [selectedCafe, router, lobbyGroupId, lobbyHostId, lobbySlots]);

  const handleTabPress = (tab: NavTab) => {
    setActiveTab(tab);
    if (tab === 'social') {
      router.push('/social');
    }
    // Shop not implemented yet
  };

  const renderCafeItem = (item: typeof CAFES[0], index: number) => {
    const isSelected = selectedCafe === index;
    
    return (
      <Pressable
        key={item.id}
        style={[
          styles.cafeCard,
          isSelected && styles.cafeCardSelected,
        ]}
        onPress={() => setSelectedCafe(index)}
      >
        <View style={styles.cafeImageContainer}>
          <Image
            source={item.image}
            style={[styles.cafeImage, item.locked && styles.cafeImageLocked]}
            resizeMode="contain"
          />
          {item.locked && (
            <View style={styles.lockIconContainer}>
              <Text style={styles.lockIcon}>🔒</Text>
            </View>
          )}
        </View>
        <Text style={styles.cafeName}>{item.name}</Text>
      </Pressable>
    );
  };

  const renderStudySlot = (slot: LobbySlot, index: number) => {
    // First slot is always the user
    if (index === 0) {
      return (
        <View key="user" style={styles.studySlot}>
          <Text style={styles.slotName}>{userName.toLowerCase()}</Text>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarEmoji}>👦</Text>
          </View>
          <View style={styles.readyBadge}>
            <Text style={styles.readyBadgeText}>✓</Text>
          </View>
        </View>
      );
    }

    // Friend slots
    if (slot.status === 'empty') {
      return (
        <Pressable
          key={`slot-${index}`}
          style={styles.studySlot}
          onPress={handleAddFriendSlot}
        >
          <Text style={styles.addFriendText}>add friend</Text>
          <View style={styles.addFriendIcon}>
            <Text style={styles.plusIcon}>+</Text>
          </View>
        </Pressable>
      );
    }

    // Pending or Ready friend
    const isPending = slot.status === 'pending';
    
    return (
      <View key={`slot-${index}`} style={styles.studySlot}>
        <Text style={styles.slotName} numberOfLines={1}>
          {slot.displayName?.split(' ')[0]?.toLowerCase() || 'friend'}
        </Text>
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarEmoji}>👤</Text>
        </View>
        <View style={[styles.statusBadge, isPending ? styles.pendingBadge : styles.readyBadge]}>
          <Text style={styles.statusBadgeText}>
            {isPending ? '⏳' : '✓'}
          </Text>
        </View>
        {/* Remove button for pending/ready users */}
        <Pressable
          style={styles.removeSlotButton}
          onPress={() => cancelInvite(index)}
          hitSlop={8}
        >
          <Text style={styles.removeSlotText}>×</Text>
        </Pressable>
      </View>
    );
  };

  // Check if user can start (needs at least 1 ready friend for group, or solo)
  const hasReadyFriends = lobbySlots.slice(1).some(s => s.status === 'ready');
  const hasAnyInvites = lobbySlots.slice(1).some(s => s.status !== 'empty');
  
  // Button state
  const isLocked = CAFES[selectedCafe].locked;
  const buttonText = isLocked
    ? 'Locked'
    : hasAnyInvites && !hasReadyFriends
    ? 'Waiting...'
    : 'Go to café';
  const buttonDisabled = isLocked || (hasAnyInvites && !hasReadyFriends);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>

      {/* Header */}
      <View style={styles.header}>
        <Pressable
          style={({ pressed }) => [styles.headerButton, pressed && styles.headerButtonPressed]}
          onPress={() => router.push('/settings')}
          onLongPress={() => setShowDebugModal(true)}
          delayLongPress={500}
        >
          <Image source={require('@/assets/ui/settings.png')} style={styles.headerIcon} />
        </Pressable>

        <BeanCounter size="medium" />
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        {/* Title */}
        <Text style={styles.title}>Whats the vibe?</Text>

        {/* Cafe Carousel */}
        <View style={styles.carouselSection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.carouselContent}
            snapToInterval={CAROUSEL_ITEM_WIDTH + CAROUSEL_ITEM_SPACING}
            decelerationRate="fast"
          >
            {CAFES.map((cafe, index) => renderCafeItem(cafe, index))}
          </ScrollView>
        </View>

        {/* Study Group Section */}
        <View style={styles.studyGroupCard}>
          <View style={styles.studyGroupHeader}>
            <Text style={styles.studyGroupEmoji}>🌳</Text>
            <Text style={styles.studyGroupTitle}>Study Group</Text>
            {lobbyGroupId && (
              <Pressable
                style={({ pressed }) => [
                  styles.cancelLobbyButton,
                  pressed && styles.cancelLobbyButtonPressed,
                ]}
                onPress={cancelLobby}
              >
                <Text style={styles.cancelLobbyText}>Cancel</Text>
              </Pressable>
            )}
          </View>
          
          <View style={styles.studySlots}>
            {lobbySlots.map((slot, index) => renderStudySlot(slot, index))}
          </View>

          <Text style={styles.studyGroupHint}>
            {hasAnyInvites && !hasReadyFriends
              ? 'Waiting for friends to accept...'
              : 'Earn bonus gems when studying with friends'}
          </Text>
        </View>

        {/* Go to Cafe Button */}
        <Pressable
          style={({ pressed }) => [
            styles.goToCafeButton,
            buttonDisabled && styles.goToCafeButtonDisabled,
            pressed && !buttonDisabled && styles.goToCafeButtonPressed,
          ]}
          onPress={handleGoToCafe}
          disabled={buttonDisabled}
        >
          <Text style={styles.goToCafeText}>{buttonText}</Text>
        </Pressable>
      </View>

      {/* Bottom Navigation */}
      <View style={[styles.navbar, { paddingBottom: insets.bottom + 12 }]}>
        <View style={styles.navButtonsContainer}>
          {/* Social Tab */}
          <Pressable
            style={({ pressed }) => [
              styles.navButton,
              activeTab === 'social' && styles.navButtonActive,
              pressed && styles.navButtonPressed,
            ]}
            onPress={() => handleTabPress('social')}
          >
            <Text style={styles.navButtonEmoji}>👥</Text>
            {pendingRequestsCount > 0 && (
              <View style={styles.navBadge}>
                <Text style={styles.navBadgeText}>{pendingRequestsCount}</Text>
              </View>
            )}
          </Pressable>

          {/* Home Tab */}
          <Pressable
            style={({ pressed }) => [
              styles.navButton,
              activeTab === 'main' && styles.navButtonActive,
              pressed && styles.navButtonPressed,
            ]}
            onPress={() => handleTabPress('main')}
          >
            <Image
              source={require('@/assets/ui/home.png')}
              style={styles.navButtonIcon}
            />
          </Pressable>

          {/* Shop Tab */}
          <Pressable
            style={({ pressed }) => [
              styles.navButton,
              activeTab === 'shop' && styles.navButtonActive,
              pressed && styles.navButtonPressed,
            ]}
            onPress={() => handleTabPress('shop')}
          >
            <Text style={styles.navButtonEmoji}>🛒</Text>
          </Pressable>
        </View>
      </View>

      {/* Lobby Duration Modal - shown when creating a group lobby */}
      <LobbyDurationModal
        visible={showDurationModal}
        onSelect={handleDurationSelected}
        onCancel={() => setShowDurationModal(false)}
      />

      {/* Friend Picker Modal */}
      <FriendPickerModal
        visible={showingFriendPicker}
        onClose={() => setShowingFriendPicker(false)}
      />

      {/* Incoming Invite Modal */}
      <InviteReceivedModal
        visible={showingInviteModal}
        invite={currentInvite}
        onClose={dismissInviteModal}
      />

      {/* Debug Modal (long press settings) */}
      <DebugModal
        visible={showDebugModal}
        onClose={() => setShowDebugModal(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5EDD8',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FFF8E7',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#5D4037',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerButtonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.95 }],
  },
  headerIcon: {
    width: 28,
    height: 28,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#6B5344',
    textAlign: 'center',
    marginTop: 4,
    fontFamily: 'ui-rounded',
  },
  carouselSection: {
    flex: 1,
    justifyContent: 'center',
  },
  carouselContent: {
    paddingHorizontal: (SCREEN_WIDTH - CAROUSEL_ITEM_WIDTH) / 2,
    gap: CAROUSEL_ITEM_SPACING,
    alignItems: 'center',
  },
  cafeCard: {
    width: CAROUSEL_ITEM_WIDTH,
    alignItems: 'center',
    padding: 8,
    borderRadius: 16,
  },
  cafeCardSelected: {
    transform: [{ scale: 1.02 }],
  },
  cafeImageContainer: {
    width: CAROUSEL_ITEM_WIDTH - 16,
    height: CAROUSEL_ITEM_WIDTH - 16,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  cafeImage: {
    width: '100%',
    height: '100%',
  },
  cafeImageLocked: {
    opacity: 0.4,
  },
  lockIconContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockIcon: {
    fontSize: 40,
  },
  cafeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#5D4037',
    marginTop: 4,
    fontFamily: 'ui-rounded',
  },
  studyGroupCard: {
    marginHorizontal: 20,
    backgroundColor: '#FFF8E7',
    borderRadius: 20,
    padding: 14,
    shadowColor: '#5D4037',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  studyGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  studyGroupEmoji: {
    fontSize: 24,
    marginRight: 8,
  },
  studyGroupTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#5D4037',
    fontFamily: 'ui-rounded',
    flex: 1,
  },
  cancelLobbyButton: {
    backgroundColor: '#E57373',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  cancelLobbyButtonPressed: {
    opacity: 0.8,
  },
  cancelLobbyText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFF',
  },
  studySlots: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  studySlot: {
    flex: 1,
    backgroundColor: '#F5EDD8',
    borderRadius: 12,
    padding: 8,
    alignItems: 'center',
    position: 'relative',
  },
  slotName: {
    fontSize: 11,
    fontWeight: '600',
    color: '#5D4037',
    marginBottom: 4,
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: '#E8DBC4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarEmoji: {
    fontSize: 26,
  },
  addFriendText: {
    fontSize: 10,
    color: '#8B7355',
    marginBottom: 4,
  },
  addFriendIcon: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: '#E8DBC4',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#D4C4A8',
    borderStyle: 'dashed',
  },
  plusIcon: {
    fontSize: 28,
    color: '#A89880',
    fontWeight: '300',
  },
  statusBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pendingBadge: {
    backgroundColor: '#FFE4B5',
  },
  readyBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#90BE6D',
    justifyContent: 'center',
    alignItems: 'center',
  },
  readyBadgeText: {
    fontSize: 12,
    color: '#FFF',
  },
  statusBadgeText: {
    fontSize: 10,
  },
  removeSlotButton: {
    position: 'absolute',
    top: 2,
    left: 2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#E57373',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeSlotText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFF',
    marginTop: -1,
  },
  studyGroupHint: {
    fontSize: 12,
    color: '#8B7355',
    marginTop: 12,
    textAlign: 'left',
  },
  goToCafeButton: {
    marginHorizontal: 20,
    marginTop: 16,
    backgroundColor: '#90BE6D',
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
    shadowColor: '#5D4037',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  goToCafeButtonDisabled: {
    backgroundColor: '#C4C4C4',
  },
  goToCafeButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  goToCafeText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'ui-rounded',
  },
  navbar: {
    backgroundColor: '#EDE4CF',
    paddingTop: 16,
    paddingHorizontal: 24,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    shadowColor: '#5D4037',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
  },
  navButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  navButton: {
    width: 64,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#F5E9B8',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#5D4037',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    position: 'relative',
  },
  navButtonActive: {
    backgroundColor: '#F5E9B8',
  },
  navButtonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.95 }],
  },
  navButtonIcon: {
    width: 36,
    height: 36,
  },
  navButtonEmoji: {
    fontSize: 28,
  },
  navBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#FF6B6B',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  navBadgeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
  },
});
