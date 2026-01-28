import { StyleSheet, View, Text, Pressable, ViewStyle } from 'react-native';

type ButtonVariant = 'primary' | 'secondary' | 'muted' | 'disabled' | 'break' | 'danger';
type ButtonSize = 'tiny' | 'small' | 'medium' | 'big';

interface ButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: ButtonVariant;
  size?: ButtonSize;
  style?: ViewStyle;
  surfaceColor?: string;
  borderColor?: string;
}

const COLORS = {
  primary: {
    surface: '#78ADFD',
    border: '#6B8FC9',
    text: '#FFFFFF',
  },
  secondary: {
    surface: '#90BE6D',
    border: '#6B9E4A',
    text: '#FFFFFF',
  },
  muted: {
    surface: '#C4B8A8',
    border: '#A89B8B',
    text: '#5D4037',
  },
  disabled: {
    surface: '#C4C4C4',
    border: '#A0A0A0',
    text: '#FFFFFF',
  },
  break: {
    surface: '#4FB458',
    border: '#3D9344',
    text: '#FFFFFF',
  },
  danger: {
    surface: '#C6410D',
    border: '#9E340A',
    text: '#FFFFFF',
  },
};

const SIZES = {
  tiny: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    fontSize: 11,
    borderWidth: 1.5,
    borderBottomWidth: 3,
    pressedMarginTop: 1.5,
  },
  small: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    borderWidth: 2,
    borderBottomWidth: 5,
    pressedMarginTop: 3,
  },
  medium: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    fontSize: 18,
    borderWidth: 2,
    borderBottomWidth: 6,
    pressedMarginTop: 3,
  },
  big: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    fontSize: 24,
    borderWidth: 3,
    borderBottomWidth: 8,
    pressedMarginTop: 4,
  },
};

export function PrimaryButton({ 
  title, 
  onPress, 
  disabled = false, 
  variant = 'primary',
  size = 'big',
  style,
  surfaceColor,
  borderColor,
}: ButtonProps) {
  const colorKey = disabled ? 'disabled' : variant;
  const colors = COLORS[colorKey];
  const sizeConfig = SIZES[size];
  
  const finalSurfaceColor = surfaceColor ?? colors.surface;
  const finalBorderColor = borderColor ?? colors.border;

  return (
    <View style={[styles.container, style]}>
      <Pressable
        style={({ pressed }) => [
          styles.surface,
          { 
            backgroundColor: finalSurfaceColor,
            borderColor: finalBorderColor,
            paddingVertical: sizeConfig.paddingVertical,
            paddingHorizontal: sizeConfig.paddingHorizontal,
            borderWidth: sizeConfig.borderWidth,
            borderBottomWidth: pressed && !disabled 
              ? sizeConfig.borderWidth 
              : sizeConfig.borderBottomWidth,
            marginTop: pressed && !disabled ? sizeConfig.pressedMarginTop : 0,
          },
        ]}
        onPress={onPress}
        disabled={disabled}
      >
        <Text style={[styles.text, { fontSize: sizeConfig.fontSize, color: colors.text }]}>{title}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    // Container for external margin/positioning
  },
  surface: {
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontFamily: 'Poppins_700Bold',
  },
});
