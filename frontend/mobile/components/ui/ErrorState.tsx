import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '@/components/ui/PrimaryButton';

interface ErrorStateProps {
  message: string;
  onRetry: () => void;
  retrying?: boolean;
}

// Erro de carregamento no lugar do conteúdo, com a ação de tentar de novo
// (sem isso, a saída era descobrir sozinho o puxar-para-atualizar).
export function ErrorState({ message, onRetry, retrying }: ErrorStateProps) {
  return (
    <View style={styles.container} accessibilityRole="alert">
      <Text style={styles.message}>{message}</Text>
      <PrimaryButton label="Tentar novamente" onPress={onRetry} loading={retrying} small />
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
    color: '#DC2626',
    fontSize: 14,
    textAlign: 'center',
  },
});
