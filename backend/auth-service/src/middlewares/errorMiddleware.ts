import { Request, Response, NextFunction } from 'express';

type ErroHttp = Error & { status?: number; detalhes?: string[]; retryAfter?: number; codigo?: string };

export function errorMiddleware(err: ErroHttp, _req: Request, res: Response, _next: NextFunction) {
  const status = err.status || 500;
  const message = status === 500 ? 'Erro interno do servidor' : err.message;

  if (status === 500) console.error('[auth] Erro não tratado:', err);
  if (err.retryAfter) res.setHeader('Retry-After', String(err.retryAfter));

  res.status(status).json({
    error: message,
    ...(err.detalhes ? { detalhes: err.detalhes } : {}),
    ...(err.codigo ? { codigo: err.codigo } : {}),
  });
}
