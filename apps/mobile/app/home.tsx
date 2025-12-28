import { useState, useMemo } from 'react';
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
import { useAuth } from '@/lib/firebase';
import { BeanCounter } from '@/components/ui';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CAROUSEL_ITEM_WIDTH = SCREEN_WIDTH * 0.55;
const CAROUSEL_ITEM_SPACING = 12;

// Cafe data
const CAFES = [
  {
    id: 'korea-cafe',
    name: 'cafe in korea',
    image: require('@/assets/ui/koreacafe.png'),
    locked: false,
  },
  {
    id: 'boston-library',
    name: 'boston library',
    image: require('@/assets/ui/bostonlibrary.png'),
    locked: true,
  },
];

// Study group placeholder slots (empty slots for friends)
const EMPTY_FRIEND_SLOTS = [
  { id: '2', name: null, avatar: null, filled: false },
  { id: '3', name: null, avatar: null, filled: false },
];

type NavTab = 'profile' | 'main' | 'shop';

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [selectedCafe, setSelectedCafe] = useState(0);
  const [activeTab, setActiveTab] = useState<NavTab>('main');

  const { userDoc } = useAuth();

  // Get user's display name (first name only for UI)
  const userName = useMemo(() => {
    if (!userDoc?.displayName) return 'You';
    // Get first name only
    return userDoc.displayName.split(' ')[0];
  }, [userDoc?.displayName]);

  // Study group slots with current user first
  const studyGroupSlots = useMemo(() => [
    { id: '1', name: userName.toLowerCase(), avatar: '👦', filled: true },
    ...EMPTY_FRIEND_SLOTS,
  ], [userName]);

  const handleGoToCafe = () => {
    if (!CAFES[selectedCafe].locked) {
      router.push('/game');
    }
  };

  const handleTabPress = (tab: NavTab) => {
    setActiveTab(tab);
    if (tab === 'profile') {
      router.push('/profile');
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

  const renderStudySlot = (slot: { id: string; name: string | null; avatar: string | null; filled: boolean }) => (
    <View key={slot.id} style={styles.studySlot}>
      {slot.filled ? (
        <>
          <Text style={styles.slotName}>{slot.name}</Text>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarEmoji}>{slot.avatar}</Text>
          </View>
        </>
      ) : (
        <>
          <Text style={styles.addFriendText}>add friend</Text>
          <View style={styles.addFriendIcon}>
            <Text style={styles.plusIcon}>+</Text>
          </View>
        </>
      )}
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>

      {/* Header */}
      <View style={styles.header}>
        <Pressable
          style={({ pressed }) => [styles.headerButton, pressed && styles.headerButtonPressed]}
          onPress={() => router.push('/settings')}
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
          </View>
          
          <View style={styles.studySlots}>
            {studyGroupSlots.map(renderStudySlot)}
          </View>

          <Text style={styles.studyGroupHint}>
            Earn bonus gems when studying with friends
          </Text>
        </View>

        {/* Go to Cafe Button */}
        <Pressable
          style={({ pressed }) => [
            styles.goToCafeButton,
            CAFES[selectedCafe].locked && styles.goToCafeButtonDisabled,
            pressed && !CAFES[selectedCafe].locked && styles.goToCafeButtonPressed,
          ]}
          onPress={handleGoToCafe}
          disabled={CAFES[selectedCafe].locked}
        >
          <Text style={styles.goToCafeText}>
            {CAFES[selectedCafe].locked ? 'Locked' : 'Go to café'}
          </Text>
        </Pressable>
      </View>

      {/* Bottom Navigation */}
      <View style={[styles.navbar, { paddingBottom: insets.bottom + 12 }]}>
        <View style={styles.navButtonsContainer}>
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
});

