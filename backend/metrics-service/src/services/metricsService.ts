import { Categorias, Regioes, StatusDenuncia } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { getRedisClient, METRICS_CACHE_KEY } from '../config/redis';
import { withRetry } from '../utils/retry';

export interface MetricsKpis {
  total: number;
  byCategory: Record<string, number>;
  byRegion: Record<string, number>;
  byStatus: Record<string, number>;
  updatedAt: string;
}

const CACHE_TTL_SECONDS = 300;
const ESCOPO_GERAL = 'GERAL';

// Escopo = categorias que quem consulta pode ver. `undefined` é a gestão geral (todas).
export type Escopo = readonly string[] | undefined;

function chaveDoEscopo(escopo: Escopo): string {
  return escopo ? [...escopo].sort().join('+') : ESCOPO_GERAL;
}

function chaveDoCache(escopo: Escopo): string {
  return `${METRICS_CACHE_KEY}:${chaveDoEscopo(escopo)}`;
}

function filtroDoEscopo(escopo: Escopo) {
  return escopo ? { categoria: { in: escopo as Categorias[] } } : {};
}

export async function aggregateMetrics(escopo?: Escopo): Promise<MetricsKpis> {
  const base = filtroDoEscopo(escopo);
  const categorias = Object.values(Categorias).filter((c) => !escopo || escopo.includes(c));

  const contar = async (campo: 'categoria' | 'regiao' | 'status', valor: string): Promise<[string, number]> => {
    const count = await prisma.denuncia.count({ where: { ...base, [campo]: valor } });
    return [valor, count];
  };

  const [total, categoryResults, regionResults, statusResults] = await Promise.all([
    prisma.denuncia.count({ where: base }),
    Promise.all(categorias.map((c) => contar('categoria', c))),
    Promise.all(Object.values(Regioes).map((r) => contar('regiao', r))),
    Promise.all(Object.values(StatusDenuncia).map((s) => contar('status', s))),
  ]);

  return {
    total,
    byCategory: Object.fromEntries(categoryResults),
    byRegion: Object.fromEntries(regionResults),
    byStatus: Object.fromEntries(statusResults),
    updatedAt: new Date().toISOString(),
  };
}

export async function refreshMetricsCache(escopo?: Escopo): Promise<MetricsKpis> {
  // timeout de 5s — se o Prisma travar, rejeita
  const metrics = await Promise.race([
    withRetry(() => aggregateMetrics(escopo)),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('refreshMetricsCache timeout')), 5000)
    ),
  ]);

  const redis = await getRedisClient();
  await redis.setEx(chaveDoCache(escopo), CACHE_TTL_SECONDS, JSON.stringify(metrics));

  return metrics;
}

export async function getMetrics(escopo?: Escopo): Promise<MetricsKpis> {
  const redis = await getRedisClient();
  const cached = await redis.get(chaveDoCache(escopo));

  if (cached) {
    return JSON.parse(cached) as MetricsKpis;
  }

  return refreshMetricsCache(escopo);
}

// Chamado quando uma denúncia muda: renova o cache da gestão geral e descarta os dos
// órgãos, que são recalculados na próxima consulta.
export async function renovarCacheAposMudanca(): Promise<MetricsKpis> {
  const redis = await getRedisClient();
  const geral = chaveDoCache(undefined);

  for await (const chave of redis.scanIterator({ MATCH: `${METRICS_CACHE_KEY}:*`, COUNT: 100 })) {
    if (chave !== geral) await redis.del(chave);
  }

  return refreshMetricsCache();
}
