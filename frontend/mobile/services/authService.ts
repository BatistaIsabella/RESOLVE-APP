import { api, toApiError } from '@/lib/api';

export interface AuthResponse {
  token: string;
  papel: 'cidadao' | 'gestor';
  userId: number;
  nome: string;
}

export interface RegisterResponse {
  id: number;
  nome: string;
  email: string;
  papel: 'cidadao' | 'gestor';
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

  async register(
    nome: string,
    email: string,
    senha: string,
    papel: 'cidadao' | 'gestor',
    codigoAcesso?: string
  ): Promise<RegisterResponse> {
    try {
      const { data } = await api.post<RegisterResponse>('/auth/register', {
        nome,
        email,
        senha,
        papel,
        codigoAcesso,
      });
      return data;
    } catch (err) {
      throw toApiError(err);
    }
  },
};
