import { useState } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  Alert,
} from 'react-native';
import { clearPckCache } from './godot-view';

interface DebugModalProps {
  visible: boolean;
  onClose: () => void;
}

export function DebugModal({ visible, onClose }: DebugModalProps) {
  const [clearing, setClearing] = useState(false);

  const handleClearCache = async () => {
    setClearing(true);
    try {
      await clearPckCache();
      Alert.alert(
        'Cache Cleared',
        'PCK cache cleared. Restart the app to download the latest version.',
        [{ text: 'OK', onPress: onClose }]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to clear cache');
    } finally {
      setClearing(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <View style={styles.container}>
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View style={styles.modal}>
              <Text style={styles.title}>🛠 Debug Menu</Text>
              <Text style={styles.subtitle}>Dev build only</Text>

              <View style={styles.divider} />

              <Pressable
                style={({ pressed }) => [
                  styles.button,
                  pressed && styles.buttonPressed,
                ]}
                onPress={handleClearCache}
                disabled={clearing}
              >
                <Text style={styles.buttonText}>
                  {clearing ? 'Clearing...' : '🗑 Clear PCK Cache'}
                </Text>
              </Pressable>

              <Text style={styles.hint}>
                Clears downloaded game files.{'\n'}
                Restart app to download fresh copy.
              </Text>

              <View style={styles.divider} />

              <Pressable
                style={({ pressed }) => [
                  styles.closeButton,
                  pressed && styles.buttonPressed,
                ]}
                onPress={onClose}
              >
                <Text style={styles.closeButtonText}>Close</Text>
              </Pressable>
            </View>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '85%',
    maxWidth: 320,
  },
  modal: {
    backgroundColor: '#FFF8E7',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#5D4037',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
    borderWidth: 3,
    borderColor: '#DDD5C7',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#5D4037',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: '#8D6E63',
    marginBottom: 8,
  },
  divider: {
    width: '100%',
    height: 1,
    backgroundColor: '#DDD5C7',
    marginVertical: 16,
  },
  button: {
    backgroundColor: '#FF8A65',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E64A19',
  },
  buttonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  hint: {
    fontSize: 12,
    color: '#8D6E63',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 18,
  },
  closeButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8D6E63',
  },
});


