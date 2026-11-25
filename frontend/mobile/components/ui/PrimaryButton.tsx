import React from 'react';
import { Pressable, StyleSheet, Text, ViewStyle } from 'react-native';
import { AppColors } from '@/constants/colors';

interface PrimaryButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  small?: boolean;
}

export function PrimaryButton({
  label,
  onPress,
  disabled,
  loading,
  style,
  small,
}: PrimaryButtonProps) {
  const isDisabled = Boolean(disabled || loading);

  return (
    <Pressable
      // Leitores de tela anunciam a ação (label) mesmo durante o carregamento,
      // junto com os estados "ocupado" e "desativado".
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isDisabled, busy: Boolean(loading) }}
      style={({ pressed }) => [
        styles.button,
        small && styles.buttonSmall,
        isDisabled && styles.disabled,
        pressed && styles.pressed,
        style,
      ]}
      onPress={onPress}
      disabled={isDisabled}
    >
      <Text style={[styles.text, small && styles.textSmall]}>
        {loading ? 'Aguarde...' : label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: AppColors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  buttonSmall: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  text: {
    color: AppColors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  textSmall: {
    fontSize: 13,
  },
  disabled: {
    opacity: 0.6,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
});
