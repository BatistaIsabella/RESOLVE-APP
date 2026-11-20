import { api } from '@/lib/api';
import { UserRole } from '@/types/auth';

// Erros já chegam como ApiError pelo interceptor de lib/api.

export interface AuthResponse {
  token: string;
  papel: UserRole;
  userId: number;
  nome: string;
}

export interface RegisterResponse {
  id: number;
  nome: string;
  email: string;
  papel: UserRole;
}

export const authService = {
  async login(email: string, senha: string): Promise<AuthResponse> {
    const { data } = await api.post<AuthResponse>('/auth/login', { email, senha });
    return data;
  },

  async register(
    nome: string,
    email: string,
    senha: string,
    papel: UserRole,
    codigoAcesso?: string
  ): Promise<RegisterResponse> {
    const { data } = await api.post<RegisterResponse>('/auth/register', {
      nome,
      email,
      senha,
      papel,
      codigoAcesso,
    });
    return data;
  },
};
