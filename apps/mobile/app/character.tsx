import { useState, useCallback, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  ScrollView,
  Dimensions,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GodotGame } from '@/components/godot-view';
import { SceneTransition } from '@/components/scene-transition';
import { isGodotReady, changeScene, setUserCharacter, setShowcaseCameraZoom, type CharacterSkin, type CameraZoomTarget } from '@/lib/godot';
import { BackButton } from '@/components/ui';
import { useAuth, userService } from '@/lib/firebase';
import { PCK_URL } from '@/constants/game';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_COLUMNS = 3;
const SWATCH_SIZE = (SCREEN_WIDTH - 80) / GRID_COLUMNS;
const CARD_SIZE = (SCREEN_WIDTH - 80) / GRID_COLUMNS;

// Tab type
type TabType = 'Skin tone' | 'Face' | 'Hair';

// Face preview images
const FACE_IMAGES: Record<number, any> = {
  0: require('@/assets/ui/faces/face1really.png'),
  1: require('@/assets/ui/faces/face2really.png'),
  2: require('@/assets/ui/faces/face3realy.png'),
  3: require('@/assets/ui/faces/face4really.png'),
  4: require('@/assets/ui/faces/face5really.png'),
  5: require('@/assets/ui/faces/face6really.png'),
  6: require('@/assets/ui/faces/face7really.png'),
  7: require('@/assets/ui/faces/face8really.png'),
  8: require('@/assets/ui/faces/face9really.png'),
  9: require('@/assets/ui/faces/face10really.png'),
  10: require('@/assets/ui/faces/face11really.png'),
  11: require('@/assets/ui/faces/face12really.png'),
  12: require('@/assets/ui/faces/face13really.png'),
  13: require('@/assets/ui/faces/face14really.png'),
  14: require('@/assets/ui/faces/face15really.png'),
};

// Hair preview images
const HAIR_IMAGES: Record<number, any> = {
  0: require('@/assets/ui/hair/none.png'),
  1: require('@/assets/ui/hair/Afro.png'),
  2: require('@/assets/ui/hair/babybangs.png'),
  3: require('@/assets/ui/hair/longWavy.png'),
  4: require('@/assets/ui/hair/messyknotbun.png'),
  5: require('@/assets/ui/hair/messySpiky.png'),
  6: require('@/assets/ui/hair/mullet.png'),
  7: require('@/assets/ui/hair/starbuns.png'),
  8: require('@/assets/ui/hair/wavymiddlepart.png'),
};

// Skin tone colors (matching Godot's CozyLife skin tones)
// Order: Index 0-9 maps to Godot's T_BODY_Human_01 through T_BODY_Human_10
const SKIN_TONE_COLORS = [
  '#F5D0C5', // 0 - Human_01: Light pink/peach
  '#C9A86C', // 1 - Human_02: Medium tan
  '#E8D8C8', // 2 - Human_03: Light/pale
  '#8B5A2B', // 3 - Human_04: Dark brown
  '#D4A574', // 4 - Human_05: Medium tan
  '#5D4037', // 5 - Human_06: Dark chocolate
  '#A4CE8B', // 6 - Human_07: Green
  '#A7B5EA', // 7 - Human_08: Blue
  '#C5A3EA', // 8 - Human_09: Purple
  '#E96160', // 9 - Human_10: Red
];

// Eye color swatches (matching Godot's EYE_COLORS)
const EYE_COLOR_SWATCHES = [
  '#4A3728', // 0 - Default (brown)
  '#4A90D9', // 1 - Blue
  '#3D2314', // 2 - DarkBrown
  '#4CAF50', // 3 - Green
  '#8B6914', // 4 - LightBrown
  '#E91E63', // 5 - Pink
  '#9C27B0', // 6 - Purple
  '#F44336', // 7 - Red
  '#009688', // 8 - Teal
  '#F5F5F5', // 9 - White
  '#FFEB3B', // 10 - Yellow
];

// Hair color swatches (matching Godot's HAIR_COLORS)
const HAIR_COLOR_SWATCHES = [
  '#4A3728', // 0 - Default (brown)
  '#1A1A1A', // 1 - Black
  '#F5DEB3', // 2 - Blonde
  '#2196F3', // 3 - Blue
  '#00BCD4', // 4 - Cyan
  '#3D2314', // 5 - DarkBrown
  '#D84315', // 6 - Ginger
  '#9E9E9E', // 7 - Gray
  '#4CAF50', // 8 - Green
  '#FF69B4', // 9 - Holo (use pink as base)
  '#A67C52', // 10 - LightBrown
  '#800000', // 11 - Maroon
  '#FFB6C1', // 12 - PastelPink
  '#FF69B4', // 13 - Pink
  '#9C27B0', // 14 - Purple
  '#F44336', // 15 - Red
  '#FF6B6B', // 16 - Sunset (use coral as base)
  '#009688', // 17 - Teal
  '#4A0E4E', // 18 - Vampy (dark purple)
  '#FFFFFF', // 19 - White
  '#FFEB3B', // 20 - Yellow
];

