import { StyleSheet, View, Text, Switch, Pressable, Alert } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '@/lib/firebase';

export default function SettingsScreen() {
  const router = useRouter();
  const { signOut, isAuthenticated, userDoc } = useAuth();
  
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [musicEnabled, setMusicEnabled] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

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
    <View style={styles.container}>
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
              onValueChange={setSoundEnabled}
              trackColor={{ false: '#DDD5C7', true: '#90BE6D' }}
              thumbColor="#FFF8E7"
            />
          </View>
          <View style={styles.rowDivider} />
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Background Music</Text>
            <Switch
              value={musicEnabled}
              onValueChange={setMusicEnabled}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5EFE6',
    paddingHorizontal: 20,
    paddingTop: 16,
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
    fontSize: 15,
    fontWeight: '600',
    color: '#8D6E63',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: '#FFF8E7',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#DDD5C7',
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
    backgroundColor: '#DDD5C7',
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
    backgroundColor: '#FFF0E0',
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
