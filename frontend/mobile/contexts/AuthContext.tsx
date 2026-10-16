import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { authService } from '@/services/authService';
import { ApiError } from '@/lib/api';
import { setAuthSnapshot, setUnauthorizedHandler } from '@/lib/authToken';
import { clearSession, loadSession, saveSession, StoredSession } from '@/lib/secureStorage';

type Papel = 'cidadao' | 'gestor';

interface AuthContextValue {
  token: string | null;
  role: Papel | null;
  userName: string | null;
  userEmail: string | null;
  isLoading: boolean;
  error: string | null;
  hasHydrated: boolean;
  login: (email: string, senha: string) => Promise<Papel>;
  register: (
    nome: string,
    email: string,
    senha: string,
    papel: Papel,
    codigoAcesso?: string
  ) => Promise<Papel>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<StoredSession | null>(null);
  const [hasHydrated, setHasHydrated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mudouDuranteRestauracao = useRef(false);

  const applySession = useCallback((next: StoredSession | null) => {
    mudouDuranteRestauracao.current = true;
    setAuthSnapshot(next);
    setSession(next);
  }, []);

  useEffect(() => {
    let ativo = true;
    loadSession()
      .then((salva) => {
        if (!ativo || mudouDuranteRestauracao.current) return;
        setAuthSnapshot(salva);
        setSession(salva);
      })
      .catch(() => {})
      .finally(() => {
        if (ativo) setHasHydrated(true);
      });
    return () => {
      ativo = false;
    };
  }, []);

  useEffect(() => {
    if (!hasHydrated) return;
    (session ? saveSession(session) : clearSession()).catch(() => {});
  }, [session, hasHydrated]);

  const logout = useCallback(() => {
    setError(null);
    applySession(null);
  }, [applySession]);

  useEffect(() => {
    setUnauthorizedHandler(logout);
    return () => setUnauthorizedHandler(null);
  }, [logout]);

  const autenticar = useCallback(
    async (email: string, senha: string): Promise<Papel> => {
      const emailNormalizado = email.trim().toLowerCase();
      const result = await authService.login(emailNormalizado, senha);
      applySession({
        token: result.token,
        role: result.papel,
        userName: result.nome,
        userEmail: emailNormalizado,
      });
      return result.papel;
    },
    [applySession]
  );

  const login = useCallback(
    async (email: string, senha: string) => {
      setIsLoading(true);
      setError(null);
      try {
        return await autenticar(email, senha);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Erro ao fazer login');
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [autenticar]
  );

  const register = useCallback(
    async (nome: string, email: string, senha: string, papel: Papel, codigoAcesso?: string) => {
      setIsLoading(true);
      setError(null);
      try {
        await authService.register(nome, email, senha, papel, codigoAcesso);
        return await autenticar(email, senha);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Erro ao criar conta');
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [autenticar]
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      token: session?.token ?? null,
      role: session?.role ?? null,
      userName: session?.userName ?? null,
      userEmail: session?.userEmail ?? null,
      isLoading,
      error,
      hasHydrated,
      login,
      register,
      logout,
    }),
    [session, isLoading, error, hasHydrated, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext precisa estar dentro de <AuthProvider>');
  }
  return context;
}

export function getPostLoginRoute(role: Papel): '/denuncias' | '/gestor' {
  return role === 'gestor' ? '/gestor' : '/denuncias';
}
