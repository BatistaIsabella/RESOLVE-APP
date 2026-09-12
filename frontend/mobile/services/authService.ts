import { api, toApiError } from '@/lib/api';

export interface AuthResponse {
  token: string;
  papel: 'cidadao' | 'gestor';
  userId: number;
  nome: string;
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
};
