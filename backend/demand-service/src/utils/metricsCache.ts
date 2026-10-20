import type { RedisClientType } from 'redis';

export const METRICS_CACHE_PREFIXO = 'smartcity:metrics:kpis';

// O metrics-service guarda um cache por órgão (smartcity:metrics:kpis:<escopo>).
// Qualquer mudança em denúncias invalida todos eles.
export async function limparCacheMetricas(redis: RedisClientType): Promise<void> {
  for await (const chave of redis.scanIterator({ MATCH: `${METRICS_CACHE_PREFIXO}*`, COUNT: 100 })) {
    await redis.del(chave);
  }
}
