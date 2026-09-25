import { MetricsKpis } from '@/types/demand';
import { mapCategoryFromApi, mapRegionFromApi, mapStatusFromApi } from '@/utils/demandMapper';

export interface ApiMetricsKpis {
  total: number;
  byCategory: Record<string, number>;
  byRegion: Record<string, number>;
  byStatus: Record<string, number>;
  updatedAt: string;
}

function translateKeys(
  data: Record<string, number>,
  translate: (value: string) => string
): Record<string, number> {
  const result: Record<string, number> = {};
  for (const [key, value] of Object.entries(data)) {
    const label = translate(key);
    result[label] = (result[label] ?? 0) + value;
  }
  return result;
}

/**
 * Traduz as chaves do /metrics para os mesmos rótulos de domínio usados nas
 * demandas, reaproveitando os mapas do demandMapper.
 *
 * Os rótulos precisam bater com os de `Demand`, porque a tela do gestor troca
 * entre os números do /metrics e os derivados da lista conforme os filtros.
 * Enquanto a tradução vivia no service, região vinha abreviada ("RMR") de um
 * lado e por extenso do outro. Abreviar é decisão de exibição e ficou com a
 * View.
 */
export function mapMetricsFromApi(data: ApiMetricsKpis): MetricsKpis {
  return {
    ...data,
    byCategory: translateKeys(data.byCategory, mapCategoryFromApi),
    byRegion: translateKeys(data.byRegion, mapRegionFromApi),
    byStatus: translateKeys(data.byStatus, mapStatusFromApi),
  };
}
