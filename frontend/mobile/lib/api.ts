import axios from 'axios';

export const API_GATEWAY_URL =
  process.env.EXPO_PUBLIC_API_GATEWAY_URL ?? 'https://smart-city-6.onrender.com';

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
});

export function toApiError(err: unknown): ApiError {
  if (axios.isAxiosError(err)) {
    const message = (err.response?.data as { error?: string } | undefined)?.error;
    return new ApiError(message ?? 'Erro na requisição', err.response?.status ?? 0);
  }
  return new ApiError('Erro na requisição', 0);
}
