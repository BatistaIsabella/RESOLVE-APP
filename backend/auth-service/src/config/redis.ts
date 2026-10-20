import { createClient, RedisClientType } from 'redis';

let client: RedisClientType | null = null;

// Conexão usada só para o controle de sessões. Se o Redis cair o serviço continua
// funcionando: o login segue valendo, apenas sem a invalidação de sessões antigas.
export async function getRedis(): Promise<RedisClientType> {
  if (!client) {
    client = createClient({
      url: process.env.REDIS_URL ?? 'redis://localhost:6379',
      socket: { reconnectStrategy: (tentativas) => (tentativas > 3 ? false : tentativas * 200) },
    });
    client.on('error', (err) => console.error('[auth] Redis:', err.message));
    await client.connect();
  }
  return client;
}
