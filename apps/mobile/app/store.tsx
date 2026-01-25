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

// Outfit set definition - a bundle of regular items sold together
interface OutfitSet {
  id: string;
  name: string;
  parts: Partial<CharacterSkin>;  // Part indices to apply (all regular items)
  description: string;
  price: number;
  isOwned?: boolean;
  isOutfitSet: true;              // Discriminator for type narrowing
}

// Union type for all store items
type AnyStoreItem = StoreItem | OutfitSet;

// Type guard for outfit sets
const isOutfitSet = (item: AnyStoreItem): item is OutfitSet => {
  return 'isOutfitSet' in item && item.isOutfitSet === true;
};

// Get individual item IDs from an outfit set's parts
// Used to grant individual items when purchasing a set
const getOutfitSetItemIds = (set: OutfitSet): string[] => {
  const itemIds: string[] = [];
  const parts = set.parts;
  
  // Map category keys to their lowercase version for item ID generation
  const categoryMap: Record<string, ItemCategory> = {
    Top: 'Top',
    Bottom: 'Bottom',
    Shoes: 'Shoes',
    Hat: 'Hat',
    Glasses: 'Glasses',
    Neck: 'Neck',
  };
  
  for (const [key, value] of Object.entries(parts)) {
    // Skip variant keys and values of 0 (None)
    if (key.endsWith('Variant') || value === 0) continue;
    
    const category = categoryMap[key];
    if (!category) continue;
    
    const partIndex = value as number;
    const variantKey = `${key}Variant` as keyof typeof parts;
    const variantIndex = (parts[variantKey] as number) ?? 0;
    
    // Generate item ID matching the format used in generateAllStoreItems
    const itemId = `${category.toLowerCase()}_${partIndex}_${variantIndex}`;
    itemIds.push(itemId);
  }
  
  return itemIds;
};

// Base items (index in PARTS array) - index 0 is always "None"
// Note: Lofi items added at end of each category
const PARTS: Record<ItemCategory, string[]> = {
  Top: ['None', 'Tank', 'LongSleeve', 'Sweater', 'PuffSleeveDress', 'WarriorTunic', 'WizardRobe', 'Tshirt', 'Hoodie', 'LofiTop'],
  Bottom: ['None', 'Underwear', 'Shorts', 'Pants', 'SkinnyPants', 'FlarePants', 'Skirt', 'LofiPants'],
  Shoes: ['None', 'CrewSocks', 'Oxfords', 'ChunkyBoots', 'RainBoots', 'WarriorBoots', 'WizardBoots', 'OverKneeSocks', 'Sneakers'],
  Hat: ['None', 'Cowboy', 'Fisherman', 'PartyHat', 'PatrolCap', 'PorkPie', 'PropellerCap', 'StrawHat', 'Viking', 'BaseballCap', 'TopHat', 'Witch', 'RobotHelmet', 'Headphone'],
  Glasses: ['None', 'Round', 'Aviator', 'CatEye', 'CatEyeSunglasses', 'HeartSunglasses'],
  Neck: ['None', 'SpikedCollar', 'LofiScarf'],
};

// Texture variants for each item (from Godot's TEXTURE_VARIANTS)
// Note: Lofi items have a single 'Default' variant (custom textures handled by Godot)
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
  LofiTop: ['Default'],
  // Bottoms
  Underwear: ['White'],
  Shorts: ['Black', 'Denim', 'Khaki', 'Olive'],
  Pants: ['Black', 'CamoRed', 'CamoSnow', 'Denim', 'Khaki', 'Olive'],
  SkinnyPants: ['Brown'],
  FlarePants: ['Black', 'Denim'],
  Skirt: ['Black', 'BlueFloral', 'Denim', 'Houndstooth', 'Olive'],
  LofiPants: ['Default'],
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
  Headphone: ['Default'],
  // Glasses
  Round: ['Brown'],
  Aviator: ['Black', 'Brown'],
  CatEye: ['Black', 'Maroon'],
  CatEyeSunglasses: ['Default'],
  HeartSunglasses: ['Pink', 'Black', 'Lavender'],
  // Neck
  SpikedCollar: ['Black'],
  LofiScarf: ['Default'],
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
  // Lofi items
  'LofiTop', 'LofiPants', 'Headphone', 'LofiScarf',
]);

