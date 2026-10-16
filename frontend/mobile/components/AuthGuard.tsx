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
  const { token, role, hasHydrated } = useAuth();

  const redirectedTo = useRef<string | null>(null);

  useEffect(() => {
    if (!hasHydrated) return;

    let target: '/' | '/gestor' | '/denuncias' | null = null;
    if (!token) {
      // Mesmo destino do logout manual (router.replace('/')): evita que o
      // guard sobrescreva a navegação do logout com outro replace.
      target = '/';
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
  }, [hasHydrated, token, role, requiredRole, router]);

  if (!hasHydrated) {
    return <LoadingScreen message="Restaurando sessão..." />;
  }

  if (!token) return null;
  if (requiredRole && role !== requiredRole) return null;

  return <>{children}</>;
}
