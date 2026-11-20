import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { authService } from '@/services/authService';
import { secureStorage } from '@/lib/secureStorage';
import { UserRole } from '@/types/auth';

interface AuthState {
  token: string | null;
  role: UserRole | null;
  userName: string | null;
  userEmail: string | null;
  /** Login ou cadastro em andamento. Erros são lançados para a tela exibir. */
  isLoading: boolean;
  _hasHydrated: boolean;
  setHasHydrated: (value: boolean) => void;
  login: (email: string, senha: string) => Promise<UserRole>;
  register: (
    nome: string,
    email: string,
    senha: string,
    papel: UserRole,
    codigoAcesso?: string
  ) => Promise<UserRole>;
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
      _hasHydrated: false,

      setHasHydrated: (value) => set({ _hasHydrated: value }),

      login: async (email, senha) => {
        set({ isLoading: true });
        try {
          const result = await authService.login(email, senha);
          set({ token: result.token, role: result.papel, userName: result.nome, userEmail: email });
          return result.papel;
        } finally {
          set({ isLoading: false });
        }
      },

      register: async (nome, email, senha, papel, codigoAcesso) => {
        set({ isLoading: true });
        try {
          // /auth/register não devolve token (apenas id/nome/email/papel),
          // então após criar a conta reaproveitamos o login para autenticar
          // a sessão, igual ao fluxo já existente na tela de login.
          await authService.register(nome, email, senha, papel, codigoAcesso);
          const result = await authService.login(email, senha);
          set({ token: result.token, role: result.papel, userName: result.nome, userEmail: email });
          return result.papel;
        } finally {
          set({ isLoading: false });
        }
      },

      logout: () =>
        set({ token: null, role: null, userName: null, userEmail: null }),
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

export function getPostLoginRoute(role: UserRole): '/denuncias' | '/gestor' {
  return role === 'gestor' ? '/gestor' : '/denuncias';
}