// Special variant patterns that cost more
const PREMIUM_VARIANTS = new Set([
  'Sakura', 'Star', 'Mushroom', 'Skull', 'Lightning', 'Collegiate', 'Floral', 'Froggy', 'Rainbow',
]);

// Outfit sets - bundles of regular items sold together at a discount
// All items are now regular parts that can be mixed and matched once owned
const OUTFIT_SETS: OutfitSet[] = [
  // Lofi Girl set - uses custom FBX items registered as regular parts
  // LofiTop=9, LofiPants=7, Headphone=13, LofiScarf=2
  {
    id: 'set_lofi',
    name: 'Lofi Girl Set',
    parts: { Top: 9, TopVariant: 0, Bottom: 7, BottomVariant: 0, Hat: 13, HatVariant: 0, Neck: 2, NeckVariant: 0 },
    description: 'Complete outfit with sweater, pants, headphones & scarf',
    price: 500,
    isOutfitSet: true,
  },
  // Wizard outfit bundles
  // WizardRobe = index 6, SkinnyPants = index 4, WizardBoots = index 6
  {
    id: 'set_wizard_beige',
    name: 'Beige Wizard Set',
    parts: { Top: 6, TopVariant: 0, Bottom: 4, BottomVariant: 0, Shoes: 6, ShoesVariant: 0, Hat: 0, Glasses: 0, Neck: 0 },
    description: 'Wizard robe, pants & boots in classic beige',
    price: 400,
    isOutfitSet: true,
  },
  {
    id: 'set_wizard_blue',
    name: 'Blue Wizard Set',
    parts: { Top: 6, TopVariant: 1, Bottom: 4, BottomVariant: 0, Shoes: 6, ShoesVariant: 0, Hat: 0, Glasses: 0, Neck: 0 },
    description: 'Wizard robe, pants & boots in mystical blue',
    price: 400,
    isOutfitSet: true,
  },
  {
    id: 'set_wizard_maroon',
    name: 'Maroon Wizard Set',
    parts: { Top: 6, TopVariant: 2, Bottom: 4, BottomVariant: 0, Shoes: 6, ShoesVariant: 0, Hat: 0, Glasses: 0, Neck: 0 },
    description: 'Wizard robe, pants & boots in deep maroon',
    price: 400,
    isOutfitSet: true,
  },
  {
    id: 'set_wizard_olive',
    name: 'Olive Wizard Set',
    parts: { Top: 6, TopVariant: 3, Bottom: 4, BottomVariant: 0, Shoes: 6, ShoesVariant: 0, Hat: 0, Glasses: 0, Neck: 0 },
    description: 'Wizard robe, pants & boots in earthy olive',
    price: 400,
    isOutfitSet: true,
  },
];

// Format variant name for display
const formatVariantName = (baseName: string, variant: string): string => {
  const formattedBase = baseName.replace(/([A-Z])/g, ' $1').trim();
  const formattedVariant = variant.replace(/([A-Z])/g, ' $1').trim();
  return `${formattedVariant} ${formattedBase}`;
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
  Neck: 0,
  NeckVariant: 0,
};

// Refresh cost in beans
const REFRESH_COST = 30;

// Simple seeded random number generator
const seededRandom = (seed: number): (() => number) => {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
};

// Generate daily finds (rotate based on day + optional refresh seed)
const generateDailyFinds = (allItems: StoreItem[], refreshSeed: number = 0): StoreItem[] => {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  const seed = dayOfYear * 10000 + refreshSeed; // Combine day with refresh seed
  const nonSeasonalItems = allItems.filter(item => !item.isSeasonal);
  
  // Fisher-Yates shuffle with seeded random
  const random = seededRandom(seed);
  const shuffled = [...nonSeasonalItems];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  return shuffled.slice(0, 8);
};

