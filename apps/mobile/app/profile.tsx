import { StyleSheet, View, Text } from 'react-native';

export default function ProfileScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarEmoji}>🦝</Text>
        </View>

        <View style={styles.nameTag}>
          <Text style={styles.name}>Villager</Text>
          <Text style={styles.subtitle}>Newcomer • Just moved in!</Text>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statEmoji}>⏱️</Text>
            <Text style={styles.statValue}>0h</Text>
            <Text style={styles.statLabel}>Focus Time</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statEmoji}>🌟</Text>
            <Text style={styles.statValue}>0</Text>
            <Text style={styles.statLabel}>Stars</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statEmoji}>🏠</Text>
            <Text style={styles.statValue}>1</Text>
            <Text style={styles.statLabel}>Buildings</Text>
          </View>
        </View>

        <View style={styles.placeholder}>
          <Text style={styles.placeholderEmoji}>🚧</Text>
          <Text style={styles.placeholderText}>
            More features coming soon!
          </Text>
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
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    color: '#5D4037',
  },
  subtitle: {
    fontSize: 13,
    color: '#8D6E63',
    marginTop: 2,
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
