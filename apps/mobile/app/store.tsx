import { useState, useCallback, useMemo, useEffect } from 'react';
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
import { useAuth, userService } from '@/lib/firebase';
import { PCK_URL } from '@/constants/game';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_COLUMNS = 2;
const GRID_GAP = 16;
const GRID_ITEM_SIZE = (SCREEN_WIDTH - 48 - GRID_GAP) / GRID_COLUMNS;

// Store tabs
type StoreTab = 'Daily Finds' | 'Seasonal' | 'Owned';

// Item categories (matching Godot's ModularCharacter)
type ItemCategory = 'Top' | 'Bottom' | 'Shoes' | 'Hat' | 'Glasses' | 'Neck';

// Store item definition - now includes variant index
interface StoreItem {
  id: string;
  name: string;
  category: ItemCategory;
  partIndex: number;      // Index in PARTS[category] (e.g., which top)
  variantIndex: number;   // Index in TEXTURE_VARIANTS[partName] (e.g., which color)
  price: number;
  isOwned?: boolean;
  isSeasonal?: boolean;
}

// Base items (index in PARTS array) - index 0 is always "None"
const PARTS: Record<ItemCategory, string[]> = {
  Top: ['None', 'Tank', 'LongSleeve', 'Sweater', 'PuffSleeveDress', 'WarriorTunic', 'WizardRobe', 'Tshirt', 'Hoodie'],
  Bottom: ['None', 'Underwear', 'Shorts', 'Pants', 'SkinnyPants', 'FlarePants', 'Skirt'],
  Shoes: ['None', 'CrewSocks', 'Oxfords', 'ChunkyBoots', 'RainBoots', 'WarriorBoots', 'WizardBoots', 'OverKneeSocks', 'Sneakers'],
  Hat: ['None', 'Cowboy', 'Fisherman', 'PartyHat', 'PatrolCap', 'PorkPie', 'PropellerCap', 'StrawHat', 'Viking', 'BaseballCap', 'TopHat', 'Witch', 'RobotHelmet'],
  Glasses: ['None', 'Round', 'Aviator', 'CatEye', 'CatEyeSunglasses', 'HeartSunglasses'],
  Neck: ['None', 'SpikedCollar'],
};

// Texture variants for each item (from Godot's TEXTURE_VARIANTS)
const TEXTURE_VARIANTS: Record<string, string[]> = {
  // Tops
  Tank: ['Black', 'BlackRadiation', 'Olive', 'White'],
  LongSleeve: ['Black', 'Beige', 'Olive'],
  Sweater: ['Black', 'BlackStar', 'Beige', 'Maroon', 'MaroonMushroom', 'Olive', 'OliveCollegiate'],
  PuffSleeveDress: ['BlueFloral', 'Lavender', 'Olive', 'PinkFloral'],
  WarriorTunic: ['Beige', 'Blue', 'Maroon', 'Olive'],
  WizardRobe: ['Beige', 'Blue', 'Maroon', 'Olive'],
  Tshirt: ['Black', 'BlackMushroom', 'BlackSkull', 'Beige', 'Blue', 'BlueStar', 'Lavender', 'LavenderStar', 'Maroon', 'MaroonCollegiate', 'Mustard', 'Olive', 'OliveLightning', 'Pumpkin', 'PumpkinCollegiate', 'White'],
  Hoodie: ['Black', 'BlackSakura', 'BlackSwirl', 'Beige', 'BeigeSakura', 'OliveCollegiate'],
  // Bottoms
  Underwear: ['White'],
  Shorts: ['Black', 'Denim', 'Khaki', 'Olive'],
  Pants: ['Black', 'CamoRed', 'CamoSnow', 'Denim', 'Khaki', 'Olive'],
  SkinnyPants: ['Brown'],
  FlarePants: ['Black', 'Denim'],
  Skirt: ['Black', 'BlueFloral', 'Denim', 'Houndstooth', 'Olive'],
  // Shoes
  CrewSocks: ['Black', 'Beige', 'White'],
  Oxfords: ['Black', 'Brown'],
  ChunkyBoots: ['Black', 'Lavender'],
  RainBoots: ['Black', 'Yellow'],
  WarriorBoots: ['Brown'],
  WizardBoots: ['Brown'],
  OverKneeSocks: ['Black', 'Beige', 'BlackWhiteStripes', 'White'],
  Sneakers: ['BlackWithWhiteStripes', 'Chucks', 'White'],
  // Hats
  Cowboy: ['Brown', 'Beige', 'Pink'],
  Fisherman: ['Olive', 'GreenFroggy', 'Khaki', 'Orange'],
  PartyHat: ['Blue', 'Red'],
  PatrolCap: ['GreenCamo', 'KhakiCamo'],
  PorkPie: ['Black', 'Brown', 'Navy', 'Red'],
  PropellerCap: ['Rainbow', 'Purple'],
  StrawHat: ['White', 'Yellow'],
  Viking: ['Blue', 'Red'],
  BaseballCap: ['Black', 'BlackGold', 'BlackGreen', 'BlackWhite', 'BlueStar', 'RedBranded', 'White', 'WhiteYellow'],
  TopHat: ['Black', 'White'],
  Witch: ['Black', 'Brown', 'White'],
  RobotHelmet: ['Blue'],
  // Glasses
  Round: ['Brown'],
  Aviator: ['Black', 'Brown'],
  CatEye: ['Black', 'Maroon'],
  CatEyeSunglasses: ['Default'],
  HeartSunglasses: ['Pink', 'Black', 'Lavender'],
  // Neck
  SpikedCollar: ['Black'],
};

