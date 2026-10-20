import { api, toApiError } from '@/lib/api';

export interface AuthResponse {
  token: string;
  papel: 'cidadao' | 'gestor';
  userId: number;
  nome: string;
  orgao?: string;
  termosPendentes: boolean;
}

export interface RegisterResponse {
  id: number;
  nome: string;
  email: string;
  papel: 'cidadao' | 'gestor';
  orgao?: string;
}

export interface CadastroInput {
  nome: string;
  email: string;
  senha: string;
  papel: 'cidadao' | 'gestor';
  codigoAcesso?: string;
  versaoTermos: string;
}

export const authService = {
  async login(email: string, senha: string): Promise<AuthResponse> {
    try {
      const { data } = await api.post<AuthResponse>('/auth/login', { email, senha });
      return data;
    } catch (err) {
      throw toApiError(err);
    }
  },

  async register(input: CadastroInput): Promise<RegisterResponse> {
    try {
      const { data } = await api.post<RegisterResponse>('/auth/register', {
        ...input,
        aceiteTermos: true,
      });
      return data;
    } catch (err) {
      throw toApiError(err);
    }
  },

  // O token é passado à parte porque a sessão local já foi apagada quando o logout é enviado.
  async logout(token: string): Promise<void> {
    await api.post('/auth/logout', null, { headers: { Authorization: `Bearer ${token}` } });
  },

  async forgotPassword(email: string): Promise<string> {
    try {
      const { data } = await api.post<{ message: string }>('/auth/forgot-password', { email });
      return data.message;
    } catch (err) {
      throw toApiError(err);
    }
  },

  async resetPassword(token: string, novaSenha: string): Promise<string> {
    try {
      const { data } = await api.post<{ message: string }>('/auth/reset-password', { token, novaSenha });
      return data.message;
    } catch (err) {
      throw toApiError(err);
    }
  },
};
