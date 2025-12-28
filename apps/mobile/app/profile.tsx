import { StyleSheet, View, Text, TextInput, Pressable, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/firebase';
import { userService } from '@/lib/firebase/user';

export default function ProfileScreen() {
  const { userDoc, user, isLoading } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Format focus time
  const formatFocusTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  // Get player level based on sessions
  const getLevel = (sessions: number): { title: string; emoji: string } => {
    if (sessions >= 100) return { title: 'Master Builder', emoji: '🏰' };
    if (sessions >= 50) return { title: 'Town Elder', emoji: '🎖️' };
    if (sessions >= 20) return { title: 'Resident', emoji: '🏡' };
    if (sessions >= 5) return { title: 'Newcomer', emoji: '🌱' };
    return { title: 'Just arrived', emoji: '👋' };
  };

  const handleEditStart = () => {
    setEditName(userDoc?.displayName || '');
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!user || !editName.trim()) return;
    
    setIsSaving(true);
    try {
      await userService.updateProfile(user.uid, { displayName: editName.trim() });
      setIsEditing(false);
    } catch (error) {
      console.error('[Profile] Failed to save:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditName('');
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#FFB347" />
      </View>
    );
  }

  const displayName = userDoc?.displayName || 'Villager';
  const level = getLevel(userDoc?.sessionsCompleted || 0);
  const focusTime = formatFocusTime(userDoc?.totalFocusTime || 0);
  const coins = userDoc?.totalCoins || 0;
  const sessions = userDoc?.sessionsCompleted || 0;

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarEmoji}>{level.emoji}</Text>
        </View>

        <View style={styles.nameTag}>
          {isEditing ? (
            <View style={styles.editContainer}>
              <TextInput
                style={styles.editInput}
                value={editName}
                onChangeText={setEditName}
                placeholder="Your name"
                placeholderTextColor="#A89F91"
                autoFocus
                maxLength={20}
              />
              <View style={styles.editButtons}>
                <Pressable 
                  style={[styles.editButton, styles.cancelButton]} 
                  onPress={handleCancel}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </Pressable>
                <Pressable 
                  style={[styles.editButton, styles.saveButton, isSaving && styles.buttonDisabled]} 
                  onPress={handleSave}
                  disabled={isSaving || !editName.trim()}
                >
                  {isSaving ? (
                    <ActivityIndicator size="small" color="#5D4037" />
                  ) : (
                    <Text style={styles.saveButtonText}>Save</Text>
                  )}
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable onPress={handleEditStart}>
              <Text style={styles.name}>{displayName}</Text>
              <Text style={styles.subtitle}>{level.title}</Text>
              <Text style={styles.editHint}>Tap to edit</Text>
            </Pressable>
          )}
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statEmoji}>⏱️</Text>
            <Text style={styles.statValue}>{focusTime}</Text>
            <Text style={styles.statLabel}>Focus Time</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statEmoji}>🪙</Text>
            <Text style={styles.statValue}>{coins}</Text>
            <Text style={styles.statLabel}>Coins</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statEmoji}>✅</Text>
            <Text style={styles.statValue}>{sessions}</Text>
            <Text style={styles.statLabel}>Sessions</Text>
          </View>
        </View>

        {userDoc?.phoneNumber && (
          <View style={styles.phoneCard}>
            <Text style={styles.phoneLabel}>📱 Phone</Text>
            <Text style={styles.phoneNumber}>{userDoc.phoneNumber}</Text>
          </View>
        )}

        <View style={styles.syncIndicator}>
          <Text style={styles.syncText}>✓ Synced with cloud</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5EFE6',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  avatarContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#FFF8E7',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#90BE6D',
    shadowColor: '#5D4037',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarEmoji: {
    fontSize: 60,
  },
  nameTag: {
    backgroundColor: '#FFF8E7',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
    marginTop: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#DDD5C7',
    minWidth: 200,
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    color: '#5D4037',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: '#8D6E63',
    marginTop: 2,
    textAlign: 'center',
  },
  editHint: {
    fontSize: 11,
    color: '#A89F91',
    marginTop: 4,
    textAlign: 'center',
  },
  editContainer: {
    alignItems: 'center',
    width: '100%',
  },
  editInput: {
    fontSize: 20,
    fontWeight: '600',
    color: '#5D4037',
    textAlign: 'center',
    borderBottomWidth: 2,
    borderBottomColor: '#FFB347',
    paddingVertical: 4,
    minWidth: 150,
  },
  editButtons: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  editButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  cancelButton: {
    backgroundColor: '#DDD5C7',
  },
  cancelButtonText: {
    fontSize: 14,
    color: '#5D4037',
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#FFB347',
  },
  saveButtonText: {
    fontSize: 14,
    color: '#5D4037',
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFF8E7',
    borderRadius: 20,
    padding: 20,
    marginTop: 24,
    width: '100%',
    borderWidth: 2,
    borderColor: '#DDD5C7',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#5D4037',
  },
  statLabel: {
    fontSize: 11,
    color: '#8D6E63',
    marginTop: 2,
  },
  statDivider: {
    width: 2,
    backgroundColor: '#DDD5C7',
    borderRadius: 1,
  },
  phoneCard: {
    backgroundColor: '#FFF8E7',
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    width: '100%',
    borderWidth: 2,
    borderColor: '#DDD5C7',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  phoneLabel: {
    fontSize: 14,
    color: '#8D6E63',
    fontWeight: '500',
  },
  phoneNumber: {
    fontSize: 14,
    color: '#5D4037',
    fontWeight: '600',
  },
  syncIndicator: {
    marginTop: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(144, 190, 109, 0.2)',
    borderRadius: 12,
  },
  syncText: {
    fontSize: 12,
    color: '#5D8A3D',
    fontWeight: '600',
  },
});

