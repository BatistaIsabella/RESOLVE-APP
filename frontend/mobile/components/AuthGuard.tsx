import React, { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { LoadingScreen } from '@/components/ui/LoadingScreen';

interface AuthGuardProps {
  requiredRole?: 'cidadao' | 'gestor';
  children: React.ReactNode;
}

export function AuthGuard({ requiredRole, children }: AuthGuardProps) {
  const router = useRouter();
  const { token, role, hasHydrated } = useAuth();

  useEffect(() => {
    if (!hasHydrated) return;

    if (!token) {
      router.replace('/login');
      return;
    }

    if (requiredRole && role !== requiredRole) {
      router.replace(role === 'gestor' ? '/gestor' : '/denuncias');
    }
  }, [hasHydrated, token, role, requiredRole, router]);

  if (!hasHydrated) {
    return <LoadingScreen message="Restaurando sessão..." />;
  }

  if (!token) return null;
  if (requiredRole && role !== requiredRole) return null;

  return <>{children}</>;
}
