import React, { useEffect } from 'react';
import { AccessibilityInfo, ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { AppColors } from '@/constants/colors';

export function LoadingScreen({ message = 'Carregando...' }: { message?: string }) {
  // Anuncia a mensagem ao abrir a tela e sempre que ela mudar, para quem usa
  // VoiceOver/TalkBack saber que o conteúdo ainda está sendo carregado.
  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(message);
  }, [message]);

  return (
    <View
      style={styles.container}
      // Agrupa indicador e texto em um único elemento acessível.
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={message}
      accessibilityState={{ busy: true }}
    >
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
