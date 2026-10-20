import { getRedisQueueClient, getRedisSubscriber, REDIS_CHANNEL, REDIS_QUEUE } from '../config/redis';
import { renovarCacheAposMudanca } from '../services/metricsService';
import { withRetry } from '../utils/retry';

async function processEvent(message: string) {
  const event = JSON.parse(message) as { type: string; denunciaId?: number };
  console.log(`[metrics] Evento processado: ${event.type}`, event.denunciaId ?? '');
  await withRetry(() => renovarCacheAposMudanca());
}

export async function startEventSubscriber() {
  const subscriber = await getRedisSubscriber();
  await subscriber.subscribe(REDIS_CHANNEL, async (message) => {
    try {
      await processEvent(message);
    } catch (err) {
      console.error('[metrics] Erro ao processar evento pub/sub:', err);
    }
  });
  console.log(`[metrics] Inscrito no canal ${REDIS_CHANNEL}`);
}

export async function startQueueWorker() {
  const redis = await getRedisQueueClient();

  (async function poll() {
    while (true) {
      try {
        const result = await redis.brPop(REDIS_QUEUE, 0);
        if (result?.element) {
          await processEvent(result.element);
        }
      } catch (err) {
        console.error('[metrics] Erro no worker da fila:', err);
        await new Promise((r) => setTimeout(r, 1000));
      }
    }
  })();
}