// Item colors for preview placeholders
const CATEGORY_COLORS: Record<ItemCategory, string> = {
  Top: '#FFB6C1',
  Bottom: '#87CEEB',
  Shoes: '#98FB98',
  Hat: '#DDA0DD',
  Glasses: '#F0E68C',
  Neck: '#FFA07A',
};

// Price tiers based on item category
const BASE_PRICES: Record<ItemCategory, number> = {
  Top: 120,
  Bottom: 100,
  Shoes: 90,
  Hat: 150,
  Glasses: 80,
  Neck: 100,
};

// Special/seasonal base items with higher prices
const SEASONAL_BASE_ITEMS = new Set([
  'WizardRobe', 'WarriorTunic', 'WizardBoots', 'WarriorBoots',
  'Viking', 'Witch', 'TopHat', 'RobotHelmet', 'SpikedCollar',
]);

// Special variant patterns that cost more
const PREMIUM_VARIANTS = new Set([
  'Sakura', 'Star', 'Mushroom', 'Skull', 'Lightning', 'Collegiate', 'Floral', 'Froggy', 'Rainbow',
]);

// Format variant name for display
const formatVariantName = (baseName: string, variant: string): string => {
  const formattedBase = baseName.replace(/([A-Z])/g, ' $1').trim();
  const formattedVariant = variant.replace(/([A-Z])/g, ' $1').trim();
  return `${formattedBase} (${formattedVariant})`;
};

// Check if variant is premium
const isPremiumVariant = (variant: string): boolean => {
  return Array.from(PREMIUM_VARIANTS).some(p => variant.includes(p));
};

// Generate all store items from PARTS and TEXTURE_VARIANTS
const generateAllStoreItems = (): StoreItem[] => {
  const items: StoreItem[] = [];
  
  for (const category of Object.keys(PARTS) as ItemCategory[]) {
    const partNames = PARTS[category];
    
    for (let partIndex = 1; partIndex < partNames.length; partIndex++) { // Skip index 0 (None)
      const partName = partNames[partIndex];
      const variants = TEXTURE_VARIANTS[partName] || ['Default'];
      const isSeasonal = SEASONAL_BASE_ITEMS.has(partName);
      const basePrice = BASE_PRICES[category];
      
      for (let variantIndex = 0; variantIndex < variants.length; variantIndex++) {
        const variant = variants[variantIndex];
        const isPremium = isPremiumVariant(variant);
        
        // Calculate price
        let price = basePrice;
        if (isSeasonal) price = Math.round(price * 1.8);
        if (isPremium) price = Math.round(price * 1.3);
        
        items.push({
          id: `${category.toLowerCase()}_${partIndex}_${variantIndex}`,
          name: formatVariantName(partName, variant),
          category,
          partIndex,
          variantIndex,
          price,
          isSeasonal,
        });
      }
    }
  }
  
  return items;
};

