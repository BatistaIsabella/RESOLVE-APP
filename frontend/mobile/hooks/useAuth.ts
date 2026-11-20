import { useCallback } from 'react';
import { useRouter } from 'expo-router';

import { useAuthContext } from '@/contexts/AuthContext';

export function useAuth() {
  const router = useRouter();
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

  // Botão "Sair": encerra a sessão e volta para a tela inicial.
  const signOut = useCallback(() => {
    logout();
    router.replace('/');
  }, [logout, router]);

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
    signOut,
    aceitarTermos,
    atualizarSessao,
  };
}
