import { Demand } from '@/types/demand';

export interface ChartSlice {
  label: string;
  value: number;
}

const WEEKDAY_LABELS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

/**
 * Série dos últimos 7 dias derivada da lista de demandas.
 *
 * O /metrics não expõe série temporal, então isto é calculado no cliente sobre
 * a página que a tela já buscou (limite de 100). Não é o total histórico.
 */
export function buildPeriodSeries(demands: Demand[], today = new Date()): ChartSlice[] {
  const days: ChartSlice[] = [];
  const counts = new Map<string, number>();

  for (const demand of demands) {
    const date = new Date(demand.dataRegistroISO);
    if (Number.isNaN(date.getTime())) continue;
    const key = date.toDateString();
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  for (let offset = 6; offset >= 0; offset -= 1) {
    const day = new Date(today);
    day.setDate(day.getDate() - offset);
    days.push({
      label: WEEKDAY_LABELS[day.getDay()],
      value: counts.get(day.toDateString()) ?? 0,
    });
  }

  return days;
}

/**
 * Converte o mapa do /metrics em fatias ordenadas por volume, dobrando a cauda
 * em "Outras". O corte em 4 é de acessibilidade, não de estética: acima disso
 * as fatias vizinhas deixam de ser distinguíveis (ver ChartPalette).
 */
export function toSlices(data: Record<string, number>, maxSlices = 4): ChartSlice[] {
  const sorted = Object.entries(data)
    .map(([label, value]) => ({ label, value }))
    .filter((slice) => slice.value > 0)
    .sort((a, b) => b.value - a.value);

  if (sorted.length <= maxSlices) return sorted;

  const head = sorted.slice(0, maxSlices - 1);
  const tail = sorted.slice(maxSlices - 1);
  const outras = tail.reduce((sum, slice) => sum + slice.value, 0);

  return [...head, { label: 'Outras', value: outras }];
}

/** Contagem por chave a partir da lista, para quando os filtros estão ativos. */
export function countBy(demands: Demand[], key: (d: Demand) => string): Record<string, number> {
  const result: Record<string, number> = {};
  for (const demand of demands) {
    const value = key(demand);
    result[value] = (result[value] ?? 0) + 1;
  }
  return result;
}
