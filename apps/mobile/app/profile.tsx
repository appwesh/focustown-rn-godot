import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  ScrollView,
  Dimensions,
  Image,
  ActivityIndicator,
  TextInput,
  Alert,
  Platform,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuth, sessionService, userService, type SessionDoc } from '@/lib/firebase';
import { BackButton, BeanCounter } from '@/components/ui';
import { GodotGame } from '@/components/godot-view';
import { SceneTransition } from '@/components/scene-transition';
import { isGodotReady, changeScene, setUserCharacter, setShowcaseCameraZoom } from '@/lib/godot';
import { PCK_URL } from '@/constants/game';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Time period types
type TimePeriod = 'Daily' | 'Weekly' | 'Monthly' | 'Yearly';

// ============================================================================
// Date & Time Formatting Utilities
// ============================================================================

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const getDaySuffix = (day: number): string => {
  if (day === 1 || day === 21 || day === 31) return 'st';
  if (day === 2 || day === 22) return 'nd';
  if (day === 3 || day === 23) return 'rd';
  return 'th';
};

const formatFocusTime = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  return `${minutes}m`;
};

const formatFocusTimeHours = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  return `${hours}h`;
};

const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes} mins`;
  return `${minutes} mins`;
};

const formatJoinDate = (timestamp: number): string => {
  const date = new Date(timestamp);
  const day = date.getDate();
  return `Joined ${MONTHS_SHORT[date.getMonth()]} ${day}${getDaySuffix(day)}, ${date.getFullYear()}`;
};

const formatBirthday = (timestamp: number | null): string => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  const day = date.getDate();
  return `${MONTHS_FULL[date.getMonth()]} ${day}${getDaySuffix(day)}`;
};

// ============================================================================
// Period Date Range Utilities
// ============================================================================

interface DateRange {
  start: Date;
  end: Date;
}

/** Get date range for a specific period */
const getDateRange = (date: Date, period: TimePeriod): DateRange => {
  const start = new Date(date);
  const end = new Date(date);
  
  switch (period) {
    case 'Daily':
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
      
    case 'Weekly': {
      const dayOfWeek = start.getDay();
      const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      start.setDate(start.getDate() + diffToMonday);
      start.setHours(0, 0, 0, 0);
      end.setTime(start.getTime());
      end.setDate(end.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      break;
    }
    
    case 'Monthly':
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(end.getMonth() + 1, 0); // Last day of month
      end.setHours(23, 59, 59, 999);
      break;
      
    case 'Yearly':
      start.setMonth(0, 1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(11, 31);
      end.setHours(23, 59, 59, 999);
      break;
  }
  
  return { start, end };
};

/** Navigate to previous/next period */
const navigatePeriod = (date: Date, period: TimePeriod, direction: 'prev' | 'next'): Date => {
  const newDate = new Date(date);
  const delta = direction === 'next' ? 1 : -1;
  
  switch (period) {
    case 'Daily':
      newDate.setDate(newDate.getDate() + delta);
      break;
    case 'Weekly':
      newDate.setDate(newDate.getDate() + delta * 7);
      break;
    case 'Monthly':
      newDate.setMonth(newDate.getMonth() + delta);
      break;
    case 'Yearly':
      newDate.setFullYear(newDate.getFullYear() + delta);
      break;
  }
  
  return newDate;
};

/** Get display label for period */
const getPeriodLabel = (date: Date, period: TimePeriod): string => {
  switch (period) {
    case 'Daily': {
      const day = date.getDate();
      return `${DAYS_SHORT[date.getDay()]}, ${MONTHS_SHORT[date.getMonth()]} ${day}${getDaySuffix(day)}`;
    }
    case 'Weekly': {
      const { start } = getDateRange(date, 'Weekly');
      const weekNum = Math.ceil((start.getTime() - new Date(start.getFullYear(), 0, 1).getTime()) / 604800000) + 1;
      return `Week ${weekNum}, ${start.getFullYear()}`;
    }
    case 'Monthly':
      return `${MONTHS_FULL[date.getMonth()]} ${date.getFullYear()}`;
    case 'Yearly':
      return `${date.getFullYear()}`;
  }
};

/** Check if date is in current period */
const isCurrentPeriod = (date: Date, period: TimePeriod): boolean => {
  const now = new Date();
  const currentRange = getDateRange(now, period);
  const selectedRange = getDateRange(date, period);
  return currentRange.start.getTime() === selectedRange.start.getTime();
};

// ============================================================================
// Chart Configuration per Period
// ============================================================================

interface ChartConfig {
  labels: string[];
  bucketCount: number;
  maxValue: number;
  getBucketIndex: (sessionDate: Date, rangeStart: Date) => number;
  getCurrentIndex: (rangeStart: Date) => number;
}

const getChartConfig = (period: TimePeriod, rangeStart: Date): ChartConfig => {
  const now = new Date();
  
  switch (period) {
    case 'Daily':
      return {
        labels: ['6a', '9a', '12p', '3p', '6p', '9p'],
        bucketCount: 6,
        maxValue: 4, // 4 hours per 3-hour block max
        getBucketIndex: (sessionDate: Date) => {
          const hour = sessionDate.getHours();
          if (hour < 6) return -1; // Before 6am
          if (hour < 9) return 0;
          if (hour < 12) return 1;
          if (hour < 15) return 2;
          if (hour < 18) return 3;
          if (hour < 21) return 4;
          return 5;
        },
        getCurrentIndex: () => {
          const hour = now.getHours();
          if (hour < 6) return -1;
          if (hour < 9) return 0;
          if (hour < 12) return 1;
          if (hour < 15) return 2;
          if (hour < 18) return 3;
          if (hour < 21) return 4;
          return 5;
        },
      };
      
    case 'Weekly':
      return {
        labels: ['M', 'T', 'W', 'T', 'F', 'S', 'S'],
        bucketCount: 7,
        maxValue: 8, // 8 hours per day max
        getBucketIndex: (sessionDate: Date) => {
          const dayOfWeek = sessionDate.getDay();
          return dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Monday = 0, Sunday = 6
        },
        getCurrentIndex: () => {
          const dayOfWeek = now.getDay();
          return dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        },
      };
      
    case 'Monthly': {
      // Show 4-5 weeks
      const daysInMonth = new Date(rangeStart.getFullYear(), rangeStart.getMonth() + 1, 0).getDate();
      const weeks = Math.ceil(daysInMonth / 7);
      return {
        labels: Array.from({ length: weeks }, (_, i) => `W${i + 1}`),
        bucketCount: weeks,
        maxValue: 40, // ~6 hours/day * 7 days
        getBucketIndex: (sessionDate: Date) => {
          const dayOfMonth = sessionDate.getDate();
          return Math.floor((dayOfMonth - 1) / 7);
        },
        getCurrentIndex: () => Math.floor((now.getDate() - 1) / 7),
      };
    }
      
    case 'Yearly':
      return {
        labels: MONTHS_SHORT,
        bucketCount: 12,
        maxValue: 200, // ~6 hours/day * 30 days
        getBucketIndex: (sessionDate: Date) => sessionDate.getMonth(),
        getCurrentIndex: () => now.getMonth(),
      };
  }
};

/** Calculate chart data from sessions */
const calculateChartData = (
  sessions: SessionDoc[],
  period: TimePeriod,
  rangeStart: Date
): number[] => {
  const config = getChartConfig(period, rangeStart);
  const buckets = new Array(config.bucketCount).fill(0);
  
  sessions.forEach(session => {
    if (!session.startedAt || !session.actualDuration) return;
    
    const sessionDate = new Date(session.startedAt);
    const bucketIndex = config.getBucketIndex(sessionDate, rangeStart);
    
    if (bucketIndex >= 0 && bucketIndex < config.bucketCount) {
      buckets[bucketIndex] += session.actualDuration / 3600; // Convert to hours
    }
  });
  
  return buckets;
};

// Building images
const BUILDING_IMAGES: Record<string, any> = {
  'cafe': require('@/assets/ui/cafeCabin.png'),
  'library': require('@/assets/ui/cafeLibrary.png'),
  'coastal': require('@/assets/ui/cafeEurope.png'),
  'indoor_cafe': require('@/assets/ui/cafeCabin.png'),
  'europe': require('@/assets/ui/cafeEurope.png'),
  'ghibli': require('@/assets/ui/cafeGhibli.png'),
  'japan': require('@/assets/ui/cafeJapan.png'),
};

const getLocationImage = (buildingId: string) => {
  return BUILDING_IMAGES[buildingId] || BUILDING_IMAGES['library'];
};

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, userDoc, isLoading } = useAuth();
  
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('Weekly');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [sessions, setSessions] = useState<SessionDoc[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [sceneTransitioning, setSceneTransitioning] = useState(true);
  
  // Profile editing state
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editUsername, setEditUsername] = useState('');
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editBirthday, setEditBirthday] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [editLocation, setEditLocation] = useState('');
  
  // Initialize edit form with current values
  const startEditing = useCallback(() => {
    setEditUsername(userDoc?.username || '');
    setEditDisplayName(userDoc?.displayName || '');
    setEditBio(userDoc?.bio || '');
    setEditBirthday(userDoc?.birthday ? new Date(userDoc.birthday) : null);
    setEditLocation(userDoc?.location || '');
    setShowDatePicker(false);
    setIsEditing(true);
  }, [userDoc]);
  
  // Cancel editing
  const cancelEditing = useCallback(() => {
    setIsEditing(false);
    setShowDatePicker(false);
  }, []);
  
  // Save profile changes
  const saveProfile = useCallback(async () => {
    if (!user?.uid) return;
    
    setIsSaving(true);
    try {
      const updates: Record<string, string | number | null> = {};
      
      // Only include changed fields
      const newUsername = editUsername.trim().toLowerCase();
      if (newUsername !== (userDoc?.username || '')) {
        if (newUsername.length < 3) {
          Alert.alert('Invalid Username', 'Username must be at least 3 characters.');
          setIsSaving(false);
          return;
        }
        updates.username = newUsername || null;
      }
      
      const newDisplayName = editDisplayName.trim();
      if (newDisplayName !== (userDoc?.displayName || '')) {
        updates.displayName = newDisplayName || null;
      }
      
      const newBio = editBio.trim();
      if (newBio !== (userDoc?.bio || '')) {
        updates.bio = newBio || null;
      }
      
      // Birthday is stored as timestamp
      const newBirthdayTimestamp = editBirthday ? editBirthday.getTime() : null;
      if (newBirthdayTimestamp !== (userDoc?.birthday || null)) {
        updates.birthday = newBirthdayTimestamp;
      }
      
      const newLocation = editLocation.trim();
      if (newLocation !== (userDoc?.location || '')) {
        updates.location = newLocation || null;
      }
      
      if (Object.keys(updates).length > 0) {
        await userService.updateProfile(user.uid, updates);
      }
      
      setIsEditing(false);
      setShowDatePicker(false);
    } catch (error) {
      console.error('[Profile] Failed to save profile:', error);
      Alert.alert('Error', 'Failed to save profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }, [user?.uid, userDoc, editUsername, editDisplayName, editBio, editBirthday, editLocation]);
  
  // Calculate date range based on selected period and current date
  const dateRange = useMemo(() => getDateRange(currentDate, selectedPeriod), [currentDate, selectedPeriod]);
  
  // Switch to character_showcase scene with head zoom when screen is focused
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
          
          // Set camera to head zoom
          setShowcaseCameraZoom('head');
          
          // Apply saved character appearance
          if (userDoc?.characterSkin) {
            setUserCharacter(userDoc.characterSkin);
          }
          
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
    }, [userDoc?.characterSkin])
  );
  
  // Fetch sessions for the selected period
  useEffect(() => {
    if (!user?.uid) return;
    
    const fetchSessions = async () => {
      setLoadingSessions(true);
      try {
        const data = await sessionService.getCompletedSessionsInRange(
          user.uid,
          dateRange.start.getTime(),
          dateRange.end.getTime()
        );
        setSessions(data);
      } catch (error) {
        console.error('[Profile] Failed to fetch sessions:', error);
        setSessions([]);
      } finally {
        setLoadingSessions(false);
      }
    };
    
    fetchSessions();
  }, [user?.uid, dateRange]);
  
  // Get chart configuration for current period
  const chartConfig = useMemo(
    () => getChartConfig(selectedPeriod, dateRange.start),
    [selectedPeriod, dateRange.start]
  );
  
  // Calculate stats for the selected period
  const periodStats = useMemo(() => {
    const totalSeconds = sessions.reduce((sum, s) => sum + (s.actualDuration ?? 0), 0);
    const totalSessions = sessions.length;
    
    // Calculate average based on period type
    let avgDivisor = 1;
    switch (selectedPeriod) {
      case 'Daily': avgDivisor = 1; break;
      case 'Weekly': avgDivisor = 7; break;
      case 'Monthly': avgDivisor = 30; break;
      case 'Yearly': avgDivisor = 365; break;
    }
    const avgSeconds = totalSessions > 0 ? Math.round(totalSeconds / avgDivisor) : 0;
    
    return {
      totalTime: formatFocusTime(totalSeconds),
      sessions: totalSessions,
      average: formatFocusTime(avgSeconds),
    };
  }, [sessions, selectedPeriod]);
  
  // Calculate chart data using the new utility
  const chartData = useMemo(
    () => calculateChartData(sessions, selectedPeriod, dateRange.start),
    [sessions, selectedPeriod, dateRange.start]
  );
  
  // Get current bucket index for highlighting (only if viewing current period)
  const currentBucketIndex = useMemo(() => {
    if (!isCurrentPeriod(currentDate, selectedPeriod)) return -1;
    return chartConfig.getCurrentIndex(dateRange.start);
  }, [currentDate, selectedPeriod, chartConfig, dateRange.start]);
  
  // Navigate period
  const handleNavigatePeriod = useCallback((direction: 'prev' | 'next') => {
    setCurrentDate(navigatePeriod(currentDate, selectedPeriod, direction));
  }, [currentDate, selectedPeriod]);
  
  // Reset to current period
  const resetToCurrentPeriod = useCallback(() => {
    setCurrentDate(new Date());
  }, []);
  
  // Handle period change - reset to current date when switching periods
  const handlePeriodChange = useCallback((period: TimePeriod) => {
    setSelectedPeriod(period);
    setCurrentDate(new Date()); // Reset to today when changing period
  }, []);
  
  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#8B7355" />
      </View>
    );
  }
  
  const displayName = userDoc?.displayName || userDoc?.username || 'Villager';
  const username = userDoc?.username || '';
  const joinDate = userDoc?.createdAt ? formatJoinDate(userDoc.createdAt) : 'Joined recently';
  const streak = userDoc?.currentStreak || 0;
  
  // Profile data from Firestore
  const bio = userDoc?.bio || '';
  const location = userDoc?.location || '';
  const birthday = formatBirthday(userDoc?.birthday ?? null);

  return (
    <LinearGradient
      colors={['#FEE2AA', '#F6F4E7', '#F6F4E7']}
      style={[styles.container, { paddingTop: insets.top }]}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <BackButton onPress={() => router.back()} />
          <Text style={styles.headerTitle}>Profile</Text>
        </View>
        <View style={styles.headerRight}>
          <BeanCounter size="small" />
          <Pressable
            style={({ pressed }) => [styles.settingsButton, pressed && styles.settingsButtonPressed]}
            onPress={() => router.push('/settings')}
          >
            <Image source={require('@/assets/ui/settings.png')} style={styles.settingsIcon} />
          </Pressable>
        </View>
      </View>
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ID Card */}
        <View style={styles.idCard}>
          {/* Card Header with Edit Button */}
          <View style={styles.idCardHeaderRow}>
            <Text style={styles.idCardHeader}>FOCUSTOWN ID: @{username || 'username'}</Text>
            {!isEditing ? (
              <Pressable style={styles.editButton} onPress={startEditing}>
                <Text style={styles.editButtonText}>Edit</Text>
              </Pressable>
            ) : (
              <View style={styles.editActions}>
                <Pressable 
                  style={styles.cancelButton} 
                  onPress={cancelEditing}
                  disabled={isSaving}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </Pressable>
                <Pressable 
                  style={[styles.saveButton, isSaving && styles.saveButtonDisabled]} 
                  onPress={saveProfile}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.saveButtonText}>Save</Text>
                  )}
                </Pressable>
              </View>
            )}
          </View>
          
          <View style={styles.idCardContent}>
            {/* Left side - Avatar */}
            <View style={styles.idCardLeft}>
              <Pressable 
                style={styles.avatarFrame}
                onPress={() => router.push('/character')}
              >
                <GodotGame style={styles.godotView} pckUrl={PCK_URL} />
                <SceneTransition 
                  visible={sceneTransitioning} 
                  backgroundColor="#FFF5E6"
                  fadeDuration={400}
                />
              </Pressable>
              <Text style={styles.joinDate}>{joinDate}</Text>
            </View>
            
            {/* Right side - Info */}
            <View style={styles.idCardRight}>
              {isEditing ? (
                <>
                  {/* Edit Mode */}
                  <View style={styles.editField}>
                    <Text style={styles.editLabel}>Bio (50 chars)</Text>
                    <TextInput
                      style={styles.editInput}
                      value={editBio}
                      onChangeText={setEditBio}
                      placeholder="Your bio..."
                      placeholderTextColor="#A89880"
                      maxLength={50}
                    />
                  </View>
                  
                  <View style={styles.editField}>
                    <Text style={styles.editLabel}>Display Name</Text>
                    <TextInput
                      style={styles.editInput}
                      value={editDisplayName}
                      onChangeText={setEditDisplayName}
                      placeholder="Your name"
                      placeholderTextColor="#A89880"
                      maxLength={20}
                      autoCapitalize="words"
                    />
                  </View>
                  
                  <View style={styles.editField}>
                    <Text style={styles.editLabel}>Username</Text>
                    <TextInput
                      style={styles.editInput}
                      value={editUsername}
                      onChangeText={(text) => setEditUsername(text.toLowerCase())}
                      placeholder="username"
                      placeholderTextColor="#A89880"
                      maxLength={20}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>
                  
                  <View style={styles.editField}>
                    <Text style={styles.editLabel}>Location</Text>
                    <TextInput
                      style={styles.editInput}
                      value={editLocation}
                      onChangeText={setEditLocation}
                      placeholder="School, city, etc."
                      placeholderTextColor="#A89880"
                      maxLength={30}
                    />
                  </View>
                  
                  <View style={styles.editField}>
                    <Text style={styles.editLabel}>Birthday</Text>
                    <Pressable 
                      style={styles.datePickerButton}
                      onPress={() => setShowDatePicker(true)}
                    >
                      <Text style={[
                        styles.datePickerButtonText,
                        !editBirthday && styles.datePickerPlaceholder
                      ]}>
                        {editBirthday ? formatBirthday(editBirthday.getTime()) : 'Select birthday'}
                      </Text>
                    </Pressable>
                  </View>
                </>
              ) : (
                <>
                  {/* View Mode */}
                  {/* Bio quote */}
                  <View style={styles.bioContainer}>
                    <Text style={styles.bioText}>
                      {bio ? `"${bio}"` : '50 character limit bio'}
                    </Text>
                  </View>
                  
                  {/* Name */}
                  <Text style={styles.userName}>{displayName}</Text>
                  
                  {/* Location */}
                  <View style={styles.infoRow}>
                    <Text style={styles.infoEmoji}>🏛</Text>
                    <Text style={styles.infoTextHighlight}>{location || 'Add location'}</Text>
                  </View>
                  
                  {/* Birthday */}
                  <View style={styles.infoRow}>
                    <Text style={styles.infoEmoji}>🎂</Text>
                    <Text style={styles.infoText}>{birthday || 'Add birthday'}</Text>
                  </View>
                </>
              )}
            </View>
          </View>
        </View>
        
        {/* Stats Section */}
        <Text style={styles.sectionTitle}>Stats</Text>
        
        {/* Period Tabs */}
        <View style={styles.periodTabs}>
          {(['Daily', 'Weekly', 'Monthly', 'Yearly'] as TimePeriod[]).map((period) => (
            <Pressable
              key={period}
              style={[
                styles.periodTab,
                selectedPeriod === period && styles.periodTabActive,
              ]}
              onPress={() => handlePeriodChange(period)}
            >
              <Text style={[
                styles.periodTabText,
                selectedPeriod === period && styles.periodTabTextActive,
              ]}>
                {period}
              </Text>
            </Pressable>
          ))}
        </View>
        
        {/* Period Navigation */}
        <View style={styles.periodNav}>
          <Pressable 
            style={styles.periodNavArrow}
            onPress={() => handleNavigatePeriod('prev')}
          >
            <Text style={styles.periodNavArrowText}>‹</Text>
          </Pressable>
          
          <View style={styles.periodNavCenter}>
            <Text style={styles.periodNavText}>{getPeriodLabel(currentDate, selectedPeriod)}</Text>
            {!isCurrentPeriod(currentDate, selectedPeriod) && (
              <Pressable style={styles.periodNavRefresh} onPress={resetToCurrentPeriod}>
                <Text style={styles.periodNavRefreshIcon}>↻</Text>
              </Pressable>
            )}
          </View>
          
          <Pressable 
            style={styles.periodNavArrow}
            onPress={() => handleNavigatePeriod('next')}
          >
            <Text style={styles.periodNavArrowText}>›</Text>
          </Pressable>
        </View>
        
        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          {/* Total Time */}
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#E3F2FD' }]}>
              <Text style={styles.statIconEmoji}>🕐</Text>
            </View>
            <View style={styles.statContent}>
              <Text style={styles.statValue}>{periodStats.totalTime}</Text>
              <Text style={styles.statLabel}>Total Time</Text>
            </View>
          </View>
          
          {/* Sessions */}
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#FFF8E1' }]}>
              <Text style={styles.statIconEmoji}>🎯</Text>
            </View>
            <View style={styles.statContent}>
              <Text style={styles.statValue}>{periodStats.sessions}</Text>
              <Text style={styles.statLabel}>Sessions</Text>
            </View>
          </View>
          
          {/* Streak */}
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#FFF3E0' }]}>
              <Text style={styles.statIconEmoji}>🏆</Text>
            </View>
            <View style={styles.statContent}>
              <Text style={styles.statValue}>{streak} days</Text>
              <Text style={styles.statLabel}>Streak</Text>
            </View>
          </View>
          
          {/* Average */}
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#E8F5E9' }]}>
              <Text style={styles.statIconEmoji}>📈</Text>
            </View>
            <View style={styles.statContent}>
              <Text style={styles.statValue}>{periodStats.average}</Text>
              <Text style={styles.statLabel}>{selectedPeriod === 'Daily' ? 'Total' : 'Avg/day'}</Text>
            </View>
          </View>
        </View>
        
        {/* Study Activity Chart */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Study Activity</Text>
          
          {loadingSessions ? (
            <View style={styles.chartLoading}>
              <ActivityIndicator size="small" color="#8B7355" />
            </View>
          ) : (
            <View style={styles.chartContainer}>
              {/* Y-axis labels */}
              <View style={styles.chartYAxis}>
                {[chartConfig.maxValue, Math.round(chartConfig.maxValue * 0.75), Math.round(chartConfig.maxValue * 0.5), Math.round(chartConfig.maxValue * 0.25), 0].map((value) => (
                  <Text key={value} style={styles.chartYLabel}>{value}</Text>
                ))}
              </View>
              
              {/* Bars */}
              <View style={styles.chartBars}>
                {chartData.map((hours, index) => {
                  const isCurrent = index === currentBucketIndex;
                  const barHeight = Math.min((hours / chartConfig.maxValue) * 100, 100);
                  
                  return (
                    <View key={index} style={styles.chartBarContainer}>
                      <View style={styles.chartBarWrapper}>
                        <View 
                          style={[
                            styles.chartBar,
                            { height: `${Math.max(barHeight, 2)}%` },
                            isCurrent && styles.chartBarCurrent,
                          ]}
                        />
                      </View>
                      <Text style={[
                        styles.chartXLabel,
                        chartConfig.labels.length > 7 && styles.chartXLabelSmall,
                      ]}>
                        {chartConfig.labels[index]}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}
        </View>
        
        {/* Activity Log */}
        <Text style={styles.activityLogTitle}>Activity Log</Text>
        
        {loadingSessions ? (
          <View style={styles.activityLoading}>
            <ActivityIndicator size="small" color="#8B7355" />
          </View>
        ) : sessions.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No study sessions this {selectedPeriod.toLowerCase()}</Text>
            <Text style={styles.emptyStateSubtext}>Start a session to see your activity here</Text>
          </View>
        ) : (
          sessions.slice(0, 10).map((session) => (
            <View key={session.id} style={styles.activityCard}>
              <Image 
                source={getLocationImage(session.buildingId)}
                style={styles.activityImage}
                resizeMode="contain"
              />
              
              <View style={styles.activityInfo}>
                <Text style={styles.activityDuration}>
                  {formatDuration(session.actualDuration ?? 0)}
                </Text>
                <Text style={styles.activityLocation}>
                  Went to {session.buildingName}
                </Text>
              </View>
              
              <View style={styles.activityBeans}>
                <Text style={styles.activityBeansText}>+{session.coinsEarned ?? 0}</Text>
                <Image 
                  source={require('@/assets/ui/bean.png')} 
                  style={styles.activityBeanIcon}
                />
              </View>
            </View>
          ))
        )}
      </ScrollView>
      
      {/* Date Picker Modal */}
      <Modal
        visible={showDatePicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDatePicker(false)}
      >
        <Pressable 
          style={styles.datePickerModalOverlay}
          onPress={() => setShowDatePicker(false)}
        >
          <Pressable style={styles.datePickerModalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.datePickerModalHeader}>
              <Text style={styles.datePickerModalTitle}>Select Birthday</Text>
              <Pressable onPress={() => setShowDatePicker(false)}>
                <Text style={styles.datePickerModalClose}>✕</Text>
              </Pressable>
            </View>
            <DateTimePicker
              value={editBirthday || new Date(2000, 0, 1)}
              mode="date"
              display="spinner"
              onChange={(event, selectedDate) => {
                if (selectedDate) {
                  setEditBirthday(selectedDate);
                }
              }}
              maximumDate={new Date()}
              minimumDate={new Date(1920, 0, 1)}
              style={styles.datePickerSpinner}
            />
            <Pressable 
              style={styles.datePickerModalDone}
              onPress={() => setShowDatePicker(false)}
            >
              <Text style={styles.datePickerModalDoneText}>Done</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#5D4037',
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
  
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  
  // ID Card
  idCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    marginTop: 8,
  },
  idCardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  idCardHeader: {
    fontSize: 14,
    fontWeight: '600',
    color: '#A89880',
    letterSpacing: 2,
    flex: 1,
  },
  editButton: {
    backgroundColor: '#8B9DC3',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  editActions: {
    flexDirection: 'row',
    gap: 8,
  },
  cancelButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8D6E63',
  },
  saveButton: {
    backgroundColor: '#6B8E5A',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    minWidth: 60,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  idCardContent: {
    flexDirection: 'row',
    gap: 16,
  },
  idCardLeft: {
    alignItems: 'center',
  },
  avatarFrame: {
    width: 120,
    height: 140,
    backgroundColor: '#FFF5E6',
    borderRadius: 12,
    borderWidth: 3,
    borderColor: '#E8DDD0',
    overflow: 'hidden',
  },
  godotView: {
    flex: 1,
    backgroundColor: '#FFF5E6',
  },
  joinDate: {
    fontSize: 11,
    color: '#A89880',
    marginTop: 8,
    fontFamily: 'monospace',
  },
  idCardRight: {
    flex: 1,
  },
  editField: {
    marginBottom: 10,
  },
  editLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#A89880',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  editInput: {
    backgroundColor: '#F8F6F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#5D4037',
    borderWidth: 1,
    borderColor: '#E8DDD0',
  },
  datePickerButton: {
    backgroundColor: '#F8F6F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E8DDD0',
  },
  datePickerButtonText: {
    fontSize: 14,
    color: '#5D4037',
  },
  datePickerPlaceholder: {
    color: '#A89880',
  },
  datePickerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  datePickerModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    width: '85%',
    maxWidth: 340,
  },
  datePickerModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  datePickerModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#5D4037',
  },
  datePickerModalClose: {
    fontSize: 20,
    color: '#A89880',
    padding: 4,
  },
  datePickerSpinner: {
    height: 200,
  },
  datePickerModalDone: {
    backgroundColor: '#6B8E5A',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  datePickerModalDoneText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  bioContainer: {
    backgroundColor: '#8B9DC3',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
  },
  bioText: {
    fontSize: 14,
    fontStyle: 'italic',
    color: '#FFFFFF',
    fontWeight: '500',
  },
  userName: {
    fontSize: 26,
    fontWeight: '700',
    color: '#5D4037',
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  infoEmoji: {
    fontSize: 16,
  },
  infoTextHighlight: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B8E5A',
  },
  infoText: {
    fontSize: 14,
    color: '#8D6E63',
  },
  
  // Section Title
  sectionTitle: {
    fontSize: 36,
    fontWeight: '700',
    color: '#C4B49A',
    marginTop: 32,
    marginBottom: 16,
  },
  
  // Period Tabs
  periodTabs: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 4,
  },
  periodTab: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 20,
    alignItems: 'center',
  },
  periodTabActive: {
    backgroundColor: '#8B9DC3',
  },
  periodTabText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#A89880',
  },
  periodTabTextActive: {
    color: '#FFFFFF',
  },
  
  // Week Navigation
  periodNav: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6B8E5A',
    borderRadius: 24,
    marginTop: 16,
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  periodNavArrow: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  periodNavArrowText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  periodNavCenter: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  periodNavText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  periodNavRefresh: {
    opacity: 0.8,
  },
  periodNavRefreshIcon: {
    fontSize: 20,
    color: '#FFFFFF',
  },
  
  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 20,
    gap: 12,
  },
  statCard: {
    width: (SCREEN_WIDTH - 52) / 2,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    gap: 12,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statIconEmoji: {
    fontSize: 24,
  },
  statContent: {
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#5D4037',
  },
  statLabel: {
    fontSize: 12,
    color: '#A89880',
    marginTop: 2,
  },
  
  // Chart
  chartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    marginTop: 20,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#5D4037',
    marginBottom: 20,
  },
  chartContainer: {
    flexDirection: 'row',
    height: 150,
  },
  chartLoading: {
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chartYAxis: {
    width: 24,
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingRight: 8,
    paddingBottom: 24,
  },
  chartYLabel: {
    fontSize: 12,
    color: '#A89880',
  },
  chartBars: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    paddingBottom: 24,
  },
  chartBarContainer: {
    alignItems: 'center',
    flex: 1,
  },
  chartBarWrapper: {
    height: 100,
    width: 24,
    justifyContent: 'flex-end',
  },
  chartBar: {
    width: '100%',
    backgroundColor: '#F5D98C',
    borderRadius: 12,
    minHeight: 4,
  },
  chartBarCurrent: {
    backgroundColor: '#78ADFD',
  },
  chartXLabel: {
    fontSize: 12,
    color: '#A89880',
  },
  chartXLabelSmall: {
    fontSize: 9,
    marginTop: 8,
  },
  
  // Activity Log
  activityLogTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#5D4037',
    marginTop: 24,
    marginBottom: 12,
  },
  activityLoading: {
    padding: 32,
    alignItems: 'center',
  },
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5E6',
    borderRadius: 20,
    padding: 12,
    marginBottom: 12,
    gap: 12,
  },
  activityImage: {
    width: 56,
    height: 56,
    borderRadius: 12,
  },
  activityInfo: {
    flex: 1,
  },
  activityDuration: {
    fontSize: 16,
    fontWeight: '700',
    color: '#5D4037',
  },
  activityLocation: {
    fontSize: 13,
    color: '#8D6E63',
    marginTop: 2,
  },
  activityBeans: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  activityBeansText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#6B8E5A',
  },
  activityBeanIcon: {
    width: 18,
    height: 18,
  },
  
  // Empty State
  emptyState: {
    backgroundColor: '#FFF5E6',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#5D4037',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#A89880',
    marginTop: 4,
    textAlign: 'center',
  },
});
