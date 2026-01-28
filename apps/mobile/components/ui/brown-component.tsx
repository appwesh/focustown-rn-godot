import { forwardRef } from 'react';
import { StyleSheet, View, TextInput, Text, Pressable, TextInputProps, ViewStyle, TextStyle } from 'react-native';
import { Feather } from '@expo/vector-icons';

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

interface BrownCheckboxProps {
  type: 'checkbox';
  title: string;
  onPress: () => void;
  checked?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

type BrownComponentProps = BrownInputProps | BrownButtonProps | BrownCheckboxProps;

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

  // Checkbox type
  if (props.type === 'checkbox') {
    const { title, onPress, checked, disabled, style } = props;
    return (
      <Pressable
        style={({ pressed }) => [
          styles.shadow,
          style,
          {
            paddingBottom: pressed ? 5 : 8,
          },
        ]}
        onPress={onPress}
        disabled={disabled}
      >
        {({ pressed }) => (
          <View
            style={[
              styles.checkboxButton,
              { marginTop: pressed ? BUTTON_PRESSED_MARGIN_TOP : 0 },
              checked && styles.selected,
            ]}
          >
            <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
              {checked && <Feather name="check" size={16} color="#fff" />}
            </View>
            <Text style={styles.checkboxText}>{title}</Text>
          </View>
        )}
      </Pressable>
    );
  }

  // Button type
  const { title, onPress, selected, disabled, style } = props;
  return (
    <Pressable
      style={({ pressed }) => [
        styles.shadow,
        style,
        {
          paddingBottom: pressed ? 5 : 8,
        },
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      {({ pressed }) => (
        <View
          style={[
            styles.button,
            { marginTop: pressed ? BUTTON_PRESSED_MARGIN_TOP : 0 },
            selected && styles.selected,
          ]}
        >
          <Text style={styles.buttonText}>{title}</Text>
        </View>
      )}
    </Pressable>
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
  selected: {
    backgroundColor: '#E8D9B8',
  },
  checkboxButton: {
    backgroundColor: '#FFEFD6',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#C4B5A0',
    backgroundColor: '#fff',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#81C784',
    borderColor: '#66BB6A',
  },
  checkboxText: {
    fontSize: 18,
    color: '#5D4037',
    fontWeight: '600',
    flex: 1,
  },
});