// Default character selections (for preview)
const DEFAULT_CHARACTER: CharacterSkin = {
  SkinTone: 0,
  Face: 0,
  EyeColor: 0,
  Hair: 1,
  HairColor: 0,
  Top: 1,
  TopVariant: 0,
  Bottom: 3,
  BottomVariant: 0,
  Shoes: 2,
  ShoesVariant: 0,
  Hat: 0,
  HatVariant: 0,
  Glasses: 0,
  GlassesVariant: 0,
};

// Generate daily finds (rotate based on day)
const generateDailyFinds = (allItems: StoreItem[]): StoreItem[] => {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  const nonSeasonalItems = allItems.filter(item => !item.isSeasonal);
  
  // Shuffle deterministically based on day
  const shuffled = [...nonSeasonalItems].sort((a, b) => {
    const hashA = (a.id.charCodeAt(0) + a.id.charCodeAt(a.id.length - 1)) * dayOfYear % 1000;
    const hashB = (b.id.charCodeAt(0) + b.id.charCodeAt(b.id.length - 1)) * dayOfYear % 1000;
    return hashA - hashB;
  });
  
  return shuffled.slice(0, 8);
};

// Generate seasonal items
const generateSeasonalItems = (allItems: StoreItem[]): StoreItem[] => {
  return allItems.filter(item => item.isSeasonal);
};

// Calculate time until midnight for refresh timer
const getTimeUntilMidnight = (): number => {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  return midnight.getTime() - now.getTime();
};

