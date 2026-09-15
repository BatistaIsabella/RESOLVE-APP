import { Stack } from 'expo-router';
import { AuthGuard } from '@/components/AuthGuard';

export default function DenunciasLayout() {
  return (
    <AuthGuard requiredRole="cidadao">
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="nova" />
        <Stack.Screen name="[id]" />
      </Stack>
    </AuthGuard>
  );
}
