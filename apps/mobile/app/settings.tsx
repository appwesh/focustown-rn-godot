import { StyleSheet, View, Text, Switch, Pressable, Alert, ScrollView } from 'react-native';
import { useState, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth, userService } from '@/lib/firebase';
import { useSoundStore } from '@/lib/sound';
import { BackButton } from '@/components/ui';

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { signOut, isAuthenticated, userDoc, user } = useAuth();
  
  // Sound settings from global store
  const soundEnabled = useSoundStore((s) => s.soundEffectsEnabled);
  const setSoundEnabled = useSoundStore((s) => s.setSoundEffectsEnabled);
  const musicEnabled = useSoundStore((s) => s.musicEnabled);
  const setMusicEnabled = useSoundStore((s) => s.setMusicEnabled);
  
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  // Handle sound effects toggle - update store and persist to Firestore
  const handleSoundToggle = useCallback((enabled: boolean) => {
    setSoundEnabled(enabled);
    if (user?.uid) {
      userService.updateSettings(user.uid, { soundEffectsEnabled: enabled });
    }
  }, [user?.uid, setSoundEnabled]);

  // Handle music toggle - update store and persist to Firestore
  const handleMusicToggle = useCallback((enabled: boolean) => {
    setMusicEnabled(enabled);
    if (user?.uid) {
      userService.updateSettings(user.uid, { musicEnabled: enabled });
    }
  }, [user?.uid, setMusicEnabled]);

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out? Your progress is saved to the cloud.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await signOut();
            router.replace('/onboarding');
          },
        },
      ]
    );
  };

  return (
    <LinearGradient
      colors={['#FEE2AA', '#F6F4E7', '#F6F4E7']}
      style={[styles.container, { paddingTop: insets.top }]}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <BackButton onPress={() => router.back()} />
          <Text style={styles.headerTitle}>Settings</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionEmoji}>🔊</Text>
            <Text style={styles.sectionTitle}>Sound</Text>
          </View>
          <View style={styles.card}>
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Sound Effects</Text>
              <Switch
                value={soundEnabled}
                onValueChange={handleSoundToggle}
                trackColor={{ false: '#DDD5C7', true: '#90BE6D' }}
                thumbColor="#FFF8E7"
              />
            </View>
            <View style={styles.rowDivider} />
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Background Music</Text>
              <Switch
                value={musicEnabled}
                onValueChange={handleMusicToggle}
                trackColor={{ false: '#DDD5C7', true: '#90BE6D' }}
                thumbColor="#FFF8E7"
              />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionEmoji}>🔔</Text>
            <Text style={styles.sectionTitle}>Notifications</Text>
          </View>
          <View style={styles.card}>
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Focus Reminders</Text>
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                trackColor={{ false: '#DDD5C7', true: '#90BE6D' }}
                thumbColor="#FFF8E7"
              />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionEmoji}>📋</Text>
            <Text style={styles.sectionTitle}>About</Text>
          </View>
          <View style={styles.card}>
            <View style={styles.infoRow}>
              <Text style={styles.settingLabel}>Version</Text>
              <Text style={styles.infoValue}>1.0.0</Text>
            </View>
            <View style={styles.rowDivider} />
            <View style={styles.infoRow}>
              <Text style={styles.settingLabel}>Build</Text>
              <Text style={styles.infoValue}>1</Text>
            </View>
          </View>
        </View>

        {isAuthenticated && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionEmoji}>👤</Text>
              <Text style={styles.sectionTitle}>Account</Text>
            </View>
            <View style={styles.card}>
              {userDoc && (
                <>
                  <View style={styles.infoRow}>
                    <Text style={styles.settingLabel}>Signed in as</Text>
                    <Text style={styles.infoValue}>{userDoc.displayName || 'Villager'}</Text>
                  </View>
                  <View style={styles.rowDivider} />
                </>
              )}
              <Pressable 
                style={({ pressed }) => [
                  styles.logoutRow,
                  pressed && styles.logoutRowPressed,
                ]} 
                onPress={handleLogout}
              >
                <Text style={styles.logoutText}>Sign Out</Text>
                <Text style={styles.logoutArrow}>→</Text>
              </Pressable>
            </View>
          </View>
        )}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
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
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    marginLeft: 4,
  },
  sectionEmoji: {
    fontSize: 18,
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#5D4037',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  settingLabel: {
    fontSize: 16,
    color: '#5D4037',
    fontWeight: '500',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  infoValue: {
    fontSize: 16,
    color: '#8D6E63',
  },
  rowDivider: {
    height: 1,
    backgroundColor: '#E8DDD0',
    marginHorizontal: 16,
  },
  logoutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  logoutRowPressed: {
    backgroundColor: '#FFF5E6',
  },
  logoutText: {
    fontSize: 16,
    color: '#C62828',
    fontWeight: '600',
  },
  logoutArrow: {
    fontSize: 16,
    color: '#C62828',
  },
});
