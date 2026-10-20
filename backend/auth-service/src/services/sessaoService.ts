import { getRedis } from '../config/redis';

// Cada usuário tem uma "versão de sessão" no Redis. O token carrega a versão vigente
// no momento do login (claim `sv`). Quando a senha muda, a versão sobe e os tokens
// anteriores passam a ser recusados pelos três serviços.
const PREFIXO = 'auth:sv:';
const TTL_SEGUNDOS = 2 * 24 * 60 * 60;
const TEMPO_LIMITE_MS = 500;

function comTempoLimite<T>(promessa: Promise<T>): Promise<T> {
  return Promise.race([
    promessa,
    new Promise<never>((_, rejeitar) => setTimeout(() => rejeitar(new Error('Redis timeout')), TEMPO_LIMITE_MS)),
  ]);
}

// Versão atual, ou null se o Redis estiver indisponível.
export async function versaoSessaoAtual(usuarioId: number): Promise<number | null> {
  try {
    const redis = await comTempoLimite(getRedis());
    const valor = await comTempoLimite(redis.get(`${PREFIXO}${usuarioId}`));
    return valor ? Number(valor) : 0;
  } catch {
    return null;
  }
}

export async function invalidarSessoes(usuarioId: number): Promise<number | null> {
  try {
    const redis = await comTempoLimite(getRedis());
    const chave = `${PREFIXO}${usuarioId}`;
    const versao = await comTempoLimite(redis.incr(chave));
    await comTempoLimite(redis.expire(chave, TTL_SEGUNDOS));
    return versao;
  } catch (err) {
    console.error('[auth] Não foi possível invalidar as sessões anteriores:', (err as Error).message);
    return null;
  }
}

// Token sem `sv` (emitido antes deste controle ou sem Redis) é aceito até expirar.
export async function sessaoValida(usuarioId: number, versaoDoToken: number | undefined): Promise<boolean> {
  if (versaoDoToken === undefined) return true;
  const atual = await versaoSessaoAtual(usuarioId);
  if (atual === null) return true;
  return versaoDoToken >= atual;
}
