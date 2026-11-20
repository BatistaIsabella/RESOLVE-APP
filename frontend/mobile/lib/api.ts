import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/stores/useAuthStore';

export const API_GATEWAY_URL =
  process.env.EXPO_PUBLIC_API_GATEWAY_URL ?? 'https://smartcity-api.beholder.app.br';

/**
 * Único tipo de erro que sai da camada de API. `status` 0 significa que a
 * requisição não chegou ao servidor (sem rede ou timeout) — o store usa isso
 * para decidir entre mostrar erro ou cair no cache offline.
 */
export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/** Mensagem pronta para a tela: a da API, se houver, senão o fallback. */
export function getErrorMessage(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.message : fallback;
}

export const api = axios.create({
  baseURL: API_GATEWAY_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

function serverMessage(data: unknown): string | undefined {
  if (data && typeof data === 'object' && 'error' in data) {
    const message = (data as { error?: unknown }).error;
    return typeof message === 'string' ? message : undefined;
  }
  return undefined;
}

function isAuthRoute(url: string | undefined): boolean {
  return !!url && /^\/?auth\//.test(url);
}

function toApiError(error: AxiosError): ApiError {
  if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
    return new ApiError('O servidor demorou para responder. Tente novamente.', 0);
  }

  if (!error.response) {
    return new ApiError('Sem conexão com o servidor. Verifique sua internet.', 0);
  }

  const { status, data } = error.response;
  const message = serverMessage(data);

  if (status === 401) {
    // 401 numa rota de auth é senha errada, não sessão vencida: a mensagem do
    // servidor ("Credenciais inválidas") é a certa, e não há sessão a encerrar.
    if (isAuthRoute(error.config?.url)) {
      return new ApiError(message ?? 'E-mail ou senha incorretos.', 401);
    }
    useAuthStore.getState().logout();
    return new ApiError('Sua sessão expirou. Faça login novamente.', 401);
  }

  const friendlyMessages: Record<number, string> = {
    400: message ?? 'Dados inválidos. Verifique os campos.',
    403: message ?? 'Você não tem permissão para esta ação.',
    404: message ?? 'Recurso não encontrado.',
    409: message ?? 'Conflito ao processar a solicitação.',
    413: 'A imagem é grande demais. Escolha uma foto menor.',
    429: 'Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente de novo.',
    500: 'Erro interno do servidor. Tente mais tarde.',
    // O gateway e os serviços dormem quando ociosos: a primeira chamada pode
    // pegar o servidor ainda acordando.
    502: 'Servidor indisponível no momento. Tente novamente em instantes.',
    503: 'Servidor indisponível no momento. Tente novamente em instantes.',
    504: 'O servidor demorou para responder. Tente novamente.',
  };

  return new ApiError(friendlyMessages[status] ?? message ?? `Erro na requisição (${status}).`, status);
}

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    throw toApiError(error);
  }
);
