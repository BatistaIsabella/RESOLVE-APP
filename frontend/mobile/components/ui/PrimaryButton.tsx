import React from 'react';
import { Pressable, Text, ViewStyle } from 'react-native';

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
  const inativo = disabled || loading;

  return (
    <Pressable
      className={`items-center bg-primary active:opacity-[0.85] active:scale-[0.98] ${
        small ? 'rounded-lg px-3.5 py-2' : 'rounded-xl px-5 py-3.5'
      } ${inativo ? 'opacity-60' : ''}`}
      style={style}
      onPress={onPress}
      disabled={inativo}
    >
      <Text className={`font-bold text-white ${small ? 'text-[13px]' : 'text-base'}`}>
        {loading ? 'Aguarde...' : label}
      </Text>
    </Pressable>
  );
}