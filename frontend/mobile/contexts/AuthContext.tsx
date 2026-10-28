import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { AuthResponse, authService, exigeConfiguracaoMfa, exigeConfirmacaoEmail, exigeMfa } from '@/services/authService';
import { contaService } from '@/services/contaService';
import { ApiError } from '@/lib/api';
import { setAuthSnapshot, setUnauthorizedHandler } from '@/lib/authToken';
import { clearSession, loadSession, saveSession, StoredSession } from '@/lib/secureStorage';
import { VERSAO_TERMOS } from '@/constants/termos';

type Papel = 'cidadao' | 'gestor';

interface CadastroDados {
  nome: string;
  email: string;
  senha: string;
  papel: Papel;
  codigoAcesso?: string;
}

// Resultado do login: sessão aberta, uma etapa de MFA ainda por fazer, ou (só no cadastro) o e-mail por confirmar.
export type ResultadoLogin =
  | { tipo: 'sessao'; role: Papel }
  | { tipo: 'confirmar-email' }
  | { tipo: 'mfa'; desafio: string }
  | { tipo: 'mfa-configuracao'; desafio: string };

interface AuthContextValue {
  token: string | null;
  role: Papel | null;
  userName: string | null;
  userEmail: string | null;
  orgao: string | null;
  termosPendentes: boolean;
  isLoading: boolean;
  error: string | null;
  hasHydrated: boolean;
  login: (email: string, senha: string) => Promise<ResultadoLogin>;
  register: (dados: CadastroDados) => Promise<ResultadoLogin>;
  concluirLoginMfa: (desafio: string, codigo: string) => Promise<Papel>;
  iniciarSessao: (resposta: AuthResponse) => Papel;
  logout: () => void;
  aceitarTermos: () => Promise<void>;
  atualizarSessao: (parcial: { token?: string; userName?: string; userEmail?: string }) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<StoredSession | null>(null);
  const [hasHydrated, setHasHydrated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mudouDuranteRestauracao = useRef(false);
  const sessionRef = useRef<StoredSession | null>(null);

  const applySession = useCallback((next: StoredSession | null) => {
    mudouDuranteRestauracao.current = true;
    sessionRef.current = next;
    setAuthSnapshot(next);
    setSession(next);
  }, []);

  useEffect(() => {
    let ativo = true;
    loadSession()
      .then((salva) => {
        if (!ativo || mudouDuranteRestauracao.current) return;
        sessionRef.current = salva;
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

  // Sessão recusada pelo servidor (token vencido ou encerrado): só limpa o aparelho.
  const encerrarLocalmente = useCallback(() => {
    setError(null);
    applySession(null);
  }, [applySession]);

  // Saída pedida pelo usuário: avisa o servidor (para o registro de auditoria) e limpa o aparelho.
  const logout = useCallback(() => {
    const token = sessionRef.current?.token;
    if (token) authService.logout(token).catch(() => {});
    encerrarLocalmente();
  }, [encerrarLocalmente]);

  useEffect(() => {
    setUnauthorizedHandler(encerrarLocalmente);
    return () => setUnauthorizedHandler(null);
  }, [encerrarLocalmente]);

  const iniciarSessao = useCallback(
    (resposta: AuthResponse): Papel => {
      applySession({
        token: resposta.token,
        role: resposta.papel,
        userName: resposta.nome,
        userEmail: resposta.email,
        orgao: resposta.orgao ?? null,
        termosPendentes: resposta.termosPendentes,
      });
      return resposta.papel;
    },
    [applySession]
  );

  const autenticar = useCallback(
    async (email: string, senha: string): Promise<ResultadoLogin> => {
      const resposta = await authService.login(email.trim().toLowerCase(), senha);

      if (exigeMfa(resposta)) return { tipo: 'mfa', desafio: resposta.desafio };
      if (exigeConfiguracaoMfa(resposta)) return { tipo: 'mfa-configuracao', desafio: resposta.desafio };
      return { tipo: 'sessao', role: iniciarSessao(resposta) };
    },
    [iniciarSessao]
  );

  const concluirLoginMfa = useCallback(
    async (desafio: string, codigo: string): Promise<Papel> => {
      return iniciarSessao(await authService.loginMfa(desafio, codigo));
    },
    [iniciarSessao]
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
    async (dados: CadastroDados) => {
      setIsLoading(true);
      setError(null);
      try {
        const resposta = await authService.register({ ...dados, versaoTermos: VERSAO_TERMOS });
        // Sem sessão até o e-mail ser confirmado: a tela seguinte pede o código enviado por e-mail.
        if (exigeConfirmacaoEmail(resposta)) return { tipo: 'confirmar-email' as const };
        return await autenticar(dados.email, dados.senha);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Erro ao criar conta');
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [autenticar]
  );

  const aceitarTermos = useCallback(async () => {
    await contaService.aceitarTermos(VERSAO_TERMOS);
    const atual = sessionRef.current;
    if (atual) applySession({ ...atual, termosPendentes: false });
  }, [applySession]);

  const atualizarSessao = useCallback(
    (parcial: { token?: string; userName?: string; userEmail?: string }) => {
      const atual = sessionRef.current;
      if (!atual) return;
      applySession({
        ...atual,
        token: parcial.token ?? atual.token,
        userName: parcial.userName ?? atual.userName,
        userEmail: parcial.userEmail ?? atual.userEmail,
      });
    },
    [applySession]
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      token: session?.token ?? null,
      role: session?.role ?? null,
      userName: session?.userName ?? null,
      userEmail: session?.userEmail ?? null,
      orgao: session?.orgao ?? null,
      termosPendentes: session?.termosPendentes ?? false,
      isLoading,
      error,
      hasHydrated,
      login,
      register,
      concluirLoginMfa,
      iniciarSessao,
      logout,
      aceitarTermos,
      atualizarSessao,
    }),
    [
      session,
      isLoading,
      error,
      hasHydrated,
      login,
      register,
      concluirLoginMfa,
      iniciarSessao,
      logout,
      aceitarTermos,
      atualizarSessao,
    ]
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
