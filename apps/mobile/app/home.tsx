import { useState, useEffect, useCallback, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  Pressable,
  Dimensions,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useAuth, groupsService } from '@/lib/firebase';
import { useSocialStore, type LobbySlot } from '@/lib/social';
import { BeanCounter, Button } from '@/components/ui';
import { FriendPickerModal, InviteReceivedModal, LobbyDurationModal } from '@/components/social';
import { DebugModal } from '@/components/debug-modal';
import { GodotGame } from '@/components/godot-view';
import { SceneTransition } from '@/components/scene-transition';
import { isGodotReady, changeScene, setUserCharacter, setSelectedCafe as setGodotCafe } from '@/lib/godot';
import { PCK_URL } from '@/constants/game';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CAROUSEL_ITEM_WIDTH = SCREEN_WIDTH * 0.65;
const CAROUSEL_ITEM_SPACING = 16;

// Cafe data
const CAFES = [
  {
    id: 'boston-library',
    name: 'boston library',
    flag: '🇺🇸',
    buildingId: 'library',
    buildingName: 'Boston Library',
    image: require('@/assets/ui/cafeLibrary.png'),
    locked: false,
    studyingNow: 2507, // most people here
  },
  // {
  //   id: 'korea-cafe',
  //   name: 'lofi seoul cafe',
  //   flag: '🇰🇷',
  //   buildingId: 'cafe',
  //   buildingName: 'Brooklyn Cafe',
  //   image: require('@/assets/ui/cafeCabin.png'),
  //   locked: false,
  //   studyingNow: 1500,
  // },
  {
    id: 'europe-cafe',
    name: 'stockholm cafe',
    flag: '🇸🇪',
    buildingId: 'coastal',
    buildingName: 'Stockholm Café',
    image: require('@/assets/ui/cafeEurope.png'),
    locked: false,
    studyingNow: 802,
  },
  {
    id: 'ghibli-cafe',
    name: 'ghibli café',
    flag: '🌳',
    buildingId: 'ghibli',
    buildingName: 'Forest Hideaway',
    image: require('@/assets/ui/cafeGhibli.png'),
    locked: false,
    studyingNow: 423,
  },
  {
    id: 'japan-cafe',
    name: 'tokyo café',
    flag: '🇯🇵',
    buildingId: 'japan',
    buildingName: 'Japanese Cafe',
    image: require('@/assets/ui/cafeJapan.png'),
    locked: false,
    studyingNow: 137,
  },
];

// Animated Cafe Card component
const AnimatedCafeCard = ({ 
  cafe, 
  isSelected, 
  onPress 
}: { 
  cafe: typeof CAFES[0]; 
  isSelected: boolean; 
  onPress: () => void;
}) => {
  const scale = useSharedValue(isSelected ? 1 : 0.75);
  const opacity = useSharedValue(isSelected ? 1 : 0.5);

  useEffect(() => {
    const springConfig = { damping: 20, stiffness: 300, overshootClamping: true };
    scale.value = withSpring(isSelected ? 1 : 0.75, springConfig);
    opacity.value = withSpring(isSelected ? 1 : 0.5, springConfig);
  }, [isSelected]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Pressable onPress={onPress} style={styles.cafeCardPressable}>
      <Animated.View style={[styles.cafeCard, animatedStyle]}>
        <View style={styles.cafeImageContainer}>
          <Image
            source={cafe.image}
            style={[styles.cafeImage, cafe.locked && styles.cafeImageLocked]}
            resizeMode="contain"
          />
          {cafe.locked && (
            <View style={styles.lockOverlay}>
              <Image source={require('@/assets/ui/lock.png')} style={styles.lockIcon} />
            </View>
          )}
        </View>
      </Animated.View>
    </Pressable>
  );
};

