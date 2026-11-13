import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { AuthProvider } from '@/contexts/AuthContext';
import { DemandProvider } from '@/contexts/DemandContext';
import { useNotificacoes } from '@/hooks/useNotificacoes';

// Precisa ficar dentro dos providers: usa a sessão e o roteador.
function Notificacoes() {
  useNotificacoes();
  return null;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <DemandProvider>
        <Notificacoes />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="login" />
          <Stack.Screen name="cadastro" />
          <Stack.Screen name="esqueci-senha" />
          <Stack.Screen name="redefinir-senha" />
          <Stack.Screen name="confirmar-email" />
          <Stack.Screen name="privacidade" />
          <Stack.Screen name="aceite-termos" />
          <Stack.Screen name="perfil" />
          <Stack.Screen name="mfa" />
          <Stack.Screen name="mfa-configurar" />
          <Stack.Screen name="denuncias" />
          <Stack.Screen name="gestor" />
        </Stack>
        <StatusBar style="light" />
      </DemandProvider>
    </AuthProvider>
  );
}
