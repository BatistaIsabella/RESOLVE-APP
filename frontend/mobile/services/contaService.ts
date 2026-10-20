import { api, toApiError } from '@/lib/api';

export interface Conta {
  id: number;
  nome: string;
  email: string;
  papel: 'cidadao' | 'gestor';
  orgao?: string;
  aceiteTermosEm: string | null;
  versaoTermos: string | null;
  termosPendentes: boolean;
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