type NavTab = 'profile' | 'main' | 'shop';

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [selectedCafe, setSelectedCafe] = useState(0);
  const [activeTab, setActiveTab] = useState<NavTab>('main');
  const [showDebugModal, setShowDebugModal] = useState(false);
  const [showDurationModal, setShowDurationModal] = useState(false);
  const [sceneTransitioning, setSceneTransitioning] = useState(true); // Start with transition visible
  const [pckLoading, setPckLoading] = useState(true);
  const [pckDownloadProgress, setPckDownloadProgress] = useState<number | undefined>(undefined);

  // Triple tap debug trigger
  const tapTimesRef = useRef<number[]>([]);
  const handleTripleTap = useCallback(() => {
    const now = Date.now();
    const recentTaps = tapTimesRef.current.filter((t) => now - t < 500);
    recentTaps.push(now);
    tapTimesRef.current = recentTaps;
    
    if (recentTaps.length >= 3) {
      setShowDebugModal(true);
      tapTimesRef.current = [];
    }
  }, []);

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
  const setSelectedBuilding = useSocialStore((s) => s.setSelectedBuilding);
  const initialize = useSocialStore((s) => s.initialize);

  // Initialize social store
  useEffect(() => {
    if (user) {
      const cleanup = initialize(user.uid);
      return cleanup;
    }
  }, [user, initialize]);

  // Lock to portrait orientation when this screen is focused
  useFocusEffect(
    useCallback(() => {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    }, [])
  );

  // Switch to home showcase scene when screen is focused
  // Shows transition overlay while scene changes
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      
      // Show transition overlay when screen becomes active
      setSceneTransitioning(true);
      
      const attemptSceneChange = () => {
        if (cancelled) return;
        
        if (!isGodotReady()) {
          console.log('[Home] Godot not ready yet, waiting...');
          setTimeout(attemptSceneChange, 300);
          return;
        }
        
        console.log('[Home] Switching to home_showcase scene');
        changeScene('home_showcase');
        
        // Wait for scene change to complete, then apply character and hide overlay
        setTimeout(() => {
          if (cancelled) return;
          
          // Apply saved character appearance
          if (userDoc?.characterSkin) {
            setUserCharacter(userDoc.characterSkin);
            console.log('[Home] Applied saved character skin');
          }
          
          // Hide transition overlay after scene is ready
          setTimeout(() => {
            if (!cancelled) {
              setSceneTransitioning(false);
            }
          }, 100);
        }, 350);
      };
      
      // Start scene change after a brief delay
      const timer = setTimeout(attemptSceneChange, 200);
      
      return () => {
        cancelled = true;
        clearTimeout(timer);
      };
    }, [userDoc?.characterSkin])
  );

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

  const handleGoToCafe = useCallback(async () => {
    if (CAFES[selectedCafe].locked) return;

    // Set selected building for game screen
    setSelectedBuilding(CAFES[selectedCafe].buildingId);

    // Group session logic - commented out for now
    // const hasReadyFriends = lobbySlots.slice(1).some(s => s.status === 'ready');
    // if (lobbyGroupId && lobbyHostId && hasReadyFriends) {
    //   try {
    //     await groupsService.startGroupSession(lobbyGroupId, lobbyHostId);
    //     console.log('[Home] Started group session:', lobbyGroupId);
    //   } catch (error) {
    //     console.error('[Home] Failed to start group session:', error);
    //   }
    // }

    router.push('/game');
  }, [selectedCafe, router, setSelectedBuilding]);

  const scrollViewRef = useRef<ScrollView>(null);
  const lastGodotCafeRef = useRef<number>(0);

  // Immediate Godot café update - just prevents duplicate calls
  const updateGodotCafe = useCallback((index: number) => {
    if (index !== lastGodotCafeRef.current) {
      lastGodotCafeRef.current = index;
      setGodotCafe(index);
    }
  }, []);

  const handleScroll = useCallback((event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / (CAROUSEL_ITEM_WIDTH + CAROUSEL_ITEM_SPACING));
    const clampedIndex = Math.max(0, Math.min(index, CAFES.length - 1));
    if (clampedIndex !== selectedCafe) {
      setSelectedCafe(clampedIndex);
    }
    // Sync with Godot immediately
    updateGodotCafe(clampedIndex);
  }, [selectedCafe, updateGodotCafe]);

  const navigateCarousel = useCallback((direction: 'prev' | 'next') => {
    const newIndex = direction === 'next' 
      ? Math.min(selectedCafe + 1, CAFES.length - 1)
      : Math.max(selectedCafe - 1, 0);
    
    setSelectedCafe(newIndex);
    // Let handleScroll trigger Godot update as the scroll animates
    scrollViewRef.current?.scrollTo({
      x: newIndex * (CAROUSEL_ITEM_WIDTH + CAROUSEL_ITEM_SPACING),
      animated: true,
    });
  }, [selectedCafe]);

  const handleTabPress = (tab: NavTab) => {
    setActiveTab(tab);
    if (tab === 'profile') {
      router.push('/profile');
    } else if (tab === 'shop') {
      router.push('/store');
    }
  };

  // Handle PCK loading state changes
  const handlePckLoadingChange = useCallback((isLoading: boolean, downloadProgress?: number) => {
    setPckLoading(isLoading);
    setPckDownloadProgress(downloadProgress);
  }, []);

  // Button state - simplified (group logic commented out)
  const currentCafe = CAFES[selectedCafe];
  const isLocked = currentCafe.locked;
  const isDownloading = pckDownloadProgress !== undefined;
  const downloadPercent = isDownloading ? Math.round(pckDownloadProgress * 100) : 0;
  
  // Button text and disabled state
  let buttonText = 'Go to cafe';
  let buttonDisabled = false;
  
  if (isLocked) {
    buttonText = 'Locked';
    buttonDisabled = true;
  } else if (pckLoading) {
    buttonText = isDownloading ? `Updating... ${downloadPercent}%` : 'Loading...';
    buttonDisabled = true;
  }
  
  // Group study logic - commented out for now
  // const hasReadyFriends = lobbySlots.slice(1).some(s => s.status === 'ready');
  // const hasAnyInvites = lobbySlots.slice(1).some(s => s.status !== 'empty');

  return (
    <LinearGradient
      colors={['#FEE2AA', '#F6F4E7','#F6F4E7']}
      style={[styles.container, { paddingTop: insets.top }]}
      onTouchEnd={handleTripleTap}
    >
      {/* Plant decoration - top left */}
      <Image
        source={require('@/assets/ui/plant.png')}
        style={styles.plantDecoration}
        resizeMode="contain"
      />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft} />
        <View style={styles.headerRight}>
          <BeanCounter size="small" />
          
          {/* Settings Button */}
          <Pressable
            style={({ pressed }) => [styles.settingsButton, pressed && styles.settingsButtonPressed]}
            onPress={() => router.push('/settings')}
          >
            <Image source={require('@/assets/ui/settings.png')} style={styles.settingsIcon} />
          </Pressable>
        </View>
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        {/* Title */}
        <Text style={styles.title}>Where do you{'\n'}want to go?</Text>

        {/* Location Badge */}
        <View style={styles.locationBadgeContainer}>
          <View style={styles.locationBadge}>
            <Text style={styles.locationFlag}>{currentCafe.flag}</Text>
            <Text style={styles.locationName}>{currentCafe.name}</Text>
          </View>
        </View>

        {/* Cafe Carousel */}
        <View style={styles.carouselSection}>
          {/* Left Arrow */}
          {selectedCafe > 0 && (
            <Pressable
              style={[styles.carouselArrow, styles.carouselArrowLeft]}
              onPress={() => navigateCarousel('prev')}
            >
              <Image 
                source={require('@/assets/ui/chevron.png')} 
                style={[styles.arrowIcon, styles.arrowIconLeft]} 
              />
            </Pressable>
          )}

          <ScrollView
            ref={scrollViewRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.carouselContent}
            snapToInterval={CAROUSEL_ITEM_WIDTH + CAROUSEL_ITEM_SPACING}
            decelerationRate="fast"
            onScroll={handleScroll}
            scrollEventThrottle={16}
          >
            {CAFES.map((cafe, index) => (
              <AnimatedCafeCard
                key={cafe.id}
                cafe={cafe}
                isSelected={selectedCafe === index}
                onPress={() => {
                  setSelectedCafe(index);
                  // Scroll to center the card, handleScroll will trigger Godot update
                  scrollViewRef.current?.scrollTo({
                    x: index * (CAROUSEL_ITEM_WIDTH + CAROUSEL_ITEM_SPACING),
                    animated: true,
                  });
                }}
              />
            ))}
          </ScrollView>

          {/* Right Arrow */}
          {selectedCafe < CAFES.length - 1 && (
            <Pressable
              style={[styles.carouselArrow, styles.carouselArrowRight]}
              onPress={() => navigateCarousel('next')}
            >
              <Image 
                source={require('@/assets/ui/chevron.png')} 
                style={styles.arrowIcon} 
              />
            </Pressable>
          )}
        </View>

        {/* Character Showcase Card */}
        <View style={styles.studyGroupCard}>
          <View style={styles.studyGroupHeader}>
            <Image source={require('@/assets/ui/leaf.png')} style={styles.studyGroupLeaf} />
            <Text style={styles.studyGroupTitle}>
              {currentCafe.studyingNow} studying now
            </Text>
            <Text style={styles.studyGroupSubtitle}> - join a table</Text>
          </View>

          {/* Godot Character Showcase */}
          <View style={styles.characterShowcase}>
            <GodotGame 
              style={styles.godotView} 
              pckUrl={PCK_URL} 
              onLoadingChange={handlePckLoadingChange}
            />
            <SceneTransition 
              visible={sceneTransitioning} 
              backgroundColor="#ffefd6"
              fadeDuration={400}
            />
            {/* Loading overlay for PCK download */}
            {pckLoading && (
              <View style={styles.showcaseLoading}>
                <ActivityIndicator size="large" color="#8B7355" />
                <Text style={styles.showcaseLoadingText}>
                  {isDownloading ? `Updating... ${downloadPercent}%` : 'Loading...'}
                </Text>
                {isDownloading && (
                  <View style={styles.progressBarContainer}>
                    <View style={[styles.progressBar, { width: `${downloadPercent}%` }]} />
                  </View>
                )}
              </View>
            )}
            {/* "you" label at bottom */}
            <View style={styles.youLabelContainer}>
              <Text style={styles.youLabel}>you</Text>
            </View>
          </View>
        </View>

        {/* Go to Cafe Button */}
        <Button
          title={buttonText}
          onPress={handleGoToCafe}
          disabled={buttonDisabled}
          style={styles.goToCafeButton}
        />
      </View>

      {/* Bottom Floating Navbar */}
      <View style={[styles.navbarContainer, { paddingBottom: insets.bottom }]}>
        <LinearGradient
          colors={['#F6F4E7', '#F1ECCC']}
          style={styles.navbar}
        >
          {/* Profile Tab */}
          <Pressable
            style={({ pressed }) => [
              styles.navButton,
              pressed && styles.navButtonPressed,
            ]}
            onPress={() => handleTabPress('profile')}
          >
            <Image source={require('@/assets/ui/social.png')} style={styles.navIcon} />
          </Pressable>

          {/* Home Tab */}
          <Pressable
            style={({ pressed }) => [
              styles.navButton,
              pressed && styles.navButtonPressed,
            ]}
            onPress={() => handleTabPress('main')}
          >
            <Image source={require('@/assets/ui/home.png')} style={styles.navIcon} />
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
            <Image source={require('@/assets/ui/store.png')} style={styles.navIcon} />
          </Pressable>
        </LinearGradient>
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

      {/* Debug Modal (triple tap anywhere) */}
      <DebugModal
        visible={showDebugModal}
        onClose={() => setShowDebugModal(false)}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  plantDecoration: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: SCREEN_WIDTH * 0.35,
    height: SCREEN_HEIGHT * 0.25,
    zIndex: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
    zIndex: 5,
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  settingsButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFF8E7',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#F5D98C',
  },
  settingsButtonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.95 }],
  },
  settingsIcon: {
    width: 26,
    height: 26,
    resizeMode: 'contain',
  },
  content: {
    flex: 1,
    paddingBottom: 120,
  },
  title: {
    fontSize: 36,
    fontFamily: 'Poppins_600SemiBold',
    color: '#8F6930',
    textAlign: 'right',
    lineHeight: 42,
    marginTop: 8,
    paddingRight: 30,
  },
  locationBadgeContainer: {
    alignItems: 'center',
    marginTop: 18,
  },
  locationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    opacity: 0.8,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 24,
    shadowColor: '#8B7355',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  locationFlag: {
    fontSize: 18,
    marginRight: 8,
  },
  locationName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
  },
  carouselSection: {
    flex: 1,
    justifyContent: 'center',
    position: 'relative',
  },
  carouselArrow: {
    position: 'absolute',
    top: '50%',
    marginTop: -24,
    zIndex: 10,
    padding: 8,
  },
  carouselArrowLeft: {
    left: 14,
  },
  carouselArrowRight: {
    right: 14,
  },
  arrowIcon: {
    width: 48,
    height: 48,
    resizeMode: 'contain',
  },
  arrowIconLeft: {
    transform: [{ scaleX: -1 }],
  },
  carouselContent: {
    paddingHorizontal: (SCREEN_WIDTH - CAROUSEL_ITEM_WIDTH) / 2,
    paddingBottom: 18,
    gap: CAROUSEL_ITEM_SPACING,
    alignItems: 'center',
  },
  cafeCardPressable: {
    width: CAROUSEL_ITEM_WIDTH,
  },
  cafeCard: {
    width: CAROUSEL_ITEM_WIDTH,
    alignItems: 'center',
    padding: 8,
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
  lockOverlay: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockIcon: {
    width: 48,
    height: 48,
    resizeMode: 'contain',
  },
  studyGroupCard: {
    marginHorizontal: 20,
    backgroundColor: '#FFEFD6',
    borderRadius: 24,
    borderWidth: 3,
    borderBottomWidth: 8,
    borderColor: '#83715B',
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  studyGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  studyGroupLeaf: {
    width: 24,
    height: 24,
    marginTop: 4,
    marginRight: 2,
  },
  studyGroupTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#822B00',
  },
  studyGroupSubtitle: {
    fontSize: 18,
    fontWeight: '400',
    color: '#A89880',
  },
  youLabelContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  youLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A4A4A',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    overflow: 'hidden',
  },
  characterShowcase: {
    height: 150,
    backgroundColor: '#FFEFD6',
    overflow: 'hidden',
    position: 'relative',
  },
  godotView: {
    flex: 1,
    backgroundColor: '#FCEFC5',
  },
  showcaseLoading: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FCEFC5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  showcaseLoadingText: {
    color: '#8B7355',
    marginTop: 12,
    fontSize: 14,
    fontWeight: '500',
  },
  progressBarContainer: {
    width: 160,
    height: 4,
    backgroundColor: '#E8DDD0',
    borderRadius: 2,
    marginTop: 10,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#8B7355',
    borderRadius: 2,
  },
  goToCafeButton: {
    marginHorizontal: 20,
    marginTop: 12,
  },
  navbarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  navbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFEFD6',
    borderRadius: 100,
    borderWidth: 2,
    borderColor: '#83715B' + '40',
    paddingVertical: 4,
    paddingHorizontal: 24,
    gap: 32,
  },
  navButton: {
    width: 60,
    height: 60,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  navButtonActive: {
    backgroundColor: '#78ADFD',
    borderRadius: 16,
  },
  navButtonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.95 }],
  },
  navIcon: {
    width: 48,
    height: 48,
    resizeMode: 'contain',
  },
  navBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
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
