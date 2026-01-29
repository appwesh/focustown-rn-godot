import { StyleSheet, View, Text, Pressable, ViewStyle } from 'react-native';

interface BackButtonProps {
  onPress: () => void;
  style?: ViewStyle;
}

export function BackButton({ onPress, style }: BackButtonProps) {
  return (
    <View style={[styles.container, style]}>
      <Pressable
        style={({ pressed }) => [
          styles.surface,
          pressed && styles.pressed,
        ]}
        onPress={onPress}
      >
        <Text style={styles.arrow}>←</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    // No positioning by default - let style prop handle it
  },
  surface: {
    backgroundColor: '#FFF8E7',
    paddingVertical: 6,
    paddingHorizontal: 9,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#83715B',
  },
  pressed: {
    opacity: 0.7,
  },
  arrow: {
    fontSize: 18,
    fontWeight: '900',
    color: '#9A835A',
  },
});
