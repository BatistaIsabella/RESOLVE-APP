import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Alert } from 'react-native';
import 'react-native-reanimated';
import { useOtaUpdate } from '@/hooks/useOtaUpdate';

export default function RootLayout() {
  const { isUpdatePending, applyUpdate } = useOtaUpdate();

  useEffect(() => {
    if (!isUpdatePending) return;
    Alert.alert(
      'Atualização disponível',
      'Uma nova versão do app foi baixada. Reiniciar agora para aplicar?',
      [
        { text: 'Depois', style: 'cancel' },
        { text: 'Reiniciar', onPress: () => applyUpdate() },
      ]
    );
  }, [isUpdatePending, applyUpdate]);

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="cadastro" />
        <Stack.Screen name="denuncias" />
        <Stack.Screen name="gestor" />
      </Stack>
      <StatusBar style="light" />
    </>
  );
}
