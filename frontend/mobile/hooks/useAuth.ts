import { useAuthContext } from '@/contexts/AuthContext';

export function useAuth() {
  const { token, role, userName, userEmail, isLoading, hasHydrated, login, register, logout } =
    useAuthContext();

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
    register,
    logout,
  };
}
