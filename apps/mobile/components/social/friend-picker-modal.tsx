/**
 * Friend Picker Modal
 * 
 * Select friends to invite to group study.
 * Shows friends not already in the lobby.
 */

import React, { useMemo, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSocialStore, type FriendWithStatus } from '@/lib/social';

interface FriendPickerModalProps {
  visible: boolean;
  onClose: () => void;
}

interface FriendRowProps {
  friend: FriendWithStatus;
  onSelect: (friend: FriendWithStatus) => void;
}

function FriendRow({ friend, onSelect }: FriendRowProps) {
  const isStudying = friend.status === 'online-studying';
  const isOnline = friend.status !== 'offline';
  
  return (
    <Pressable
      style={({ pressed }) => [styles.friendRow, pressed && styles.friendRowPressed]}
      onPress={() => onSelect(friend)}
    >
      {/* Avatar */}
      <View style={styles.avatarContainer}>
        {friend.avatarUrl ? (
          <Image
            source={{ uri: friend.avatarUrl }}
            style={styles.avatar}
          />
        ) : (
          <Text style={styles.avatarEmoji}>👤</Text>
        )}
      </View>
      
      {/* Info */}
      <View style={styles.friendInfo}>
        <View style={styles.nameRow}>
          <View style={[styles.statusDot, isOnline ? styles.statusOnline : styles.statusOffline]} />
          <Text style={styles.friendName} numberOfLines={1}>
            {friend.displayName || 'Anonymous'}
          </Text>
        </View>
        <Text style={styles.friendStatus}>
          {isStudying ? 'Studying' : isOnline ? 'Online' : 'Offline'}
        </Text>
      </View>
      
      {/* Select indicator */}
      <View style={styles.selectIcon}>
        <Text style={styles.selectIconText}>+</Text>
      </View>
    </Pressable>
  );
}

export function FriendPickerModal({ visible, onClose }: FriendPickerModalProps) {
  const router = useRouter();
  
  const friends = useSocialStore((s) => s.friends);
  const lobbySlots = useSocialStore((s) => s.lobbySlots);
  const inviteToLobby = useSocialStore((s) => s.inviteToLobby);
  
  // Filter out friends already in lobby
  const availableFriends = useMemo(() => {
    const inLobbyIds = new Set(lobbySlots.map(s => s.odId).filter(Boolean));
    return friends.filter(f => !inLobbyIds.has(f.odId));
  }, [friends, lobbySlots]);
  
  const handleSelectFriend = useCallback(async (friend: FriendWithStatus) => {
    await inviteToLobby(friend.odId, friend.displayName || 'Anonymous', friend.avatarUrl || null);
    onClose();
  }, [inviteToLobby, onClose]);
  
  const handleGoToSocial = useCallback(() => {
    onClose();
    router.push('/social');
  }, [onClose, router]);
  
  const hasFriends = friends.length > 0;
  const hasAvailableFriends = availableFriends.length > 0;
  
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.container} onPress={(e) => e.stopPropagation()}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Invite Friend</Text>
            <Pressable
              style={({ pressed }) => [styles.closeButton, pressed && styles.closeButtonPressed]}
              onPress={onClose}
            >
              <Text style={styles.closeIcon}>×</Text>
            </Pressable>
          </View>
          
          {/* Content */}
          {!hasFriends ? (
            // No friends at all
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>👋</Text>
              <Text style={styles.emptyTitle}>No friends yet</Text>
              <Text style={styles.emptySubtitle}>
                Add friends to invite them to study together!
              </Text>
              <Pressable
                style={({ pressed }) => [styles.emptyButton, pressed && styles.emptyButtonPressed]}
                onPress={handleGoToSocial}
              >
                <Text style={styles.emptyButtonText}>Add Friends</Text>
              </Pressable>
            </View>
          ) : !hasAvailableFriends ? (
            // All friends already in lobby
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>✓</Text>
              <Text style={styles.emptyTitle}>All invited!</Text>
              <Text style={styles.emptySubtitle}>
                You've already invited all your friends.
              </Text>
            </View>
          ) : (
            // Friends list
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {availableFriends.map((friend) => (
                <FriendRow
                  key={friend.odId}
                  friend={friend}
                  onSelect={handleSelectFriend}
                />
              ))}
            </ScrollView>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  container: {
    backgroundColor: '#FFF8E7',
    borderRadius: 24,
    padding: 20,
    width: '100%',
    maxWidth: 340,
    maxHeight: '70%',
    shadowColor: '#5D4037',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
    borderWidth: 3,
    borderColor: '#DDD5C7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#5D4037',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F5EDD8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonPressed: {
    opacity: 0.7,
  },
  closeIcon: {
    fontSize: 24,
    color: '#5D4037',
    marginTop: -2,
  },
  scrollView: {
    maxHeight: 300,
  },
  scrollContent: {
    paddingBottom: 8,
  },
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5EDD8',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  friendRowPressed: {
    backgroundColor: '#EDE4CF',
  },
  avatarContainer: {
    width: 44,
    height: 44,
    borderRadius: 11,
    backgroundColor: '#FFF8E7',
    overflow: 'hidden',
    marginRight: 12,
  },
  avatar: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  avatarEmoji: {
    fontSize: 22,
  },
  friendInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusOnline: {
    backgroundColor: '#90BE6D',
  },
  statusOffline: {
    backgroundColor: '#A0A0A0',
  },
  friendName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#3D3D3D',
  },
  friendStatus: {
    fontSize: 13,
    color: '#8B7355',
    marginTop: 2,
  },
  selectIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#90BE6D',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectIconText: {
    fontSize: 20,
    color: '#FFF',
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#5D4037',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#8B7355',
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  emptyButton: {
    backgroundColor: '#90BE6D',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
  },
  emptyButtonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.96 }],
  },
  emptyButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
});

