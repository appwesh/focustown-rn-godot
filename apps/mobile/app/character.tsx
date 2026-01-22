import { useState, useCallback, useMemo } from 'react';
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
import { isGodotReady, changeScene, setUserCharacter, type CharacterSkin } from '@/lib/godot';
import { PCK_URL } from '@/constants/game';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_COLUMNS = 3;
const GRID_ITEM_SIZE = (SCREEN_WIDTH - 64) / GRID_COLUMNS;

// Face preview images (face1really.png through face15really.png)
const FACE_IMAGES: Record<number, any> = {
  0: require('@/assets/ui/faces/face1really.png'),
  1: require('@/assets/ui/faces/face2really.png'),
  2: require('@/assets/ui/faces/face3realy.png'),  // Note: typo in filename
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
  0: require('@/assets/ui/hair/none.png'),           // None
  1: require('@/assets/ui/hair/Afro.png'),           // Afro
  2: require('@/assets/ui/hair/babybangs.png'),      // BabyBangs
  3: require('@/assets/ui/hair/longWavy.png'),       // LongWavy
  4: require('@/assets/ui/hair/messyknotbun.png'),   // MessyKnotBun
  5: require('@/assets/ui/hair/messySpiky.png'),     // MessySpiky
  6: require('@/assets/ui/hair/mullet.png'),         // Mullet
  7: require('@/assets/ui/hair/starbuns.png'),       // StarBuns
  8: require('@/assets/ui/hair/wavymiddlepart.png'), // WavyMiddlePart
};

// Part definitions matching Godot's ModularCharacter
const PARTS = {
  SkinTone: ['Skin 1', 'Skin 2', 'Skin 3', 'Skin 4', 'Skin 5', 'Skin 6', 'Skin 7', 'Skin 8', 'Skin 9', 'Skin 10'],
  Face: ['Face 1', 'Face 2', 'Face 3', 'Face 4', 'Face 5', 'Face 6', 'Face 7', 'Face 8', 'Face 9', 'Face 10', 'Face 11', 'Face 12', 'Face 13', 'Face 14', 'Face 15'],
  EyeColor: ['Default', 'Blue', 'DarkBrown', 'Green', 'LightBrown', 'Pink', 'Purple', 'Red', 'Teal', 'White', 'Yellow'],
  Hair: ['None', 'Afro', 'BabyBangs', 'LongWavy', 'MessyKnotBun', 'MessySpiky', 'Mullet', 'StarBuns', 'WavyMiddlePart'],
  HairColor: ['Default', 'Black', 'Blonde', 'Blue', 'Cyan', 'DarkBrown', 'Ginger', 'Gray', 'Green', 'Holo', 'LightBrown', 'Maroon', 'PastelPink', 'Pink', 'Purple', 'Red', 'Sunset', 'Teal', 'Vampy', 'White', 'Yellow'],
  Top: ['None', 'Tank', 'LongSleeve', 'Sweater', 'PuffSleeveDress', 'WarriorTunic', 'WizardRobe'],
  Bottom: ['None', 'Underwear', 'Shorts', 'Pants', 'SkinnyPants', 'FlarePants', 'Skirt'],
  Shoes: ['None', 'CrewSocks', 'Oxfords', 'ChunkyBoots', 'RainBoots', 'WarriorBoots', 'WizardBoots'],
  Hat: ['None', 'Cowboy', 'Fisherman', 'PartyHat', 'PatrolCap', 'PorkPie', 'PropellerCap', 'StrawHat', 'Viking'],
  Glasses: ['None', 'Round', 'Aviator', 'CatEye', 'CatEyeSunglasses', 'HeartSunglasses'],
} as const;

type PartCategory = keyof typeof PARTS;

// UI category tabs
const UI_CATEGORIES = {
  'Skin tone': ['SkinTone', 'Face', 'EyeColor'] as PartCategory[],
  'Hair': ['Hair', 'HairColor'] as PartCategory[],
  'Clothes': ['Top', 'Bottom', 'Shoes'] as PartCategory[],
  'Accessories': ['Hat', 'Glasses'] as PartCategory[],
};

