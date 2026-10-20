import { getRedisClient } from '../config/redis';

// O auth-service mantém uma versão de sessão por usuário no Redis (auth:sv:<id>).
// Token com versão menor que a atual foi emitido antes de uma troca de senha e é recusado.
const PREFIXO = 'auth:sv:';
const TEMPO_LIMITE_MS = 500;

function comTempoLimite<T>(promessa: Promise<T>): Promise<T> {
  return Promise.race([
    promessa,
    new Promise<never>((_, rejeitar) => setTimeout(() => rejeitar(new Error('Redis timeout')), TEMPO_LIMITE_MS)),
  ]);
}

// Se o Redis estiver indisponível o token continua valendo até expirar,
// o mesmo comportamento do auth-service.
export async function sessaoValida(usuarioId: number, versaoDoToken: number | undefined): Promise<boolean> {
  if (versaoDoToken === undefined) return true;

  try {
    const redis = await comTempoLimite(getRedisClient());
    const valor = await comTempoLimite(redis.get(`${PREFIXO}${usuarioId}`));
    const atual = valor ? Number(valor) : 0;
    return versaoDoToken >= atual;
  } catch {
    return true;
  }
}
