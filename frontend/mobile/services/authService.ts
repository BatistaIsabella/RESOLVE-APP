import { api, toApiError } from '@/lib/api';

export interface AuthResponse {
  token: string;
  papel: 'cidadao' | 'gestor';
  userId: number;
  nome: string;
  email: string;
  orgao?: string;
  termosPendentes: boolean;
}

// Com a verificação em duas etapas a senha certa ainda não devolve a sessão, só um desafio.
export interface MfaNecessaria {
  mfaNecessaria: true;
  desafio: string;
}

// MFA obrigatória e ainda não configurada: o desafio serve só para configurar.
export interface MfaConfiguracaoNecessaria {
  mfaConfiguracaoNecessaria: true;
  desafio: string;
}

export type RespostaLogin = AuthResponse | MfaNecessaria | MfaConfiguracaoNecessaria;

export function exigeMfa(resposta: RespostaLogin): resposta is MfaNecessaria {
  return 'mfaNecessaria' in resposta;
}

export function exigeConfiguracaoMfa(resposta: RespostaLogin): resposta is MfaConfiguracaoNecessaria {
  return 'mfaConfiguracaoNecessaria' in resposta;
}

export interface RegisterResponse {
  id: number;
  nome: string;
  email: string;
  papel: 'cidadao' | 'gestor';
  orgao?: string;
}

// Com a confirmação de e-mail ligada no servidor, o cadastro não cria sessão: responde igual para qualquer
// e-mail e a conta só entra depois de confirmar o código enviado por e-mail.
export interface ConfirmacaoNecessaria {
  confirmacaoNecessaria: true;
  mensagem: string;
}

export function exigeConfirmacaoEmail(resposta: RegisterResponse | ConfirmacaoNecessaria): resposta is ConfirmacaoNecessaria {
  return 'confirmacaoNecessaria' in resposta;
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
  async login(email: string, senha: string): Promise<RespostaLogin> {
    try {
      const { data } = await api.post<RespostaLogin>('/auth/login', { email, senha });
      return data;
    } catch (err) {
      throw toApiError(err);
    }
  },

  async loginMfa(desafio: string, codigo: string): Promise<AuthResponse> {
    try {
      const { data } = await api.post<AuthResponse>('/auth/login/mfa', { desafio, codigo });
      return data;
    } catch (err) {
      throw toApiError(err);
    }
  },

  async register(input: CadastroInput): Promise<RegisterResponse | ConfirmacaoNecessaria> {
    try {
      const { data } = await api.post<RegisterResponse | ConfirmacaoNecessaria>('/auth/register', {
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

  async confirmEmail(token: string): Promise<string> {
    try {
      const { data } = await api.post<{ message: string }>('/auth/confirmar-email', { token });
      return data.message;
    } catch (err) {
      throw toApiError(err);
    }
  },

  async resendConfirmation(email: string): Promise<string> {
    try {
      const { data } = await api.post<{ message: string }>('/auth/reenviar-confirmacao', { email });
      return data.message;
    } catch (err) {
      throw toApiError(err);
    }
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
