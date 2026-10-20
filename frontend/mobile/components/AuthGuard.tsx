import React, { useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { LoadingScreen } from '@/components/ui/LoadingScreen';

interface AuthGuardProps {
  requiredRole?: 'cidadao' | 'gestor';
  children: React.ReactNode;
}

export function AuthGuard({ requiredRole, children }: AuthGuardProps) {
  const router = useRouter();
  const { token, role, termosPendentes, hasHydrated } = useAuth();

  const redirectedTo = useRef<string | null>(null);

  useEffect(() => {
    if (!hasHydrated) return;

    let target: '/' | '/gestor' | '/denuncias' | '/aceite-termos' | null = null;
    if (!token) {
      target = '/';
    } else if (termosPendentes) {
      target = '/aceite-termos';
    } else if (requiredRole && role !== requiredRole) {
      target = role === 'gestor' ? '/gestor' : '/denuncias';
    }

    if (!target) {
      redirectedTo.current = null;
      return;
    }
    if (redirectedTo.current === target) return;

    redirectedTo.current = target;
    router.replace(target);
  }, [hasHydrated, token, role, termosPendentes, requiredRole, router]);

  if (!hasHydrated) {
    return <LoadingScreen message="Restaurando sessão..." />;
  }

  if (!token || termosPendentes) return null;
  if (requiredRole && role !== requiredRole) return null;

  return <>{children}</>;
}
