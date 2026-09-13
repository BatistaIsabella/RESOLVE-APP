import { apiFetch, AUTH_API_URL } from '@/lib/api';

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
  papel: string;
}

export const authService = {
  async login(email: string, senha: string): Promise<AuthResponse> {
    const resposta = await apiFetch<AuthResponse>(AUTH_API_URL, '/login', {
      method: 'POST',
      body: JSON.stringify({ email, senha }),
    });

    if (resposta && resposta.token) {
      localStorage.setItem('@SmartCity:token', resposta.token);

      const stateStore = {
        state: {
          token: resposta.token,
          role: resposta.papel,
          userEmail: email,
          userName: resposta.nome,
        },
        version: 0,
      };

      localStorage.setItem('smart-city-storage-v2', JSON.stringify(stateStore));
    }

    return resposta;
  },

  async register(
    nome: string,
    email: string,
    senha: string,
    tipo: 'cidadao' | 'gestor'
  ): Promise<RegisterResponse> {
    return apiFetch<RegisterResponse>(AUTH_API_URL, '/register', {
      method: 'POST',
      body: JSON.stringify({ nome, email, senha, papel: tipo }),
    });
  },
};