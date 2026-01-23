/**
 * Social Screen - Friends list
 * 
 * Shows all friends with their current status:
 * - Online + At Home: Can invite to group study
 * - Online + Studying: Can join their location
 * - Offline: Can invite to group study
 */

import { useCallback, useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useAuth } from '@/lib/firebase';
import { useSocialStore, type FriendWithStatus } from '@/lib/social';
import { FriendCard } from '@/components/social/friend-card';
import { AddFriendModal } from '@/components/social/add-friend-modal';

export default function SocialScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  
  // Lock to portrait orientation
  useFocusEffect(
    useCallback(() => {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    }, [])
  );
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  
  // Social store
  const friends = useSocialStore((s) => s.friends);
  const friendsLoading = useSocialStore((s) => s.friendsLoading);
  const pendingRequestsCount = useSocialStore((s) => s.pendingRequestsCount);
  const showingAddFriend = useSocialStore((s) => s.showingAddFriend);
  const setShowingAddFriend = useSocialStore((s) => s.setShowingAddFriend);
  const setShowingFriendPicker = useSocialStore((s) => s.setShowingFriendPicker);
  
  // Note: Social store is initialized in home.tsx - no duplicate init needed
  
  // Handlers
  const handleInvite = useCallback((friend: FriendWithStatus) => {
    // Open friend picker with this friend pre-selected for invite
    // For now, just open picker and let user select
    setShowingFriendPicker(true);
    router.back(); // Go back to home where friend picker shows
  }, [setShowingFriendPicker, router]);
  
  const handleJoin = useCallback((friend: FriendWithStatus) => {
    // Navigate to game at friend's location
    // The friend's building will be available even if locked
    if (friend.currentSession) {
      // TODO: Pass building info to game
      router.push('/game');
    }
  }, [router]);
  
  const handleAddFriend = useCallback(() => {
    setShowingAddFriend(true);
  }, [setShowingAddFriend]);
  
  // Filter and sort friends
  const filteredFriends = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    
    // Filter by search query
    let result = friends;
    if (query) {
      result = friends.filter((friend) => {
        const name = (friend.displayName || '').toLowerCase();
        const username = (friend.username || '').toLowerCase();
        return name.includes(query) || username.includes(query);
      });
    }
    
    // Sort: studying first, then online, then offline
    return result.sort((a, b) => {
      const statusOrder = { 'online-studying': 0, 'online-idle': 1, 'offline': 2 };
      return statusOrder[a.status] - statusOrder[b.status];
    });
  }, [friends, searchQuery]);
  
  const hasFriends = friends.length > 0;
  const hasResults = filteredFriends.length > 0;
  
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}
          onPress={() => router.back()}
        >
          <Text style={styles.backIcon}>←</Text>
        </Pressable>
        
        <Text style={styles.title}>Friends</Text>
        
        <Pressable
          style={({ pressed }) => [styles.addButton, pressed && styles.addButtonPressed]}
          onPress={handleAddFriend}
        >
          <Text style={styles.addButtonText}>+ Add</Text>
        </Pressable>
      </View>
      
      {/* Pending requests banner */}
      {pendingRequestsCount > 0 && (
        <Pressable style={styles.pendingBanner} onPress={handleAddFriend}>
          <Text style={styles.pendingBannerText}>
            {pendingRequestsCount} pending friend request{pendingRequestsCount > 1 ? 's' : ''}
          </Text>
          <Text style={styles.pendingBannerArrow}>→</Text>
        </Pressable>
      )}
      
      {/* Search Bar - only show if has friends */}
      {hasFriends && (
        <View style={styles.searchContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search friends..."
            placeholderTextColor="#A0A0A0"
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="while-editing"
          />
          {searchQuery.length > 0 && (
            <Pressable
              style={styles.clearButton}
              onPress={() => setSearchQuery('')}
            >
              <Text style={styles.clearButtonText}>×</Text>
            </Pressable>
          )}
        </View>
      )}
      
      {/* Content */}
      {friendsLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#90BE6D" />
          <Text style={styles.loadingText}>Loading friends...</Text>
        </View>
      ) : !hasFriends ? (
        // Empty state
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>👋</Text>
          <Text style={styles.emptyTitle}>No friends yet</Text>
          <Text style={styles.emptySubtitle}>
            Add friends to study together and earn bonus gems!
          </Text>
          <Pressable
            style={({ pressed }) => [styles.emptyButton, pressed && styles.emptyButtonPressed]}
            onPress={handleAddFriend}
          >
            <Text style={styles.emptyButtonText}>Add your first friend</Text>
          </Pressable>
        </View>
      ) : !hasResults && searchQuery ? (
        // No search results
        <View style={styles.noResultsContainer}>
          <Text style={styles.noResultsEmoji}>🔍</Text>
          <Text style={styles.noResultsText}>No friends found</Text>
          <Text style={styles.noResultsHint}>Try a different search term</Text>
        </View>
      ) : (
        // Friends list
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {filteredFriends.map((friend) => (
            <FriendCard
              key={friend.odId}
              friend={friend}
              onInvite={handleInvite}
              onJoin={handleJoin}
            />
          ))}
        </ScrollView>
      )}
      
      {/* Add Friend Modal */}
      <AddFriendModal
        visible={showingAddFriend}
        onClose={() => setShowingAddFriend(false)}
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FFF8E7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.95 }],
  },
  backIcon: {
    fontSize: 24,
    color: '#5D4037',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#5D4037',
  },
  addButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#90BE6D',
    borderRadius: 20,
  },
  addButtonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.96 }],
  },
  addButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  pendingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFE4B5',
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  pendingBannerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#5D4037',
  },
  pendingBannerArrow: {
    fontSize: 18,
    color: '#5D4037',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E7',
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#DDD5C7',
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#3D3D3D',
    paddingVertical: 4,
  },
  clearButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#DDD5C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  clearButtonText: {
    fontSize: 18,
    color: '#6B5344',
    marginTop: -2,
  },
  noResultsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  noResultsEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  noResultsText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#5D4037',
    marginBottom: 4,
  },
  noResultsHint: {
    fontSize: 14,
    color: '#8B7355',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#8B7355',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#5D4037',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#8B7355',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  emptyButton: {
    backgroundColor: '#90BE6D',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 30,
  },
  emptyButtonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.96 }],
  },
  emptyButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: 8,
    paddingBottom: 24,
  },
});

