import { StyleSheet, View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleLaunchGame = () => {
    router.push('/game');
  };

  return (
    <View style={styles.container}>
      {/* Decorative clouds */}
      <View style={[styles.cloud, styles.cloud1]} />
      <View style={[styles.cloud, styles.cloud2]} />
      <View style={[styles.cloud, styles.cloud3]} />

      <View style={[styles.content, { paddingTop: insets.top + 40 }]}>
        <View style={styles.header}>
          <View style={styles.leafDecor}>
            <Text style={styles.leafEmoji}>🌿</Text>
          </View>
          <Text style={styles.title}>Focus Town</Text>
          <Text style={styles.subtitle}>Build your peaceful productivity</Text>
        </View>

        <View style={styles.heroContainer}>
          <View style={styles.heroGround} />
          <View style={styles.heroCircle}>
            <Text style={styles.heroEmoji}>🏡</Text>
          </View>
          {/* Little decorative elements */}
          <View style={[styles.treeDeco, styles.tree1]}>
            <Text style={styles.treeEmoji}>🌳</Text>
          </View>
          <View style={[styles.treeDeco, styles.tree2]}>
            <Text style={styles.treeEmoji}>🌲</Text>
          </View>
          <View style={[styles.flowerDeco, styles.flower1]}>
            <Text style={styles.flowerEmoji}>🌷</Text>
          </View>
          <View style={[styles.flowerDeco, styles.flower2]}>
            <Text style={styles.flowerEmoji}>🌻</Text>
          </View>
        </View>

        <View style={[styles.footer, { paddingBottom: insets.bottom + 32 }]}>
          <Pressable
            style={({ pressed }) => [
              styles.launchButton,
              pressed && styles.launchButtonPressed,
            ]}
            onPress={handleLaunchGame}
          >
            <Text style={styles.launchButtonText}>Let's Go!</Text>
          </Pressable>
          <Text style={styles.hint}>Tap to enter your town</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#87CEEB', // Sky blue
  },
  cloud: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 50,
  },
  cloud1: {
    width: 120,
    height: 50,
    top: 60,
    left: -20,
  },
  cloud2: {
    width: 100,
    height: 40,
    top: 100,
    right: 30,
  },
  cloud3: {
    width: 80,
    height: 35,
    top: 160,
    left: 60,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  header: {
    alignItems: 'center',
  },
  leafDecor: {
    marginBottom: 8,
  },
  leafEmoji: {
    fontSize: 32,
  },
  title: {
    fontSize: 42,
    fontWeight: '800',
    color: '#5D4037',
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 16,
    color: '#8D6E63',
    marginTop: 8,
    fontWeight: '500',
  },
  heroContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    position: 'relative',
  },
  heroGround: {
    position: 'absolute',
    bottom: 20,
    left: -50,
    right: -50,
    height: 100,
    backgroundColor: '#90BE6D',
    borderTopLeftRadius: 100,
    borderTopRightRadius: 100,
  },
  heroCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: '#FFF8E7',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#DDD5C7',
    shadowColor: '#5D4037',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
    zIndex: 10,
  },
  heroEmoji: {
    fontSize: 70,
  },
  treeDeco: {
    position: 'absolute',
    zIndex: 5,
  },
  tree1: {
    left: 20,
    bottom: 60,
  },
  tree2: {
    right: 30,
    bottom: 70,
  },
  treeEmoji: {
    fontSize: 50,
  },
  flowerDeco: {
    position: 'absolute',
    zIndex: 5,
  },
  flower1: {
    left: 80,
    bottom: 40,
  },
  flower2: {
    right: 70,
    bottom: 35,
  },
  flowerEmoji: {
    fontSize: 28,
  },
  footer: {
    width: '100%',
    alignItems: 'center',
  },
  launchButton: {
    width: '100%',
    borderRadius: 25,
    backgroundColor: '#FFB347',
    paddingVertical: 18,
    alignItems: 'center',
    shadowColor: '#E6A03C',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 3,
    borderColor: '#FFC875',
  },
  launchButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  launchButtonText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#5D4037',
    letterSpacing: 0.5,
  },
  hint: {
    marginTop: 12,
    fontSize: 14,
    color: '#5D4037',
    opacity: 0.7,
  },
});
