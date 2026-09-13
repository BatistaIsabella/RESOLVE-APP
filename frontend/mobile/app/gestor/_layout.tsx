import { Stack } from 'expo-router';
import { AuthGuard } from '@/components/AuthGuard';

export default function GestorLayout() {
  return (
    <AuthGuard requiredRole="gestor">
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="[id]" />
      </Stack>
    </AuthGuard>
  );
}
