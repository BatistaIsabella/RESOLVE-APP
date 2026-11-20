import { useCallback } from 'react';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/useAuthStore';

export function useAuth() {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const role = useAuthStore((s) => s.role);
  const userName = useAuthStore((s) => s.userName);
  const userEmail = useAuthStore((s) => s.userEmail);
  const isLoading = useAuthStore((s) => s.isLoading);
  const hasHydrated = useAuthStore((s) => s._hasHydrated);
  const login = useAuthStore((s) => s.login);
  const register = useAuthStore((s) => s.register);
  const logout = useAuthStore((s) => s.logout);

  /** Encerra a sessão e volta para a tela inicial (botão "Sair" dos headers). */
  const signOut = useCallback(() => {
    logout();
    router.replace('/');
  }, [logout, router]);

  return {
    token,
    role,
    userName,
    userEmail,
    isLoading,
    hasHydrated,
    isAuthenticated: !!token,
    isCidadao: role === 'cidadao',
    isGestor: role === 'gestor',
    login,
    register,
    logout,
    signOut,
  };
}
