import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { theme } from '../../constants/theme';

type Props = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  icon: keyof typeof Feather.glyphMap;
  isPassword?: boolean;
};

export default function CustomInput({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  icon,
  isPassword = false,
}: Props) {
  const [hidden, setHidden] = useState(secureTextEntry);

  function togglePassword() {
    setHidden(prev => !prev);
  }

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>

      <View style={styles.inputRow}>
        <Feather name={icon} size={20} color={theme.colors.accent} style={styles.leftIcon} />

        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.placeholder}
          secureTextEntry={hidden}
        />

        {isPassword && (
          <TouchableOpacity onPress={togglePassword} style={styles.eyeButton}>
            <Feather
              name={hidden ? 'eye' : 'eye-off'}
              size={18}
              color={theme.colors.accent}
            />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.line} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 18,
  },

  label: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 8,
  },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  leftIcon: {
    marginRight: 10,
  },

  input: {
    flex: 1,
    color: theme.colors.textSoft,
    fontSize: 15,
  },

  eyeButton: {
    marginLeft: 10,
    padding: 4,
  },

  line: {
    height: 2,
    borderRadius: 999,
    backgroundColor: theme.colors.line,
    marginTop: 6,
  },
});