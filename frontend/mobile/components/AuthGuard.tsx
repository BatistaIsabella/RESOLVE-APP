import React, { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { UserRole } from '@/types/auth';
import { getPostLoginRoute } from '@/stores/useAuthStore';

interface AuthGuardProps {
  requiredRole?: UserRole;
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
      router.replace(getPostLoginRoute(role ?? 'cidadao'));
    }
  }, [hasHydrated, token, role, requiredRole, router]);

  if (!hasHydrated) {
    return <LoadingScreen message="Restaurando sessão..." />;
  }

  if (!token) return null;
  if (requiredRole && role !== requiredRole) return null;

  return <>{children}</>;
}
