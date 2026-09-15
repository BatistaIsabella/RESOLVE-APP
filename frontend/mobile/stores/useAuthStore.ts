import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { authService } from '@/services/authService';
import { ApiError } from '@/lib/api';
import { secureStorage } from '@/lib/secureStorage';

interface AuthState {
  token: string | null;
  role: 'cidadao' | 'gestor' | null;
  userName: string | null;
  userEmail: string | null;
  isLoading: boolean;
  error: string | null;
  _hasHydrated: boolean;
  setHasHydrated: (value: boolean) => void;
  login: (email: string, senha: string) => Promise<'cidadao' | 'gestor'>;
  register: (
    nome: string,
    email: string,
    senha: string,
    papel: 'cidadao' | 'gestor',
    codigoAcesso?: string
  ) => Promise<'cidadao' | 'gestor'>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      role: null,
      userName: null,
      userEmail: null,
      isLoading: false,
      error: null,
      _hasHydrated: false,

      setHasHydrated: (value) => set({ _hasHydrated: value }),

      login: async (email, senha) => {
        set({ isLoading: true, error: null });
        try {
          const result = await authService.login(email, senha);
          set({
            token: result.token,
            role: result.papel,
            userName: result.nome,
            userEmail: email,
            isLoading: false,
          });
          return result.papel;
        } catch (err) {
          const message = err instanceof ApiError ? err.message : 'Erro ao fazer login';
          set({ isLoading: false, error: message });
          throw err;
        }
      },

      register: async (nome, email, senha, papel, codigoAcesso) => {
        set({ isLoading: true, error: null });
        try {
          // /auth/register não devolve token (apenas id/nome/email/papel),
          // então após criar a conta reaproveitamos o login para autenticar
          // a sessão, igual ao fluxo já existente na tela de login.
          await authService.register(nome, email, senha, papel, codigoAcesso);
          const result = await authService.login(email, senha);
          set({
            token: result.token,
            role: result.papel,
            userName: result.nome,
            userEmail: email,
            isLoading: false,
          });
          return result.papel;
        } catch (err) {
          const message = err instanceof ApiError ? err.message : 'Erro ao criar conta';
          set({ isLoading: false, error: message });
          throw err;
        }
      },

      logout: () =>
        set({ token: null, role: null, userName: null, userEmail: null, error: null }),
    }),
    {
      name: 'resolve-mobile-auth',
      storage: createJSONStorage(() => secureStorage),
      partialize: (state) => ({
        token: state.token,
        role: state.role,
        userName: state.userName,
        userEmail: state.userEmail,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);

export function getPostLoginRoute(role: 'cidadao' | 'gestor'): '/denuncias' | '/gestor' {
  return role === 'gestor' ? '/gestor' : '/denuncias';
}
