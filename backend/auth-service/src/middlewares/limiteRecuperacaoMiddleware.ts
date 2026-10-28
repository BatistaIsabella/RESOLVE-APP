import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { getRedis } from '../config/redis';

const JANELA_SEGUNDOS = 15 * 60;
const TEMPO_LIMITE_MS = 500;

const maximo = () => Number(process.env.RECUPERACAO_MAX_POR_JANELA ?? 10);

function recusar(res: Response) {
  res.status(429).json({ error: 'Muitas solicitações. Tente novamente em alguns minutos.' });
}

// Se o Redis estiver fora do ar, o limite continua valendo, só que na memória deste processo.
const emMemoria = rateLimit({
  windowMs: JANELA_SEGUNDOS * 1000,
  max: maximo(),
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => recusar(res),
});

function comTempoLimite<T>(promessa: Promise<T>): Promise<T> {
  return Promise.race([
    promessa,
    new Promise<never>((_, rejeitar) => setTimeout(() => rejeitar(new Error('Redis timeout')), TEMPO_LIMITE_MS)),
  ]);
}

// Limite por IP nas rotas que disparam e-mail ou aceitam token de redefinição e código de MFA.
// A contagem fica no Redis para não zerar quando o serviço reinicia nem variar entre réplicas.
// O bloqueio por conta do login fica no authService (tentativasLoginService).
export async function limiteRecuperacao(req: Request, res: Response, next: NextFunction) {
  let total: number;
  try {
    const redis = await comTempoLimite(getRedis());
    const chave = `auth:rl:recuperacao:${req.ip}`;
    total = await comTempoLimite(redis.incr(chave));
    if (total === 1) await comTempoLimite(redis.expire(chave, JANELA_SEGUNDOS));
  } catch {
    return emMemoria(req, res, next);
  }

  if (total > maximo()) return recusar(res);
  next();
}
