import { useAuthContext } from '@/contexts/AuthContext';

export function useAuth() {
  const {
    token,
    role,
    userName,
    userEmail,
    orgao,
    termosPendentes,
    isLoading,
    hasHydrated,
    login,
    register,
    concluirLoginMfa,
    iniciarSessao,
    logout,
    aceitarTermos,
    atualizarSessao,
  } = useAuthContext();

  const isAuthenticated = !!token;
  const isCidadao = role === 'cidadao';
  const isGestor = role === 'gestor';

  return {
    token,
    role,
    userName,
    userEmail,
    orgao,
    termosPendentes,
    isLoading,
    hasHydrated,
    isAuthenticated,
    isCidadao,
    isGestor,
    login,
    register,
    concluirLoginMfa,
    iniciarSessao,
    logout,
    aceitarTermos,
    atualizarSessao,
  };
}
