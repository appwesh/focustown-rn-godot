import { StyleSheet, View, Text, Switch, Pressable } from 'react-native';
import { useState } from 'react';

export default function SettingsScreen() {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [musicEnabled, setMusicEnabled] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

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

      <View style={styles.placeholder}>
        <Text style={styles.placeholderEmoji}>🏗️</Text>
        <Text style={styles.placeholderText}>
          More options coming soon!
        </Text>
      </View>
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
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderEmoji: {
    fontSize: 40,
    marginBottom: 12,
  },
  placeholderText: {
    fontSize: 16,
    color: '#8D6E63',
    fontWeight: '500',
  },
});
