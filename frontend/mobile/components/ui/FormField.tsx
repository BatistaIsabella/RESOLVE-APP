import React from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { AppColors } from '@/constants/colors';

interface FormFieldProps extends TextInputProps {
  label?: string;
  /** Mensagem de validação. Pinta a borda e aparece abaixo do campo. */
  error?: string;
}

export function FormField({ label, error, style, ...inputProps }: FormFieldProps) {
  return (
    <View style={styles.field}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        placeholderTextColor="#9B8AC4"
        accessibilityLabel={label ?? inputProps.placeholder}
        {...inputProps}
        // O erro vem por último para a borda vermelha vencer o `style` da tela.
        style={[styles.input, inputProps.multiline && styles.multiline, style, error && styles.inputError]}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: 6,
  },
  label: {
    color: '#374151',
    fontSize: 13,
    fontWeight: '600',
  },
  input: {
    backgroundColor: AppColors.white,
    borderWidth: 1.5,
    borderColor: '#C9B8F0',
    borderRadius: 10,
    minHeight: 48,
    paddingHorizontal: 14,
    fontSize: 15,
    color: AppColors.text,
  },
  multiline: {
    paddingVertical: 12,
  },
  inputError: {
    borderColor: AppColors.danger,
  },
  errorText: {
    color: AppColors.danger,
    fontSize: 12,
  },
});
