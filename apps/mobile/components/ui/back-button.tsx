import { StyleSheet, View, Text, Pressable, ViewStyle } from 'react-native';

interface BackButtonProps {
  onPress: () => void;
  style?: ViewStyle;
}

const BORDER_WIDTH = 3;
const BORDER_BOTTOM_WIDTH = 7;
const PRESSED_MARGIN_TOP = 4;

export function BackButton({ onPress, style }: BackButtonProps) {
  return (
    <View style={[styles.container, style]}>
      <Pressable
        style={({ pressed }) => [
          styles.surface,
          {
            borderBottomWidth: pressed ? BORDER_WIDTH : BORDER_BOTTOM_WIDTH,
            marginTop: pressed ? PRESSED_MARGIN_TOP : 0,
          },
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
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: BORDER_WIDTH,
    borderColor: '#83715B',
    borderBottomWidth: BORDER_BOTTOM_WIDTH,
  },
  arrow: {
    fontSize: 24,
    fontWeight: '900',
    color: '#9A835A',
  },
});
