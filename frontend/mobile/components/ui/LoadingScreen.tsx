import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { AppColors } from '@/constants/colors';

export function LoadingScreen({ message = 'Carregando...' }: { message?: string }) {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={AppColors.primary} />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
    gap: 12,
  },
  text: {
    color: AppColors.textMuted,
    fontSize: 15,
  },
});
