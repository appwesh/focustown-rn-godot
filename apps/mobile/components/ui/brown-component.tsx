import { forwardRef } from 'react';
import { StyleSheet, View, TextInput, Text, Pressable, TextInputProps, ViewStyle, TextStyle } from 'react-native';

interface BrownInputProps extends Omit<TextInputProps, 'style'> {
  type: 'input';
  style?: ViewStyle;
  inputStyle?: TextStyle;
}

interface BrownButtonProps {
  type: 'button';
  title: string;
  onPress: () => void;
  selected?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

type BrownComponentProps = BrownInputProps | BrownButtonProps;

const BUTTON_PRESSED_MARGIN_TOP = 3;

/**
 * Brown/cream styled component with 3D shadow effect.
 * Can be used as either a text input or a selectable button.
 */
export const BrownComponent = forwardRef<TextInput, BrownComponentProps>((props, ref) => {
  if (props.type === 'input') {
    const { type, style, inputStyle, ...inputProps } = props;
    return (
      <View style={[styles.shadow, style]}>
        <TextInput
          ref={ref}
          style={[styles.input, inputStyle]}
          placeholderTextColor="#A89F91"
          {...inputProps}
        />
      </View>
    );
  }

  // Button type
  const { title, onPress, selected, disabled, style } = props;
  return (
    <View style={[styles.shadow, style]}>
      <Pressable
        style={({ pressed }) => [
          styles.button,
          {
            marginTop: pressed ? BUTTON_PRESSED_MARGIN_TOP : 0,
          },
          pressed && styles.pressed,
          selected && styles.selected,
        ]}
        onPress={onPress}
        disabled={disabled}
      >
        <Text style={styles.buttonText}>{title}</Text>
      </Pressable>
    </View>
  );
});

const styles = StyleSheet.create({
  shadow: {
    backgroundColor: '#C4B5A0',
    borderRadius: 24,
    paddingBottom: 8,
    borderWidth: 3,
    borderColor: '#83715B',
  },
  input: {
    backgroundColor: '#FFEFD6',
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingVertical: 20,
    fontSize: 28,
    color: '#5D4037',
    textAlign: 'center',
    fontWeight: '800',
  },
  button: {
    backgroundColor: '#FFEFD6',
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 20,
    color: '#5D4037',
    fontWeight: '700',
  },
  pressed: {
    backgroundColor: '#F5E5C6',
  },
  selected: {
    backgroundColor: '#E8D9B8',
  },
});
