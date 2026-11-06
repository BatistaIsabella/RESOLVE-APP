import { getAuthToken, notifyUnauthorized } from '@/lib/authToken';

export const API_GATEWAY_URL =
  process.env.NEXT_PUBLIC_API_GATEWAY_URL ?? 'http://localhost:8080';

export const AUTH_API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080') + '/auth';
export const DEMAND_API_URL = `${API_GATEWAY_URL}/demands`;
export const METRICS_API_URL = `${API_GATEWAY_URL}/metrics`;

// Nestas rotas um 401 é erro de credencial, não sessão expirada.
const AUTH_CREDENTIAL_PATHS = ['/login', '/register'];

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

interface ApiFetchOptions extends RequestInit {
  token?: string;
}

export async function apiFetch<T>(
  baseUrl: string,
  path: string,
  options: ApiFetchOptions = {}
): Promise<T> {
  const { token: explicitToken, headers, ...rest } = options;
  const token = explicitToken ?? getAuthToken();

  const response = await fetch(`${baseUrl}${path}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    const isCredentialRequest =
      baseUrl === AUTH_API_URL && AUTH_CREDENTIAL_PATHS.some((p) => path.startsWith(p));

    // Token vencido ou sessão encerrada no servidor: o authStore limpa a sessão local.
    if (response.status === 401 && !isCredentialRequest) {
      notifyUnauthorized();
    }
    throw new ApiError(body.error ?? 'Erro na requisição', response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}