// Default character selections
const DEFAULT_CHARACTER: CharacterSkin = {
  SkinTone: 0,
  Face: 0,
  EyeColor: 0,
  Hair: 1,
  HairColor: 0,
  Top: 1,
  Bottom: 3,
  Shoes: 2,
  Hat: 0,
  Glasses: 0,
};

export default function CharacterScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, userDoc } = useAuth();
  
  const [sceneTransitioning, setSceneTransitioning] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('Skin tone');
  const [character, setCharacter] = useState<CharacterSkin>(DEFAULT_CHARACTER);
  const [isInitialized, setIsInitialized] = useState(false);
  
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load saved character from Firestore on mount
  useEffect(() => {
    if (userDoc?.characterSkin && !isInitialized) {
      const savedSkin = { ...DEFAULT_CHARACTER, ...userDoc.characterSkin };
      setCharacter(savedSkin);
      setIsInitialized(true);
    } else if (userDoc && !userDoc.characterSkin && !isInitialized) {
      setIsInitialized(true);
    }
  }, [userDoc, isInitialized]);

  // Track if initial character has been sent to Godot
  const initialCharacterSentRef = useRef(false);
  
  // Switch to character_showcase scene when screen is focused
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setSceneTransitioning(true);
      initialCharacterSentRef.current = false;
      
      const attemptSceneChange = () => {
        if (cancelled) return;
        if (!isGodotReady()) {
          setTimeout(attemptSceneChange, 300);
          return;
        }
        
        changeScene('character_showcase');
        
        setTimeout(() => {
          if (cancelled) return;
          
          // Reset camera to full body (default) view
          setShowcaseCameraZoom('default');
          
          // Character will be sent via the separate effect below
          initialCharacterSentRef.current = true;
          setTimeout(() => {
            if (!cancelled) setSceneTransitioning(false);
          }, 100);
        }, 350);
      };
      
      const timer = setTimeout(attemptSceneChange, 200);
      return () => {
        cancelled = true;
        clearTimeout(timer);
      };
    }, [])
  );
  
  // Send character to Godot when it changes (separate from scene change)
  useEffect(() => {
    if (initialCharacterSentRef.current && isGodotReady()) {
      setUserCharacter(character);
    }
  }, [character]);

  // Save character to Firestore (debounced)
  const saveCharacterToFirestore = useCallback((newCharacter: CharacterSkin) => {
    if (!user) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await userService.updateCharacterSkin(user.uid, newCharacter);
      } catch (error) {
        console.error('[Character] Failed to save:', error);
      }
    }, 1000);
  }, [user]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  // Update character
  const updateCharacter = useCallback((key: keyof CharacterSkin, value: number) => {
    const newCharacter = { ...character, [key]: value };
    setCharacter(newCharacter);
    if (isGodotReady()) setUserCharacter(newCharacter);
    saveCharacterToFirestore(newCharacter);
  }, [character, saveCharacterToFirestore]);

  // Get camera zoom target based on tab
  const getCameraZoomForTab = (tab: TabType): CameraZoomTarget => {
    switch (tab) {
      case 'Face':
      case 'Hair':
        return 'head';
      case 'Skin tone':
      default:
        return 'default';
    }
  };

  // Handle tab change with camera zoom
  const handleTabChange = useCallback((tab: TabType) => {
    setActiveTab(tab);
    if (isGodotReady()) {
      setShowcaseCameraZoom(getCameraZoomForTab(tab));
    }
  }, []);

  // Render color swatch row (horizontal scrolling)
  const renderColorRow = (colors: string[], selectedIndex: number, onSelect: (index: number) => void) => (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.colorRow}
    >
      {colors.map((color, index) => (
        <Pressable
          key={index}
          style={styles.smallSwatchContainer}
          onPress={() => onSelect(index)}
        >
          <View style={[styles.smallSwatch, { backgroundColor: color }]}>
            {selectedIndex === index && (
              <View style={styles.checkmarkBadgeSmall}>
                <Text style={styles.checkmarkTextSmall}>✓</Text>
              </View>
            )}
          </View>
        </Pressable>
      ))}
    </ScrollView>
  );

  // Render skin tone grid
  const renderSkinToneGrid = () => (
    <View style={styles.swatchGrid}>
      {SKIN_TONE_COLORS.map((color, index) => (
        <Pressable
          key={index}
          style={styles.swatchContainer}
          onPress={() => updateCharacter('SkinTone', index)}
        >
          <View style={[styles.swatch, { backgroundColor: color }]}>
            {character.SkinTone === index && (
              <View style={styles.checkmarkBadge}>
                <Text style={styles.checkmarkText}>✓</Text>
              </View>
            )}
          </View>
        </Pressable>
      ))}
    </View>
  );

  // Render face grid with eye color row
  const renderFaceTab = () => (
    <>
      {/* Eye Color Row */}
      {renderColorRow(EYE_COLOR_SWATCHES, character.EyeColor ?? 0, (index) => updateCharacter('EyeColor', index))}
      
      {/* Face Cards Grid */}
      <View style={styles.cardGrid}>
        {Object.keys(FACE_IMAGES).map((key) => {
          const index = parseInt(key);
          const isSelected = character.Face === index;
          return (
            <Pressable
              key={index}
              style={styles.cardContainer}
              onPress={() => updateCharacter('Face', index)}
            >
              <View style={[styles.card, isSelected && styles.cardSelected]}>
                <Image source={FACE_IMAGES[index]} style={styles.cardImage} resizeMode="cover" />
                {isSelected && (
                  <View style={styles.checkmarkBadge}>
                    <Text style={styles.checkmarkText}>✓</Text>
                  </View>
                )}
              </View>
            </Pressable>
          );
        })}
      </View>
    </>
  );

  // Render hair grid with hair color row
  const renderHairTab = () => (
    <>
      {/* Hair Color Row */}
      {renderColorRow(HAIR_COLOR_SWATCHES, character.HairColor ?? 0, (index) => updateCharacter('HairColor', index))}
      
      {/* Hair Cards Grid */}
      <View style={styles.cardGrid}>
        {Object.keys(HAIR_IMAGES).map((key) => {
          const index = parseInt(key);
          const isSelected = character.Hair === index;
          return (
            <Pressable
              key={index}
              style={styles.cardContainer}
              onPress={() => updateCharacter('Hair', index)}
            >
              <View style={[styles.card, isSelected && styles.cardSelected]}>
                {index === 0 ? (
                  <View style={styles.emptyCard} />
                ) : (
                  <Image source={HAIR_IMAGES[index]} style={styles.cardImage} resizeMode="cover" />
                )}
                {isSelected && (
                  <View style={styles.checkmarkBadge}>
                    <Text style={styles.checkmarkText}>✓</Text>
                  </View>
                )}
              </View>
            </Pressable>
          );
        })}
      </View>
    </>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <BackButton onPress={() => router.back()} />
        <Text style={styles.headerTitle}>Customize</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Character Preview */}
      <View style={styles.previewContainer}>
        <LinearGradient colors={['#FFF5E6', '#FFF8F0', '#FFFAF5']} style={styles.previewGradient}>
          <GodotGame style={styles.godotView} pckUrl={PCK_URL} />
          <SceneTransition visible={sceneTransitioning} backgroundColor="#FFF5E6" fadeDuration={400} />
        </LinearGradient>
      </View>

      {/* Customization Panel */}
      <View style={styles.customizationPanel}>
        {/* Tabs */}
        <View style={styles.tabsContainer}>
          {(['Skin tone', 'Face', 'Hair'] as TabType[]).map((tab) => (
            <Pressable
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => handleTabChange(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Content */}
        <ScrollView style={styles.contentScroll} showsVerticalScrollIndicator={false}>
          {activeTab === 'Skin tone' && renderSkinToneGrid()}
          {activeTab === 'Face' && renderFaceTab()}
          {activeTab === 'Hair' && renderHairTab()}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5EFE6',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#5A4A3A',
  },
  headerSpacer: {
    width: 40,
  },
  previewContainer: {
    height: SCREEN_WIDTH * 0.7,
    marginHorizontal: 16,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  previewGradient: {
    flex: 1,
  },
  godotView: {
    flex: 1,
  },
  customizationPanel: {
    flex: 1,
    backgroundColor: '#FFF9F0',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    marginTop: -24,
    paddingTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
  },
  tabsContainer: {
    flexDirection: 'row',
    marginHorizontal: 24,
    backgroundColor: '#F5EFE6',
    borderRadius: 24,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 20,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: '#E8DDD0',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#A89880',
  },
  tabTextActive: {
    color: '#5A4A3A',
  },
  contentScroll: {
    flex: 1,
    marginTop: 16,
  },
  // Color row (horizontal scrolling)
  colorRow: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingBottom: 16,
    gap: 12,
  },
  smallSwatchContainer: {
    width: 44,
    height: 44,
  },
  smallSwatch: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 3,
    borderColor: '#F5EFE6',
  },
  checkmarkBadgeSmall: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#5DADE2',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  checkmarkTextSmall: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  // Skin tone swatches (large circles)
  swatchGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 24,
    gap: 16,
  },
  swatchContainer: {
    width: SWATCH_SIZE,
    height: SWATCH_SIZE,
  },
  swatch: {
    width: SWATCH_SIZE,
    height: SWATCH_SIZE,
    borderRadius: SWATCH_SIZE / 2,
    borderWidth: 4,
    borderColor: '#F5EFE6',
  },
  // Cards (face, hair)
  cardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 24,
    gap: 16,
    paddingBottom: 32,
  },
  cardContainer: {
    width: CARD_SIZE,
    height: CARD_SIZE,
  },
  card: {
    width: CARD_SIZE,
    height: CARD_SIZE,
    borderRadius: 16,
    backgroundColor: '#FFF8F0',
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: '#F5EFE6',
  },
  cardSelected: {
    borderColor: '#5DADE2',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  emptyCard: {
    flex: 1,
    backgroundColor: '#F5EFE6',
  },
  // Checkmark badge
  checkmarkBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#5DADE2',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  checkmarkText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
