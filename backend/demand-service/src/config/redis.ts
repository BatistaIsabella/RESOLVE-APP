import { createClient, RedisClientType } from 'redis';

export const REDIS_CHANNEL = 'smartcity:denuncia-status';
export const REDIS_QUEUE = 'smartcity:event-queue';

let publisher: RedisClientType | null = null;

export async function getRedisPublisher(): Promise<RedisClientType> {
  if (!publisher) {
    publisher = createClient({
      url: process.env.REDIS_URL ?? 'redis://localhost:6379',
      // Para não travar o event loop quando Redis está offline
      socket: { reconnectStrategy: (retries) => (retries > 3 ? false : retries * 200) },
    });
    publisher.on('error', (err) => console.error('[demand] Redis:', err.message));
    await publisher.connect();
  }
  return publisher;
}

export interface DenunciaStatusEvent {
  type: 'DENUNCIA_STATUS_ALTERADO';
  denunciaId: number;
  statusAnterior: string;
  statusNovo: string;
  gestorId: number;
  timestamp: string;
}

export async function publishDenunciaStatusEvent(event: Omit<DenunciaStatusEvent, 'type' | 'timestamp'>) {
  const payload: DenunciaStatusEvent = {
    type: 'DENUNCIA_STATUS_ALTERADO',
    ...event,
    timestamp: new Date().toISOString(),
  };

  const message = JSON.stringify(payload);
  const redis = await getRedisPublisher();
  await redis.lPush(REDIS_QUEUE, message);
  // A fila é só um aviso para o metrics-service; se ninguém consumir, os eventos somem em 1 hora.
  await redis.expire(REDIS_QUEUE, 60 * 60);
  await redis.publish(REDIS_CHANNEL, message);
}
