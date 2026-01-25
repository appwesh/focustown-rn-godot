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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth, sessionService, type SessionDoc } from '@/lib/firebase';
import { BackButton, BeanCounter } from '@/components/ui';
import { GodotGame } from '@/components/godot-view';
import { SceneTransition } from '@/components/scene-transition';
import { isGodotReady, changeScene, setUserCharacter, setShowcaseCameraZoom } from '@/lib/godot';
import { PCK_URL } from '@/constants/game';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Time period types
type TimePeriod = 'Daily' | 'Weekly' | 'Monthly' | 'Yearly';

// Format focus time for display (hours)
const formatFocusTimeHours = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  return `${hours}h`;
};

// Format duration for activity log
const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes} mins`;
  }
  return `${minutes} mins`;
};

// Format date for display
const formatJoinDate = (timestamp: number): string => {
  const date = new Date(timestamp);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const day = date.getDate();
  const suffix = day === 1 || day === 21 || day === 31 ? 'st' : day === 2 || day === 22 ? 'nd' : day === 3 || day === 23 ? 'rd' : 'th';
  return `Joined ${months[date.getMonth()]} ${day}${suffix}, ${date.getFullYear()}`;
};

// Get week number of the year
const getWeekNumber = (date: Date): number => {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
};

// Get start and end of week (Monday to Sunday)
const getWeekRange = (date: Date): { start: Date; end: Date } => {
  const start = new Date(date);
  const day = start.getDay();
  const diff = start.getDate() - day + (day === 0 ? -6 : 1);
  start.setDate(diff);
  start.setHours(0, 0, 0, 0);
  
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  
  return { start, end };
};

// Day labels for chart
const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

// Building images
const BUILDING_IMAGES: Record<string, any> = {
  'cafe': require('@/assets/ui/cafeCabin.png'),
  'library': require('@/assets/ui/cafeLibrary.png'),
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
  
  // Calculate week range based on current date
  const weekRange = useMemo(() => getWeekRange(currentDate), [currentDate]);
  
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
  
  // Fetch sessions for the selected week
  useEffect(() => {
    if (!user?.uid) return;
    
    const fetchSessions = async () => {
      setLoadingSessions(true);
      try {
        const data = await sessionService.getCompletedSessionsInRange(
          user.uid,
          weekRange.start.getTime(),
          weekRange.end.getTime()
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
  }, [user?.uid, weekRange]);
  
  // Calculate stats for the selected period
  const periodStats = useMemo(() => {
    const totalSeconds = sessions.reduce((sum, s) => sum + (s.actualDuration ?? 0), 0);
    const totalSessions = sessions.length;
    const avgSeconds = totalSessions > 0 ? Math.round(totalSeconds / 7) : 0;
    
    return {
      totalTime: formatFocusTimeHours(totalSeconds),
      sessions: totalSessions,
      average: formatFocusTimeHours(avgSeconds),
    };
  }, [sessions]);
  
  // Calculate daily hours for the chart
  const dailyHours = useMemo(() => {
    const hours = [0, 0, 0, 0, 0, 0, 0];
    
    sessions.forEach(session => {
      if (!session.startedAt || !session.actualDuration) return;
      
      const sessionDate = new Date(session.startedAt);
      let dayIndex = sessionDate.getDay() - 1;
      if (dayIndex < 0) dayIndex = 6;
      
      hours[dayIndex] += session.actualDuration / 3600;
    });
    
    return hours;
  }, [sessions]);
  
  // Get current day index for highlighting
  const currentDayIndex = useMemo(() => {
    const today = new Date();
    const { start, end } = weekRange;
    if (today >= start && today <= end) {
      let dayIndex = today.getDay() - 1;
      if (dayIndex < 0) dayIndex = 6;
      return dayIndex;
    }
    return -1;
  }, [weekRange]);
  
  // Navigate week
  const navigateWeek = useCallback((direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    setCurrentDate(newDate);
  }, [currentDate]);
  
  // Reset to current week
  const resetToCurrentWeek = useCallback(() => {
    setCurrentDate(new Date());
  }, []);
  
  // Get display text for current period
  const getPeriodLabel = (): string => {
    const weekNum = getWeekNumber(currentDate);
    const year = currentDate.getFullYear();
    return `Week ${weekNum}, ${year}`;
  };
  
  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#8B7355" />
      </View>
    );
  }
  
  const displayName = userDoc?.displayName || userDoc?.username || 'Villager';
  const joinDate = userDoc?.createdAt ? formatJoinDate(userDoc.createdAt) : 'Joined recently';
  const streak = userDoc?.currentStreak || 0;
  
  // Placeholder data for bio, university, birthday (can be added to userDoc later)
  const bio = "Making my dreams a reality!";
  const university = "Villanova University";
  const birthday = "Born March 15th";

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
        <BeanCounter size="small" />
      </View>
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ID Card */}
        <View style={styles.idCard}>
          {/* Card Header */}
          <Text style={styles.idCardHeader}>FOCUSTOWN ID</Text>
          
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
              {/* Bio quote */}
              <View style={styles.bioContainer}>
                <Text style={styles.bioText}>"{bio}"</Text>
              </View>
              
              {/* Name */}
              <Text style={styles.userName}>{displayName}</Text>
              
              {/* University */}
              <View style={styles.infoRow}>
                <Text style={styles.infoEmoji}>🏫</Text>
                <Text style={styles.infoTextHighlight}>{university}</Text>
              </View>
              
              {/* Birthday */}
              <View style={styles.infoRow}>
                <Text style={styles.infoEmoji}>🎂</Text>
                <Text style={styles.infoText}>{birthday}</Text>
              </View>
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
              onPress={() => setSelectedPeriod(period)}
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
        
        {/* Week Navigation */}
        <View style={styles.weekNav}>
          <Pressable 
            style={styles.weekNavArrow}
            onPress={() => navigateWeek('prev')}
          >
            <Text style={styles.weekNavArrowText}>‹</Text>
          </Pressable>
          
          <View style={styles.weekNavCenter}>
            <Text style={styles.weekNavText}>{getPeriodLabel()}</Text>
            <Pressable style={styles.weekNavRefresh} onPress={resetToCurrentWeek}>
              <Text style={styles.weekNavRefreshIcon}>↻</Text>
            </Pressable>
          </View>
          
          <Pressable 
            style={styles.weekNavArrow}
            onPress={() => navigateWeek('next')}
          >
            <Text style={styles.weekNavArrowText}>›</Text>
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
              <Text style={styles.statLabel}>Average</Text>
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
                {[8, 6, 4, 2, 0].map((value) => (
                  <Text key={value} style={styles.chartYLabel}>{value}</Text>
                ))}
              </View>
              
              {/* Bars */}
              <View style={styles.chartBars}>
                {dailyHours.map((hours, index) => {
                  const isToday = index === currentDayIndex;
                  const barHeight = Math.min((hours / 8) * 100, 100);
                  
                  return (
                    <View key={index} style={styles.chartBarContainer}>
                      <View style={styles.chartBarWrapper}>
                        <View 
                          style={[
                            styles.chartBar,
                            { height: `${Math.max(barHeight, 2)}%` },
                            isToday && styles.chartBarToday,
                          ]}
                        />
                      </View>
                      <Text style={styles.chartXLabel}>{DAY_LABELS[index]}</Text>
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
            <Text style={styles.emptyStateText}>No study sessions this week</Text>
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
  idCardHeader: {
    fontSize: 14,
    fontWeight: '600',
    color: '#A89880',
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: 16,
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
  weekNav: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6B8E5A',
    borderRadius: 24,
    marginTop: 16,
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  weekNavArrow: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  weekNavArrowText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  weekNavCenter: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  weekNavText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  weekNavRefresh: {
    opacity: 0.8,
  },
  weekNavRefreshIcon: {
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
  chartBarToday: {
    backgroundColor: '#78ADFD',
  },
  chartXLabel: {
    fontSize: 12,
    color: '#A89880',
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
