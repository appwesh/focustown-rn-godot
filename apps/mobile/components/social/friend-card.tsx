/**
 * Friend Card Component
 * 
 * Displays a friend with one of 3 states:
 * 1. Online + At Home: Green dot, "At Home", Invite button
 * 2. Online + Studying: Green dot, timer countdown, Join button
 * 3. Offline: Gray dot, last active time, weekly stats, Invite button
 */

import React from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  StyleSheet,
} from 'react-native';
import type { FriendWithStatus } from '@/lib/social';

interface FriendCardProps {
  friend: FriendWithStatus;
  onInvite: (friend: FriendWithStatus) => void;
  onJoin: (friend: FriendWithStatus) => void;
}

/**
 * Format seconds to MM:SS
 */
function formatTimer(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format time duration to human readable
 */
function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}H ${mins}M`;
  }
  return `${mins}M`;
}

/**
 * Format relative time (e.g., "3 days ago")
 */
function formatRelativeTime(timestamp?: number): string {
  if (!timestamp) return 'Unknown';
  
  const now = Date.now();
  const diff = now - timestamp;
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (minutes > 0) return `${minutes} min${minutes > 1 ? 's' : ''} ago`;
  return 'Just now';
}

export function FriendCard({ friend, onInvite, onJoin }: FriendCardProps) {
  const isStudying = friend.status === 'online-studying';
  const isOnline = friend.status !== 'offline';
  
  // Determine action button
  const showJoinButton = isStudying;
  
  return (
    <View style={styles.card}>
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
      
      {/* Info Section */}
      <View style={styles.infoSection}>
        {/* Name Row */}
        <View style={styles.nameRow}>
          <View style={[styles.statusDot, isOnline ? styles.statusOnline : styles.statusOffline]} />
          <Text style={styles.displayName} numberOfLines={1}>
            {friend.displayName || 'Anonymous'}
          </Text>
          <Text style={styles.username} numberOfLines={1}>
            @{friend.username || 'user'}
          </Text>
        </View>
        
        {/* Location / Status Row */}
        <Text style={styles.locationText} numberOfLines={1}>
          {friend.currentSession?.buildingName || 'Brooklyn Cafe'}
        </Text>
        
        {/* Context Row - different based on state */}
        <View style={styles.contextRow}>
          {isStudying && friend.currentSession ? (
            // Studying: Show timer
            <View style={styles.timerContainer}>
              <Text style={styles.timerIcon}>⏱️</Text>
              <Text style={styles.timerText}>
                {formatTimer(friend.currentSession.remainingSeconds)}
              </Text>
            </View>
          ) : isOnline ? (
            // At Home
            <Text style={styles.statusText}>At Home</Text>
          ) : (
            // Offline: Show last active and weekly time
            <View style={styles.offlineInfo}>
              <Text style={styles.lastActiveText}>
                Last active: {formatRelativeTime(friend.lastActiveAt)}
              </Text>
              <Text style={styles.weeklyTimeText}>
                TT: {formatDuration(friend.weeklyFocusTime || 0)} (week)
              </Text>
            </View>
          )}
        </View>
      </View>
      
      {/* Action Button */}
      <Pressable
        style={({ pressed }) => [
          styles.actionButton,
          showJoinButton ? styles.joinButton : styles.inviteButton,
          pressed && styles.actionButtonPressed,
        ]}
        onPress={() => showJoinButton ? onJoin(friend) : onInvite(friend)}
      >
        <Text style={styles.actionButtonText}>
          {showJoinButton ? 'Join' : 'Invite'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E7',
    borderRadius: 16,
    padding: 12,
    marginHorizontal: 16,
    marginVertical: 6,
    shadowColor: '#5D4037',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  avatarContainer: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: '#F5EDD8',
    overflow: 'hidden',
    marginRight: 12,
  },
  avatar: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  avatarEmoji: {
    fontSize: 28,
  },
  infoSection: {
    flex: 1,
    marginRight: 12,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
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
  displayName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#3D3D3D',
    marginRight: 8,
  },
  username: {
    fontSize: 13,
    color: '#8B7355',
  },
  locationText: {
    fontSize: 13,
    color: '#6B5344',
    marginBottom: 2,
  },
  contextRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timerIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  timerText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#5D4037',
    fontVariant: ['tabular-nums'],
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#5D4037',
  },
  offlineInfo: {
    flexDirection: 'column',
  },
  lastActiveText: {
    fontSize: 12,
    color: '#8B7355',
  },
  weeklyTimeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#5D4037',
  },
  actionButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    minWidth: 70,
    alignItems: 'center',
  },
  inviteButton: {
    backgroundColor: '#90BE6D',
  },
  joinButton: {
    backgroundColor: '#4ECDC4',
  },
  actionButtonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.96 }],
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});

