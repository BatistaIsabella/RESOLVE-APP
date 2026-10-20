import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { getAuthToken, notifyUnauthorized } from '@/lib/authToken';

export const API_GATEWAY_URL =
  process.env.EXPO_PUBLIC_API_GATEWAY_URL ?? 'https://smartcity-api.beholder.app.br';

// Nestas rotas um 401 é erro de credencial/código, não sessão expirada.
const AUTH_ENDPOINTS = ['/auth/login', '/auth/register', '/auth/forgot-password', '/auth/reset-password'];

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export const api = axios.create({
  baseURL: API_GATEWAY_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ error?: string; message?: string; detalhes?: string[] }>) => {
    const status = error.response?.status ?? 0;
    // Quando a senha não atende à política o servidor devolve cada motivo em `detalhes`.
    const detalhes = error.response?.data?.detalhes;
    const message =
      detalhes && detalhes.length > 0
        ? detalhes.join('\n')
        : (error.response?.data?.error ?? error.response?.data?.message);
    const isAuthRequest = AUTH_ENDPOINTS.some((path) => error.config?.url?.includes(path));

    if (status === 401 && !isAuthRequest) {
      notifyUnauthorized();
    }

    if (error.code === 'ECONNABORTED') {
      throw new ApiError('Tempo de conexão esgotado. Tente novamente.', 0);
    }

    if (!error.response) {
      throw new ApiError('Servidor indisponível. Verifique sua conexão.', 0);
    }

    const friendlyMessages: Record<number, string> = {
      400: message ?? 'Dados inválidos. Verifique os campos.',
      401: isAuthRequest
        ? (message ?? 'E-mail ou senha incorretos')
        : (message ?? 'Sessão expirada. Faça login novamente.'),
      403: message ?? 'Você não tem permissão para esta ação.',
      404: message ?? 'Recurso não encontrado.',
      409: message ?? 'Conflito ao processar a solicitação.',
      429: message ?? 'Muitas tentativas. Aguarde alguns minutos e tente de novo.',
      502: message ?? 'Não foi possível concluir agora. Tente novamente em instantes.',
      500: 'Erro interno do servidor. Tente mais tarde.',
    };

    throw new ApiError(friendlyMessages[status] ?? message ?? 'Erro na requisição', status);
  }
);

export function toApiError(err: unknown): ApiError {
  if (err instanceof ApiError) return err;
  if (axios.isAxiosError(err)) {
    const status = err.response?.status ?? 0;
    const message = (err.response?.data as { error?: string } | undefined)?.error;
    return new ApiError(message ?? 'Erro na requisição', status);
  }
  return new ApiError('Erro na requisição', 0);
}
