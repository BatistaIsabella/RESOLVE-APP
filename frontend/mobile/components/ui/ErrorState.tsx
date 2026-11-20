import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { AppColors } from '@/constants/colors';

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
  retrying?: boolean;
}

/** Erro de carregamento no lugar do conteúdo, com a ação de tentar de novo. */
export function ErrorState({ message, onRetry, retrying }: ErrorStateProps) {
  return (
    <View style={styles.container} accessibilityRole="alert">
      <Text style={styles.message}>{message}</Text>
      {onRetry ? (
        <PrimaryButton label="Tentar novamente" onPress={onRetry} loading={retrying} small />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
    gap: 12,
  },
  message: {
    color: AppColors.danger,
    fontSize: 14,
    textAlign: 'center',
  },
});
