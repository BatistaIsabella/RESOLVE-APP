import type { Demand, MetricsKpis } from '@/types/demand';

/**
 * Cópia local da última lista de demandas e das métricas, para o app abrir
 * algo útil sem rede. Funções puras: quem lê e grava no aparelho é
 * lib/cacheStorage.ts, e quem decide quando é o DemandContext.
 */
export interface DemandCache {
  versao: 1;
  /** E-mail do dono. Um cache de outro usuário nunca é mostrado. */
  dono: string;
  demands: Demand[];
  metrics: MetricsKpis | null;
  /** ISO da última resposta da API que entrou no cache. */
  sincronizadoEm: string;
}

export function criarCache(
  dono: string,
  demands: Demand[],
  metrics: MetricsKpis | null,
  sincronizadoEm: string
): DemandCache {
  return { versao: 1, dono: dono.trim().toLowerCase(), demands, metrics, sincronizadoEm };
}

/** Lê o JSON salvo. Devolve null se estiver corrompido, em outro formato ou for de outro usuário. */
export function lerCache(raw: string | null, email: string | null): DemandCache | null {
  if (!raw || !email) return null;
  try {
    const data = JSON.parse(raw);
    if (data?.versao !== 1 || !Array.isArray(data.demands) || typeof data.sincronizadoEm !== 'string') {
      return null;
    }
    if (data.dono !== email.trim().toLowerCase()) return null;
    return data as DemandCache;
  } catch {
    return null;
  }
}

/**
 * A requisição não chegou ao servidor (sem rede ou tempo esgotado): o
 * interceptor de lib/api devolve status 0 nesses casos. Só aí o cache entra;
 * erro do servidor continua sendo erro.
 */
export function isErroDeRede(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    (err as { name?: unknown }).name === 'ApiError' &&
    (err as { status?: unknown }).status === 0
  );
}
