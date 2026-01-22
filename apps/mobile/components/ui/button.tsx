import { StyleSheet, View, Text, Pressable, ViewStyle } from 'react-native';

type ButtonVariant = 'primary' | 'secondary' | 'disabled';

interface ButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: ButtonVariant;
  style?: ViewStyle;
}

const COLORS = {
  primary: {
    surface: '#78ADFD',
    border: '#6B8FC9',
  },
  secondary: {
    surface: '#90BE6D',
    border: '#6B9E4A',
  },
  disabled: {
    surface: '#C4C4C4',
    border: '#A0A0A0',
  },
};

export function Button({ 
  title, 
  onPress, 
  disabled = false, 
  variant = 'primary',
  style,
}: ButtonProps) {
  const colorKey = disabled ? 'disabled' : variant;
  const colors = COLORS[colorKey];

  return (
    <View style={[styles.container, style]}>
      <Pressable
        style={({ pressed }) => [
          styles.surface,
          { 
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
          pressed && !disabled && styles.pressed,
        ]}
        onPress={onPress}
        disabled={disabled}
      >
        <Text style={styles.text}>{title}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    // Container for external margin/positioning
  },
  surface: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 100,
    borderWidth: 3,
    borderBottomWidth: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    borderBottomWidth: 3,
    marginTop: 4,
  },
  text: {
    fontSize: 24,
    fontFamily: 'Poppins_700Bold',
    color: '#FFFFFF',
  },
});