type UICategory = keyof typeof UI_CATEGORIES;

// Display names for subcategories
const PART_DISPLAY_NAMES: Record<PartCategory, string> = {
  SkinTone: 'Skin Tone',
  Face: 'Face',
  EyeColor: 'Eye Color',
  Hair: 'Hair Style',
  HairColor: 'Hair Color',
  Top: 'Top',
  Bottom: 'Bottom',
  Shoes: 'Shoes',
  Hat: 'Hat',
  Glasses: 'Glasses',
};

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
  
  const [sceneTransitioning, setSceneTransitioning] = useState(true);
  const [activeTab, setActiveTab] = useState<UICategory>('Skin tone');
  const [activeSubcategory, setActiveSubcategory] = useState<PartCategory>('SkinTone');
  const [character, setCharacter] = useState<CharacterSkin>(DEFAULT_CHARACTER);

  // Get subcategories for current tab
  const subcategories = useMemo(() => UI_CATEGORIES[activeTab], [activeTab]);
  
  // Get options for current subcategory
  const options = useMemo(() => PARTS[activeSubcategory], [activeSubcategory]);
  
  // Current selection for active subcategory
  const currentSelection = character[activeSubcategory] ?? 0;

  // Switch to home_showcase scene when screen is focused
  // Uses useFocusEffect to properly handle navigation (same pattern as home.tsx)
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      
      // Show transition overlay when screen becomes active
      setSceneTransitioning(true);
      
      const attemptSceneChange = () => {
        if (cancelled) return;
        
        if (!isGodotReady()) {
          console.log('[Character] Godot not ready yet, waiting...');
          setTimeout(attemptSceneChange, 300);
          return;
        }
        
        console.log('[Character] Switching to home_showcase scene');
        changeScene('home_showcase');
        
        // Wait for scene change, then apply character and hide overlay
        setTimeout(() => {
          if (cancelled) return;
          setUserCharacter(character);
          
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
    }, [character])
  );

  // Update character in Godot when selections change
  const updateCharacter = useCallback((category: PartCategory, index: number) => {
    const newCharacter = { ...character, [category]: index };
    setCharacter(newCharacter);
    
    // Log face changes with both PNG and Godot asset names
    if (category === 'Face') {
      const pngAsset = `face${index}.png`;
      const godotFace = PARTS.Face[index];
      console.log(`[Face Change] PNG: ${pngAsset} | Godot: ${godotFace} (index: ${index})`);
    }
    
    if (isGodotReady()) {
      setUserCharacter(newCharacter);
    }
  }, [character]);

  // Handle tab change
  const handleTabChange = useCallback((tab: UICategory) => {
    setActiveTab(tab);
    // Auto-select first subcategory of the tab
    setActiveSubcategory(UI_CATEGORIES[tab][0]);
  }, []);

  // Handle subcategory change
  const handleSubcategoryChange = useCallback((subcategory: PartCategory) => {
    setActiveSubcategory(subcategory);
  }, []);

  // Handle option selection
  const handleOptionSelect = useCallback((index: number) => {
    updateCharacter(activeSubcategory, index);
  }, [activeSubcategory, updateCharacter]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Customize</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Character Preview (Godot View) */}
      <View style={styles.previewContainer}>
        <LinearGradient
          colors={['#C5E8F7', '#E8F4F8', '#F5FAFC']}
          style={styles.previewGradient}
        >
          <GodotGame style={styles.godotView} pckUrl={PCK_URL} />
          <SceneTransition 
            visible={sceneTransitioning} 
            backgroundColor="#C5E8F7"
            fadeDuration={400}
          />
        </LinearGradient>
      </View>

      {/* Customization Panel */}
      <View style={styles.customizationPanel}>
        {/* Category Tabs */}
        <View style={styles.tabsContainer}>
          {(Object.keys(UI_CATEGORIES) as UICategory[]).map((tab) => (
            <Pressable
              key={tab}
              style={[
                styles.tab,
                activeTab === tab && styles.tabActive,
              ]}
              onPress={() => handleTabChange(tab)}
            >
              <Text style={[
                styles.tabText,
                activeTab === tab && styles.tabTextActive,
              ]}>
                {tab}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Subcategory Pills (if more than one) */}
        {subcategories.length > 1 && (
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.subcategoryContainer}
            contentContainerStyle={styles.subcategoryContent}
          >
            {subcategories.map((sub) => (
              <Pressable
                key={sub}
                style={[
                  styles.subcategoryPill,
                  activeSubcategory === sub && styles.subcategoryPillActive,
                ]}
                onPress={() => handleSubcategoryChange(sub)}
              >
                <Text style={[
                  styles.subcategoryText,
                  activeSubcategory === sub && styles.subcategoryTextActive,
                ]}>
                  {PART_DISPLAY_NAMES[sub]}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        )}

        {/* Options Grid */}
        <ScrollView 
          style={styles.optionsScroll}
          contentContainerStyle={styles.optionsGrid}
          showsVerticalScrollIndicator={false}
        >
          {options.map((option, index) => {
            // Get preview image for Face or Hair category
            const previewImage = 
              activeSubcategory === 'Face' ? FACE_IMAGES[index] :
              activeSubcategory === 'Hair' ? HAIR_IMAGES[index] :
              null;
            
            return (
              <Pressable
                key={`${activeSubcategory}-${index}`}
                style={[
                  styles.optionItem,
                  currentSelection === index && styles.optionItemSelected,
                ]}
                onPress={() => handleOptionSelect(index)}
              >
                <View style={[
                  styles.optionPreview,
                  currentSelection === index && styles.optionPreviewSelected,
                ]}>
                  {previewImage ? (
                    <Image 
                      source={previewImage} 
                      style={styles.optionImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.optionPlaceholder}>
                      <Text style={styles.optionPlaceholderText}>
                        {index === 0 && activeSubcategory !== 'SkinTone' && activeSubcategory !== 'Face' && activeSubcategory !== 'EyeColor' 
                          ? '∅' 
                          : (index + 1).toString()}
                      </Text>
                    </View>
                  )}
                </View>
                <Text 
                  style={[
                    styles.optionLabel,
                    currentSelection === index && styles.optionLabelSelected,
                  ]}
                  numberOfLines={1}
                >
                  {option}
                </Text>
              </Pressable>
            );
          })}
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
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  backButtonText: {
    fontSize: 24,
    color: '#8B7355',
    fontWeight: '600',
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
    height: SCREEN_WIDTH * 0.85,
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
    paddingTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: '#F5EFE6',
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: '#D4C4B0',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#A89880',
  },
  tabTextActive: {
    color: '#5A4A3A',
  },
  subcategoryContainer: {
    maxHeight: 44,
    marginBottom: 8,
  },
  subcategoryContent: {
    paddingHorizontal: 16,
    gap: 8,
    alignItems: 'center',
  },
  subcategoryPill: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#F5EFE6',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  subcategoryPillActive: {
    backgroundColor: '#FFF',
    borderColor: '#D4C4B0',
  },
  subcategoryText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#A89880',
  },
  subcategoryTextActive: {
    color: '#5A4A3A',
  },
  optionsScroll: {
    flex: 1,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingBottom: 32,
    gap: 12,
  },
  optionItem: {
    width: GRID_ITEM_SIZE - 8,
    alignItems: 'center',
  },
  optionItemSelected: {},
  optionPreview: {
    width: GRID_ITEM_SIZE - 16,
    height: GRID_ITEM_SIZE - 16,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  optionPreviewSelected: {
    borderColor: '#8B7355',
    backgroundColor: '#FFF8F0',
  },
  optionImage: {
    width: '100%',
    height: '100%',
    borderRadius: 13,
  },
  optionPlaceholder: {
    width: '80%',
    height: '80%',
    borderRadius: 12,
    backgroundColor: '#F5EFE6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionPlaceholderText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#C4B8A8',
  },
  optionLabel: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: '500',
    color: '#A89880',
    textAlign: 'center',
  },
  optionLabelSelected: {
    color: '#5A4A3A',
    fontWeight: '600',
  },
});

