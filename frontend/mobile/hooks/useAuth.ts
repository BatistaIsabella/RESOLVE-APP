import { useAuthStore } from '@/stores/useAuthStore';

export function useAuth() {
  const token = useAuthStore((s) => s.token);
  const role = useAuthStore((s) => s.role);
  const userName = useAuthStore((s) => s.userName);
  const userEmail = useAuthStore((s) => s.userEmail);
  const isLoading = useAuthStore((s) => s.isLoading);
  const hasHydrated = useAuthStore((s) => s._hasHydrated);
  const login = useAuthStore((s) => s.login);
  const logout = useAuthStore((s) => s.logout);

  const isAuthenticated = !!token;
  const isCidadao = role === 'cidadao';
  const isGestor = role === 'gestor';

  return {
    token,
    role,
    userName,
    userEmail,
    isLoading,
    hasHydrated,
    isAuthenticated,
    isCidadao,
    isGestor,
    login,
    logout,
  };
}
