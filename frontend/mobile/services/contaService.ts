import { api, toApiError } from '@/lib/api';
import { AuthResponse } from '@/services/authService';

export interface Conta {
  id: number;
  nome: string;
  email: string;
  papel: 'cidadao' | 'gestor';
  orgao?: string;
  aceiteTermosEm: string | null;
  versaoTermos: string | null;
  termosPendentes: boolean;
  mfa: { disponivel: boolean; ativa: boolean; obrigatoria: boolean };
}

export interface ConfiguracaoMfa {
  segredo: string;
  otpauthUri: string;
}

export interface AtivacaoMfa {
  codigosRecuperacao: string[];
  // Presente quando a configuração foi feita antes de existir sessão (MFA obrigatória no primeiro acesso).
  login?: AuthResponse;
}

async function chamar<T>(requisicao: Promise<{ data: T }>): Promise<T> {
  try {
    return (await requisicao).data;
  } catch (err) {
    throw toApiError(err);
  }
}

export const contaService = {
  obter(): Promise<Conta> {
    return chamar(api.get<Conta>('/auth/me'));
  },

  // Devolve um token novo porque o e-mail faz parte do token.
  atualizar(dados: { nome?: string; email?: string }): Promise<{ conta: Conta; token: string }> {
    return chamar(api.patch<{ conta: Conta; token: string }>('/auth/me', dados));
  },

  // A troca encerra as outras sessões e devolve um token novo para esta.
  alterarSenha(senhaAtual: string, novaSenha: string): Promise<{ token: string }> {
    return chamar(api.post<{ token: string }>('/auth/me/senha', { senhaAtual, novaSenha }));
  },

  aceitarTermos(versao: string): Promise<Conta> {
    return chamar(api.post<Conta>('/auth/aceite-termos', { versao }));
  },

  async excluir(senha: string): Promise<void> {
    try {
      await api.delete('/auth/me', { data: { senha } });
    } catch (err) {
      throw toApiError(err);
    }
  },

  // `desafio` só é enviado quando ainda não há sessão (MFA obrigatória no primeiro login).
  mfaConfigurar(desafio?: string): Promise<ConfiguracaoMfa> {
    return chamar(api.post<ConfiguracaoMfa>('/auth/mfa/configurar', desafio ? { desafio } : {}));
  },

  mfaAtivar(codigo: string, desafio?: string): Promise<AtivacaoMfa> {
    return chamar(api.post<AtivacaoMfa>('/auth/mfa/ativar', { codigo, ...(desafio ? { desafio } : {}) }));
  },

  async mfaDesativar(senha: string, codigo: string): Promise<void> {
    try {
      await api.post('/auth/mfa/desativar', { senha, codigo });
    } catch (err) {
      throw toApiError(err);
    }
  },

  // Cópia dos dados do titular: conta (Auth) e ocorrências (Demand).
  async exportarDados(): Promise<Record<string, unknown>> {
    const [conta, ocorrencias] = await Promise.all([
      chamar(api.get<Conta>('/auth/me')),
      chamar(api.get<Record<string, unknown>>('/demands/me/export')),
    ]);

    return {
      geradoEm: new Date().toISOString(),
      conta: {
        nome: conta.nome,
        email: conta.email,
        tipo: conta.papel,
        orgao: conta.orgao ?? null,
        aceiteTermosEm: conta.aceiteTermosEm,
        versaoTermos: conta.versaoTermos,
      },
      ...ocorrencias,
    };
  },
};
