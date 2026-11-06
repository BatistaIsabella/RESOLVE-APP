import { ApiError, apiFetch, AUTH_API_URL } from '@/lib/api';
import { VERSAO_TERMOS } from '@/constants/termos';

export interface AuthResponse {
  token: string;
  papel: 'cidadao' | 'gestor';
  userId: number;
  nome: string;
  email?: string;
}

export interface RegisterResponse {
  id: number;
  nome: string;
  email: string;
  papel: string;
}

export interface RegisterInput {
  nome: string;
  email: string;
  senha: string;
  papel: 'cidadao' | 'gestor';
  codigoAcesso?: string;
}

export const authService = {
  async login(email: string, senha: string): Promise<AuthResponse> {
    const resposta = await apiFetch<Partial<AuthResponse>>(AUTH_API_URL, '/login', {
      method: 'POST',
      body: JSON.stringify({ email, senha }),
    });

    // Contas com verificação em duas etapas recebem um desafio em vez da sessão; o fluxo ainda só existe no app.
    if (!resposta?.token || !resposta.papel) {
      throw new ApiError(
        'Esta conta exige verificação em duas etapas, disponível por enquanto apenas no aplicativo.',
        403
      );
    }

    return resposta as AuthResponse;
  },

  async register(input: RegisterInput): Promise<RegisterResponse> {
    return apiFetch<RegisterResponse>(AUTH_API_URL, '/register', {
      method: 'POST',
      body: JSON.stringify({
        ...input,
        aceiteTermos: true,
        versaoTermos: VERSAO_TERMOS,
      }),
    });
  },

  // Registra a saída no servidor (auditoria e invalidação da sessão).
  async logout(token: string): Promise<void> {
    await apiFetch<void>(AUTH_API_URL, '/logout', { method: 'POST', token });
  },
};
