import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { AuthProvider } from '@/contexts/AuthContext';
import { DemandProvider } from '@/contexts/DemandContext';

export default function RootLayout() {
  return (
    <AuthProvider>
      <DemandProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="login" />
          <Stack.Screen name="cadastro" />
          <Stack.Screen name="denuncias" />
          <Stack.Screen name="gestor" />
        </Stack>
        <StatusBar style="light" />
      </DemandProvider>
    </AuthProvider>
  );
}
