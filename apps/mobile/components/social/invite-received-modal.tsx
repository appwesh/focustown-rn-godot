/**
 * Invite Received Modal
 * 
 * Shown when you receive a group study invite.
 * Can appear even during an active session.
 */

import React, { useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
} from 'react-native';
import { useSocialStore, type IncomingInvite } from '@/lib/social';

interface InviteReceivedModalProps {
  visible: boolean;
  invite: IncomingInvite | null;
  onClose: () => void;
}

/**
 * Format duration in minutes to readable string
 */
function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  if (mins >= 60) {
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return remainingMins > 0 ? `${hours}h ${remainingMins}m` : `${hours}h`;
  }
  return `${mins} min`;
}

export function InviteReceivedModal({ visible, invite, onClose }: InviteReceivedModalProps) {
  const acceptInvite = useSocialStore((s) => s.acceptInvite);
  const declineInvite = useSocialStore((s) => s.declineInvite);
  
  const handleAccept = useCallback(async () => {
    if (invite) {
      await acceptInvite(invite.inviteId);
    }
    onClose();
  }, [invite, acceptInvite, onClose]);
  
  const handleDecline = useCallback(async () => {
    if (invite) {
      await declineInvite(invite.inviteId);
    }
    onClose();
  }, [invite, declineInvite, onClose]);
  
  if (!invite) return null;
  
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleDecline}
    >
      <Pressable style={styles.backdrop} onPress={handleDecline}>
        <Pressable style={styles.container} onPress={(e) => e.stopPropagation()}>
          {/* Icon */}
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>🌳</Text>
          </View>
          
          {/* Title */}
          <Text style={styles.title}>Group Study Invite!</Text>
          
          {/* Host info */}
          <Text style={styles.inviteText}>
            <Text style={styles.hostName}>{invite.hostName}</Text>
            {' invited you to study together'}
          </Text>
          
          {/* Details */}
          <View style={styles.detailsContainer}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Location</Text>
              <Text style={styles.detailValue}>{invite.buildingName}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Duration</Text>
              <Text style={styles.detailValue}>{formatDuration(invite.plannedDuration)}</Text>
            </View>
          </View>
          
          {/* Buttons */}
          <View style={styles.buttonRow}>
            <Pressable
              style={({ pressed }) => [styles.button, styles.declineButton, pressed && styles.buttonPressed]}
              onPress={handleDecline}
            >
              <Text style={[styles.buttonText, styles.declineButtonText]}>Decline</Text>
            </Pressable>
            
            <Pressable
              style={({ pressed }) => [styles.button, styles.acceptButton, pressed && styles.buttonPressed]}
              onPress={handleAccept}
            >
              <Text style={[styles.buttonText, styles.acceptButtonText]}>Join!</Text>
            </Pressable>
          </View>
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
    padding: 24,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#83715B',
    borderBottomWidth: 7,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F5EDD8',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  icon: {
    fontSize: 36,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#5D4037',
    marginBottom: 8,
  },
  inviteText: {
    fontSize: 15,
    color: '#6B5344',
    textAlign: 'center',
    marginBottom: 20,
  },
  hostName: {
    fontWeight: '700',
    color: '#5D4037',
  },
  detailsContainer: {
    width: '100%',
    backgroundColor: '#F5EDD8',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#8B7355',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#5D4037',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
  },
  declineButton: {
    backgroundColor: '#F5EDD8',
    borderWidth: 2,
    borderColor: '#DDD5C7',
  },
  acceptButton: {
    backgroundColor: '#90BE6D',
  },
  buttonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  declineButtonText: {
    color: '#6B5344',
  },
  acceptButtonText: {
    color: '#FFF',
  },
});