// Generate seasonal items (includes outfit sets at the top)
const generateSeasonalItems = (allItems: StoreItem[], ownedItems: string[]): AnyStoreItem[] => {
  // Add outfit sets first (with ownership status)
  const outfitSets: AnyStoreItem[] = OUTFIT_SETS.map(set => ({
    ...set,
    isOwned: ownedItems.includes(set.id),
  }));
  
  // Then add seasonal individual items
  const seasonalParts = allItems.filter(item => item.isSeasonal);
  
  return [...outfitSets, ...seasonalParts];
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
  const [selectedItem, setSelectedItem] = useState<AnyStoreItem | null>(null);
  const [character, setCharacter] = useState<CharacterSkin>(DEFAULT_CHARACTER);
  const [refreshSeed, setRefreshSeed] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(getTimeUntilMidnight());
  const [ownedItems, setOwnedItems] = useState<string[]>([]);
  
  // Load saved character and owned items from Firestore on mount
  useEffect(() => {
    if (userDoc?.characterSkin) {
      // Filter out null/undefined values to keep DEFAULT_CHARACTER values
      const cleanSkin = Object.fromEntries(
        Object.entries(userDoc.characterSkin).filter(([, v]) => v != null)
      );
      setCharacter({ ...DEFAULT_CHARACTER, ...cleanSkin });
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
  // Get wishlist item ID from userDoc
  const wishlistItemId = userDoc?.wishlistItem ?? null;

  const items = useMemo((): AnyStoreItem[] => {
    let tabItems: AnyStoreItem[];
    
    switch (activeTab) {
      case 'Daily Finds': {
        // Filter out owned items before generating daily finds
        const availableItems = ALL_STORE_ITEMS.filter(item => !ownedItems.includes(item.id));
        let dailyItems = generateDailyFinds(availableItems, refreshSeed);
        
        // If there's a wishlisted item, ensure it's at the top
        if (wishlistItemId) {
          const wishlistedItem = ALL_STORE_ITEMS.find(item => item.id === wishlistItemId);
          if (wishlistedItem && !ownedItems.includes(wishlistedItem.id)) {
            // Remove from current position if present
            dailyItems = dailyItems.filter(item => item.id !== wishlistItemId);
            // Add to the beginning
            dailyItems = [wishlistedItem, ...dailyItems.slice(0, 7)];
          }
        }
        
        tabItems = dailyItems;
        break;
      }
      case 'Seasonal':
        tabItems = generateSeasonalItems(ALL_STORE_ITEMS, ownedItems);
        break;
      case 'Owned': {
        // Include both regular items and outfit sets that are owned
        const ownedRegularItems = ALL_STORE_ITEMS.filter(item => ownedItems.includes(item.id));
        const ownedOutfitSets = OUTFIT_SETS.filter(set => ownedItems.includes(set.id));
        tabItems = [...ownedOutfitSets, ...ownedRegularItems];
        break;
      }
      default:
        tabItems = [];
    }
    
    return tabItems.map(item => ({
      ...item,
      isOwned: ownedItems.includes(item.id),
    }));
  }, [activeTab, ownedItems, refreshSeed, wishlistItemId]);

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
  const handleItemTap = useCallback((item: AnyStoreItem) => {
    if (selectedItem?.id === item.id) {
      // Deselect - restore original character
      setSelectedItem(null);
      if (isGodotReady()) {
        setUserCharacter(character);
      }
    } else {
      // Select and preview
      setSelectedItem(item);
      
      if (isOutfitSet(item)) {
        // Outfit set - apply all parts
        const previewCharacter: CharacterSkin = { 
          ...character, 
          ...item.parts,
        };
        if (isGodotReady()) {
          setUserCharacter(previewCharacter);
        }
      } else {
        // Regular item - set both part and variant
        const variantKey = getVariantKey(item.category);
        const previewCharacter: CharacterSkin = { 
          ...character, 
          [item.category]: item.partIndex,
          [variantKey]: item.variantIndex,
        };
        if (isGodotReady()) {
          setUserCharacter(previewCharacter);
        }
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
      let newOwnedItems = [...ownedItems, selectedItem.id];
      
      // If purchasing an outfit set, also add individual items
      if (isOutfitSet(selectedItem)) {
        const individualItemIds = getOutfitSetItemIds(selectedItem);
        // Add items that aren't already owned
        for (const itemId of individualItemIds) {
          if (!newOwnedItems.includes(itemId)) {
            newOwnedItems.push(itemId);
          }
        }
      }
      
      await userService.purchaseItem(user.uid, selectedItem.id, price, 
        isOutfitSet(selectedItem) ? getOutfitSetItemIds(selectedItem) : undefined);
      setOwnedItems(newOwnedItems);
      
      let newCharacter: CharacterSkin;
      
      if (isOutfitSet(selectedItem)) {
        // Outfit set - apply all parts
        newCharacter = { 
          ...character, 
          ...selectedItem.parts,
        };
      } else {
        // Regular item - apply part and variant
        const variantKey = getVariantKey(selectedItem.category);
        newCharacter = { 
          ...character, 
          [selectedItem.category]: selectedItem.partIndex,
          [variantKey]: selectedItem.variantIndex,
        };
      }
      
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

  // Check if user can afford refresh
  const canAffordRefresh = (userDoc?.totalCoins ?? 0) >= REFRESH_COST;

  // Check if selected item is wishlisted
  const isSelectedWishlisted = selectedItem ? wishlistItemId === selectedItem.id : false;

  // Handle refresh purchase
  const handleRefresh = useCallback(async () => {
    if (!user || !canAffordRefresh) return;
    
    try {
      // Deduct beans for refresh
      await userService.purchaseItem(user.uid, `refresh_${Date.now()}`, REFRESH_COST);
      // Increment refresh seed to get new items
      setRefreshSeed(prev => prev + 1);
      // Clear selection
      setSelectedItem(null);
      console.log('[Store] Refreshed daily finds');
    } catch (error) {
      console.error('[Store] Refresh failed:', error);
    }
  }, [user, canAffordRefresh]);

  // Handle wishlist toggle
  const handleWishlist = useCallback(async () => {
    if (!user || !selectedItem) return;
    
    try {
      if (isSelectedWishlisted) {
        // Remove from wishlist
        await userService.setWishlistItem(user.uid, null);
        console.log('[Store] Removed from wishlist:', selectedItem.name);
      } else {
        // Add to wishlist (replaces any existing)
        await userService.setWishlistItem(user.uid, selectedItem.id);
        console.log('[Store] Added to wishlist:', selectedItem.name);
      }
    } catch (error) {
      console.error('[Store] Wishlist failed:', error);
    }
  }, [user, selectedItem, isSelectedWishlisted]);

  // Check if an item is currently equipped
  const isItemEquipped = useCallback((item: AnyStoreItem): boolean => {
    if (isOutfitSet(item)) {
      // Outfit set - check if all parts match
      for (const [key, value] of Object.entries(item.parts)) {
        if (character[key as keyof CharacterSkin] !== value) {
          return false;
        }
      }
      return true;
    }
    // Regular item - check if part and variant match
    const variantKey = getVariantKey(item.category);
    return character[item.category] === item.partIndex && 
           (character[variantKey as keyof CharacterSkin] ?? 0) === item.variantIndex;
  }, [character]);

  // Handle equip item
  const handleEquip = useCallback(async (item: AnyStoreItem) => {
    if (!user) return;
    
    let newCharacter: CharacterSkin;
    
    if (isOutfitSet(item)) {
      // Outfit set - apply all parts
      newCharacter = { 
        ...character, 
        ...item.parts,
      };
    } else {
      // Regular item
      const variantKey = getVariantKey(item.category);
      newCharacter = { 
        ...character, 
        [item.category]: item.partIndex,
        [variantKey]: item.variantIndex,
      };
    }
    
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
  const handleRemove = useCallback(async (item: AnyStoreItem) => {
    if (!user) return;
    
    let newCharacter: CharacterSkin;
    
    if (isOutfitSet(item)) {
      // Outfit set - reset all parts in the set to None/0
      newCharacter = { ...character };
      for (const key of Object.keys(item.parts)) {
        (newCharacter as Record<string, unknown>)[key] = 0;
      }
    } else {
      const variantKey = getVariantKey(item.category);
      newCharacter = { 
        ...character, 
        [item.category]: 0,  // Set to None
        [variantKey]: 0,
      };
    }
    
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
            <View style={styles.dailyFindsInfo}>
              <View style={styles.refreshBadge}>
                <Text style={styles.refreshText}>
                  Items refresh in {formatTimeRemaining(timeRemaining)}
                </Text>
              </View>
              <Pressable 
                style={[styles.refreshButton, !canAffordRefresh && styles.refreshButtonDisabled]}
                onPress={handleRefresh}
                disabled={!canAffordRefresh}
              >
                <Text style={styles.refreshButtonText}>Refresh</Text>
                <Text style={styles.refreshButtonPrice}>{REFRESH_COST}</Text>
                <Image source={require('@/assets/ui/bean.png')} style={styles.refreshBeanIcon} />
              </Pressable>
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
                  wishlistItemId === item.id && styles.itemCardWishlisted,
                  isOutfitSet(item) && styles.itemCardOutfitSet,
                ]}
                onPress={() => handleItemTap(item)}
              >
                {/* Wishlist Heart */}
                {wishlistItemId === item.id && (
                  <View style={styles.wishlistBadge}>
                    <Text style={styles.wishlistBadgeText}>❤️</Text>
                  </View>
                )}
                
                {/* Category Badge or Outfit Set Badge */}
                {isOutfitSet(item) ? (
                  <View style={[styles.categoryBadge, styles.outfitSetBadge]}>
                    <Text style={[styles.categoryBadgeText, styles.outfitSetBadgeText]}>
                      ✨ Full Set
                    </Text>
                  </View>
                ) : (
                  <View style={[styles.categoryBadge, { backgroundColor: CATEGORY_COLORS[item.category] + '40' }]}>
                    <Text style={[styles.categoryBadgeText, { color: CATEGORY_COLORS[item.category] }]}>
                      {item.category}
                    </Text>
                  </View>
                )}
                
                <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
                
                {/* Item Preview */}
                {isOutfitSet(item) ? (
                  <View style={[styles.itemPreview, styles.outfitSetPreview]}>
                    <View style={styles.outfitSetPreviewInner}>
                      <Text style={styles.outfitSetPreviewText}>
                        {item.id.includes('wizard') ? '🧙‍♂️' : item.id.includes('lofi') ? '🎧' : '👕👖'}
                      </Text>
                    </View>
                  </View>
                ) : (
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
                )}

                {/* Price Badge or Equip/Remove Buttons */}
                {!item.isOwned ? (
                  <View style={[
                    styles.priceBadge, 
                    (isOutfitSet(item) || ('isSeasonal' in item && item.isSeasonal)) && styles.priceBadgeSeasonal
                  ]}>
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
        <View style={[styles.buyBar, { marginBottom: insets.bottom + 12 }]}>
          <Text style={styles.buyBarItemName} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{selectedItem.name}</Text>
          {canAfford ? (
            <Pressable 
              style={styles.buyButton}
              onPress={handlePurchase}
            >
              <Text style={styles.buyButtonText}>Buy {selectedItem.price}</Text>
              <Image source={require('@/assets/ui/bean.png')} style={styles.buyBeanIcon} />
            </Pressable>
          ) : (
            <Pressable 
              style={[styles.wishlistButton, isSelectedWishlisted && styles.wishlistButtonActive]}
              onPress={handleWishlist}
            >
              <Text style={[styles.wishlistButtonText, isSelectedWishlisted && styles.wishlistButtonTextActive]}>
                {isSelectedWishlisted ? 'Wishlisted' : 'Wishlist'}
              </Text>
            </Pressable>
          )}
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
  dailyFindsInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 12,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3498DB',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 4,
  },
  refreshButtonDisabled: {
    backgroundColor: '#7F8C8D',
    opacity: 0.7,
  },
  refreshButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  refreshButtonPrice: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  refreshBeanIcon: {
    width: 16,
    height: 16,
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
  itemCardWishlisted: {
    borderColor: '#E74C3C',
  },
  itemCardOutfitSet: {
    borderColor: '#9B59B6',
    backgroundColor: '#FAF0FF',
  },
  wishlistBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 10,
  },
  wishlistBadgeText: {
    fontSize: 16,
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
  outfitSetBadge: {
    backgroundColor: '#E8D5F2',
  },
  outfitSetBadgeText: {
    color: '#9B59B6',
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
  outfitSetPreview: {
    backgroundColor: '#E8D5F2',
  },
  outfitSetPreviewInner: {
    width: '80%',
    height: '60%',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#D4B8E8',
  },
  outfitSetPreviewText: {
    fontSize: 24,
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
    left: 16,
    right: 16,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 24,
    paddingRight: 12,
    paddingVertical: 12,
    borderRadius: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 10,
  },
  buyBarItemName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#5A4A3A',
    flexShrink: 1,
    marginRight: 12,
  },
  buyButton: {
    backgroundColor: '#5DADE2',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 24,
    gap: 4,
    flexShrink: 0,
  },
  buyButtonDisabled: {
    backgroundColor: '#BDC3C7',
  },
  buyButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  buyBeanIcon: {
    width: 22,
    height: 22,
  },
  wishlistButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#E74C3C',
    backgroundColor: '#FFFFFF',
  },
  wishlistButtonActive: {
    backgroundColor: '#E74C3C',
  },
  wishlistButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#E74C3C',
  },
  wishlistButtonTextActive: {
    color: '#FFFFFF',
  },
});