const formatTimeRemaining = (ms: number): string => {
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((ms % (1000 * 60)) / 1000);
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

// Generate all items once
const ALL_STORE_ITEMS = generateAllStoreItems();

export default function StoreScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, userDoc } = useAuth();
  
  const [sceneTransitioning, setSceneTransitioning] = useState(true);
  const [activeTab, setActiveTab] = useState<StoreTab>('Daily Finds');
  const [selectedItem, setSelectedItem] = useState<StoreItem | null>(null);
  const [character, setCharacter] = useState<CharacterSkin>(DEFAULT_CHARACTER);
  const [timeRemaining, setTimeRemaining] = useState(getTimeUntilMidnight());
  const [ownedItems, setOwnedItems] = useState<string[]>([]);
  
  // Load saved character and owned items from Firestore on mount
  useEffect(() => {
    if (userDoc?.characterSkin) {
      setCharacter({ ...DEFAULT_CHARACTER, ...userDoc.characterSkin });
    }
    if (userDoc?.ownedItems) {
      setOwnedItems(userDoc.ownedItems);
    }
  }, [userDoc]);

  // Refresh timer countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeRemaining(getTimeUntilMidnight());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Get items for current tab
  const items = useMemo(() => {
    let tabItems: StoreItem[];
    
    switch (activeTab) {
      case 'Daily Finds':
        tabItems = generateDailyFinds(ALL_STORE_ITEMS);
        break;
      case 'Seasonal':
        tabItems = generateSeasonalItems(ALL_STORE_ITEMS);
        break;
      case 'Owned':
        tabItems = ALL_STORE_ITEMS.filter(item => ownedItems.includes(item.id));
        break;
      default:
        tabItems = [];
    }
    
    return tabItems.map(item => ({
      ...item,
      isOwned: ownedItems.includes(item.id),
    }));
  }, [activeTab, ownedItems]);

  // Get user's display name for the header
  const displayName = userDoc?.displayName || userDoc?.username || 'Your';
  const headerTitle = activeTab === 'Daily Finds' 
    ? `${displayName.toUpperCase()}'S DAILY FINDS`
    : activeTab === 'Seasonal'
    ? 'SEASONAL COLLECTION'
    : 'YOUR COLLECTION';

  // Switch to character_showcase scene when screen is focused
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      
      setSceneTransitioning(true);
      
      const attemptSceneChange = () => {
        if (cancelled) return;
        
        if (!isGodotReady()) {
          setTimeout(attemptSceneChange, 300);
          return;
        }
        
        changeScene('character_showcase');
        
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
      
      const timer = setTimeout(attemptSceneChange, 200);
      
      return () => {
        cancelled = true;
        clearTimeout(timer);
      };
    }, [character])
  );

  // Get variant key for a category
  const getVariantKey = (category: ItemCategory): string => {
    return `${category}Variant`;
  };

  // Handle item tap - toggle selection and preview
  const handleItemTap = useCallback((item: StoreItem) => {
    if (selectedItem?.id === item.id) {
      // Deselect - restore original character
      setSelectedItem(null);
      if (isGodotReady()) {
        setUserCharacter(character);
      }
    } else {
      // Select and preview - set both part and variant
      setSelectedItem(item);
      const variantKey = getVariantKey(item.category);
      const previewCharacter = { 
        ...character, 
        [item.category]: item.partIndex,
        [variantKey]: item.variantIndex,
      };
      if (isGodotReady()) {
        setUserCharacter(previewCharacter);
      }
    }
  }, [selectedItem, character]);

  // Handle purchase
  const handlePurchase = useCallback(async () => {
    if (!selectedItem || !user || !userDoc) return;
    
    const price = selectedItem.price;
    if (userDoc.totalCoins < price) {
      console.log('[Store] Not enough beans');
      return;
    }

    try {
      // Update owned items and deduct coins
      const newOwnedItems = [...ownedItems, selectedItem.id];
      await userService.purchaseItem(user.uid, selectedItem.id, price);
      setOwnedItems(newOwnedItems);
      
      // Apply item to character permanently (with variant)
      const variantKey = getVariantKey(selectedItem.category);
      const newCharacter = { 
        ...character, 
        [selectedItem.category]: selectedItem.partIndex,
        [variantKey]: selectedItem.variantIndex,
      };
      setCharacter(newCharacter);
      await userService.updateCharacterSkin(user.uid, newCharacter);
      
      // Clear selection
      setSelectedItem(null);
      
      console.log('[Store] Purchased:', selectedItem.name);
    } catch (error) {
      console.error('[Store] Purchase failed:', error);
    }
  }, [selectedItem, user, userDoc, ownedItems, character]);

  // Check if we can afford the selected item
  const canAfford = selectedItem ? (userDoc?.totalCoins ?? 0) >= selectedItem.price : false;

  // Check if an item is currently equipped
  const isItemEquipped = useCallback((item: StoreItem): boolean => {
    const variantKey = getVariantKey(item.category);
    return character[item.category] === item.partIndex && 
           (character[variantKey as keyof CharacterSkin] ?? 0) === item.variantIndex;
  }, [character]);

  // Handle equip item
  const handleEquip = useCallback(async (item: StoreItem) => {
    if (!user) return;
    
    const variantKey = getVariantKey(item.category);
    const newCharacter = { 
      ...character, 
      [item.category]: item.partIndex,
      [variantKey]: item.variantIndex,
    };
    setCharacter(newCharacter);
    
    if (isGodotReady()) {
      setUserCharacter(newCharacter);
    }
    
    try {
      await userService.updateCharacterSkin(user.uid, newCharacter);
      console.log('[Store] Equipped:', item.name);
    } catch (error) {
      console.error('[Store] Equip failed:', error);
    }
  }, [character, user]);

  // Handle remove/unequip item (set to None/0)
  const handleRemove = useCallback(async (item: StoreItem) => {
    if (!user) return;
    
    const variantKey = getVariantKey(item.category);
    const newCharacter = { 
      ...character, 
      [item.category]: 0,  // Set to None
      [variantKey]: 0,
    };
    setCharacter(newCharacter);
    
    if (isGodotReady()) {
      setUserCharacter(newCharacter);
    }
    
    try {
      await userService.updateCharacterSkin(user.uid, newCharacter);
      console.log('[Store] Removed:', item.name);
    } catch (error) {
      console.error('[Store] Remove failed:', error);
    }
  }, [character, user]);

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
        
        <View style={styles.headerRight}>
          {/* Customize Character Button */}
          <Pressable 
            style={styles.customizeButton}
            onPress={() => router.push('/character')}
          >
            <Text style={styles.customizeButtonText}>✨</Text>
          </Pressable>
          
          {/* Bean Display */}
          <View style={styles.beanDisplay}>
            <Text style={styles.beanAmount}>{userDoc?.totalCoins ?? 0}</Text>
            <Image source={require('@/assets/ui/bean.png')} style={styles.beanIcon} />
          </View>
        </View>
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

      {/* Store Panel */}
      <View style={styles.storePanel}>
        {/* Category Tabs */}
        <View style={styles.tabsContainer}>
          {(['Daily Finds', 'Seasonal', 'Owned'] as StoreTab[]).map((tab) => (
            <Pressable
              key={tab}
              style={[
                styles.tab,
                activeTab === tab && styles.tabActive,
              ]}
              onPress={() => {
                setActiveTab(tab);
                setSelectedItem(null);
                if (isGodotReady()) {
                  setUserCharacter(character);
                }
              }}
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

        {/* Section Header */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{headerTitle}</Text>
          {activeTab === 'Daily Finds' && (
            <View style={styles.refreshBadge}>
              <Text style={styles.refreshText}>
                Items refresh in {formatTimeRemaining(timeRemaining)}
              </Text>
            </View>
          )}
        </View>

        {/* Items Grid */}
        <ScrollView 
          style={styles.itemsScroll}
          contentContainerStyle={[
            styles.itemsGrid,
            selectedItem && { paddingBottom: 100 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {items.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>
                {activeTab === 'Owned' 
                  ? 'No items yet! Browse the shop to find something you like.'
                  : 'No items available right now.'}
              </Text>
            </View>
          ) : (
            items.map((item) => (
              <Pressable
                key={item.id}
                style={[
                  styles.itemCard,
                  selectedItem?.id === item.id && styles.itemCardSelected,
                ]}
                onPress={() => handleItemTap(item)}
              >
                {/* Category Badge */}
                <View style={[styles.categoryBadge, { backgroundColor: CATEGORY_COLORS[item.category] + '40' }]}>
                  <Text style={[styles.categoryBadgeText, { color: CATEGORY_COLORS[item.category] }]}>
                    {item.category}
                  </Text>
                </View>
                
                <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
                
                {/* Item Preview */}
                <View style={[
                  styles.itemPreview,
                  { backgroundColor: CATEGORY_COLORS[item.category] + '30' },
                ]}>
                  <View style={[
                    styles.itemPreviewInner,
                    { backgroundColor: CATEGORY_COLORS[item.category] },
                  ]}>
                    <Text style={styles.itemPreviewText}>
                      {item.category.charAt(0)}
                    </Text>
                  </View>
                </View>

                {/* Price Badge or Equip/Remove Buttons */}
                {!item.isOwned ? (
                  <View style={[styles.priceBadge, item.isSeasonal && styles.priceBadgeSeasonal]}>
                    <Text style={styles.priceText}>{item.price}</Text>
                    <Image source={require('@/assets/ui/bean.png')} style={styles.priceBeanIcon} />
                  </View>
                ) : activeTab === 'Owned' ? (
                  // In Owned tab: show Equip or Remove button
                  isItemEquipped(item) ? (
                    <Pressable 
                      style={styles.removeButton}
                      onPress={() => handleRemove(item)}
                    >
                      <Text style={styles.removeButtonText}>Remove</Text>
                    </Pressable>
                  ) : (
                    <Pressable 
                      style={styles.equipButton}
                      onPress={() => handleEquip(item)}
                    >
                      <Text style={styles.equipButtonText}>Equip</Text>
                    </Pressable>
                  )
                ) : (
                  <View style={styles.ownedBadge}>
                    <Text style={styles.ownedText}>Owned</Text>
                  </View>
                )}
              </Pressable>
            ))
          )}
        </ScrollView>
      </View>

      {/* Bottom Buy Bar - shows when item selected */}
      {selectedItem && !selectedItem.isOwned && (
        <View style={[styles.buyBar, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.buyBarInfo}>
            <Text style={styles.buyBarItemName} numberOfLines={1}>{selectedItem.name}</Text>
            <Text style={styles.buyBarCategory}>{selectedItem.category}</Text>
          </View>
          <Pressable 
            style={[
              styles.buyButton,
              !canAfford && styles.buyButtonDisabled,
            ]}
            onPress={handlePurchase}
            disabled={!canAfford}
          >
            <View style={styles.buyButtonContent}>
              <Text style={styles.buyButtonText}>Buy {selectedItem.price}</Text>
              <Image source={require('@/assets/ui/bean.png')} style={styles.buyBeanIcon} />
            </View>
          </Pressable>
        </View>
      )}
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
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  customizeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFE4EC',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFB6C1',
  },
  customizeButtonText: {
    fontSize: 20,
  },
  beanDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E7',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#F5D98C',
  },
  beanAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#8B7355',
    marginRight: 6,
  },
  beanIcon: {
    width: 22,
    height: 22,
  },
  previewContainer: {
    height: SCREEN_WIDTH * 0.65,
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
  storePanel: {
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
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 16,
    backgroundColor: '#F5EFE6',
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: '#5DADE2',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#A89880',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#5A4A3A',
    letterSpacing: 0.5,
  },
  refreshBadge: {
    marginTop: 8,
    backgroundColor: '#E74C3C',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  refreshText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  itemsScroll: {
    flex: 1,
  },
  itemsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingBottom: 32,
    gap: GRID_GAP,
  },
  itemCard: {
    width: GRID_ITEM_SIZE,
    backgroundColor: '#FFF8E7',
    borderRadius: 20,
    padding: 12,
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#F5E6D3',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  itemCardSelected: {
    borderColor: '#5DADE2',
    backgroundColor: '#E8F6FC',
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginBottom: 4,
  },
  categoryBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  itemName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#5A4A3A',
    marginBottom: 6,
    textAlign: 'center',
    height: 36,
  },
  itemPreview: {
    width: '100%',
    aspectRatio: 1.2,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemPreviewInner: {
    width: '50%',
    height: '50%',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemPreviewText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  priceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#F5D98C',
  },
  priceBadgeSeasonal: {
    borderColor: '#9B59B6',
    backgroundColor: '#F5E6FA',
  },
  priceText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#8B7355',
    marginRight: 4,
  },
  priceBeanIcon: {
    width: 16,
    height: 16,
  },
  ownedBadge: {
    backgroundColor: '#D5F5E3',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  ownedText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#27AE60',
  },
  equipButton: {
    backgroundColor: '#5DADE2',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  equipButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  removeButton: {
    backgroundColor: '#F5E6D3',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D4C4B0',
  },
  removeButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8B7355',
  },
  emptyState: {
    width: '100%',
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 15,
    color: '#A89880',
    textAlign: 'center',
  },
  // Bottom buy bar
  buyBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  buyBarInfo: {
    flex: 1,
    marginRight: 16,
  },
  buyBarItemName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#5A4A3A',
  },
  buyBarCategory: {
    fontSize: 12,
    color: '#A89880',
    marginTop: 2,
  },
  buyButton: {
    backgroundColor: '#5DADE2',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 20,
  },
  buyButtonDisabled: {
    backgroundColor: '#BDC3C7',
  },
  buyButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buyButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginRight: 6,
  },
  buyBeanIcon: {
    width: 20,
    height: 20,
  },
});
