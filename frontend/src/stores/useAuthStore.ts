import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { authService, RegisterInput } from "@/Services/authService";
import { ApiError } from "@/lib/api";
import { setAuthToken, setUnauthorizedHandler } from "@/lib/authToken";

export type Papel = "cidadao" | "gestor";

interface AuthState {
  token: string | null;
  role: Papel | null;
  userEmail: string | null;
  userName: string | null;
  isLoading: boolean;
  error: string | null;
  _hasHydrated: boolean;
  setHasHydrated: (state: boolean) => void;
  login: (email: string, senha: string, expectedRole?: Papel) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => void;
  clearSession: () => void;
}

const emptySession = {
  token: null,
  role: null,
  userEmail: null,
  userName: null,
} as const;

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      ...emptySession,
      isLoading: false,
      error: null,
      _hasHydrated: false,

      setHasHydrated: (state) => set({ _hasHydrated: state }),

      login: async (email, senha, expectedRole) => {
        set({ isLoading: true, error: null });
        try {
          const emailNormalizado = email.trim().toLowerCase();
          const result = await authService.login(emailNormalizado, senha);

          if (expectedRole && result.papel !== expectedRole) {
            throw new ApiError(
              expectedRole === "gestor"
                ? "Esta conta não possui perfil de gestor"
                : "Esta conta não possui perfil de cidadão",
              403
            );
          }

          set({
            token: result.token,
            role: result.papel,
            userEmail: result.email ?? emailNormalizado,
            userName: result.nome,
            isLoading: false,
            error: null,
          });
        } catch (err) {
          const message = err instanceof ApiError ? err.message : "Erro ao fazer login";
          set({ isLoading: false, error: message });
          throw err;
        }
      },

      register: async (input) => {
        set({ isLoading: true, error: null });
        try {
          await authService.register(input);
          set({ isLoading: false });
        } catch (err) {
          const message = err instanceof ApiError ? err.message : "Erro ao criar conta";
          set({ isLoading: false, error: message });
          throw err;
        }
      },

      // Saída pedida pelo usuário: avisa o servidor e limpa o navegador.
      logout: () => {
        const { token } = get();
        if (token) authService.logout(token).catch(() => {});
        get().clearSession();
      },

      // Sessão recusada pelo servidor ou saída concluída: só limpa o estado local.
      clearSession: () => set({ ...emptySession, error: null }),
    }),
    {
      name: "smart-city-storage-v2",
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
      partialize: (state) => ({
        token: state.token,
        role: state.role,
        userEmail: state.userEmail,
        userName: state.userName,
      }),
    }
  )
);

// Mantém a camada HTTP sincronizada com o token do store (login, logout e reidratação).
useAuthStore.subscribe((state) => setAuthToken(state.token));
setAuthToken(useAuthStore.getState().token);
setUnauthorizedHandler(() => useAuthStore.getState().clearSession());
