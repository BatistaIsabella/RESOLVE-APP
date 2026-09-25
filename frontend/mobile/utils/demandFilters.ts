import { Demand, DemandFilters } from '@/types/demand';

/**
 * Aplica os filtros a uma lista de demandas.
 *
 * Vive fora do store porque as telas derivam a lista em `useMemo`: um método
 * do store seria recalculado a cada render, sem memorização.
 */
export function filterDemands(demands: Demand[], filters: DemandFilters): Demand[] {
  return demands.filter((demand) => {
    if (filters.status && demand.status !== filters.status) return false;
    if (filters.category && demand.category !== filters.category) return false;
    if (filters.region && demand.region !== filters.region) return false;
    if (filters.priority && demand.priority !== filters.priority) return false;
    return true;
  });
}

export function hasActiveFilters(filters: DemandFilters): boolean {
  return !!(filters.status || filters.category || filters.region || filters.priority);
}
