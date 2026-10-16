import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';

import { useAuth } from '@/hooks/useAuth';
import { useDemandStore } from '@/stores/useDemandStore';
import { filterDemands } from '@/utils/demandFilters';
import { DemandFilters } from '@/types/demand';

/**
 * ViewModel da lista de denúncias do cidadão (app/denuncias/index.tsx):
 * carrega as demandas, aplica os filtros e expõe as ações de navegação.
 */
export function useMinhasDenunciasViewModel() {
  const router = useRouter();
  const { userName, logout } = useAuth();
  // Seletor por campo: assinar o store inteiro re-renderizava a lista a cada
  // mudança de qualquer parte do estado.
  const filters = useDemandStore((s) => s.filters);
  const demands = useDemandStore((s) => s.demands);
  const isLoading = useDemandStore((s) => s.isLoading);
  const error = useDemandStore((s) => s.error);
  const fetchDemands = useDemandStore((s) => s.fetchDemands);
  const setFilters = useDemandStore((s) => s.setFilters);

  const [refreshing, setRefreshing] = useState(false);
  const [appliedFilters, setAppliedFilters] = useState<DemandFilters>(filters);

  const load = useCallback(async () => {
    await fetchDemands();
  }, [fetchDemands]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchDemands();
    } finally {
      setRefreshing(false);
    }
  };

  const applyFilters = (next: DemandFilters) => {
    setAppliedFilters(next);
    setFilters(next);
  };

  const visibleDemands = useMemo(() => filterDemands(demands, filters), [demands, filters]);

  const handleLogout = () => {
    logout();
    router.replace('/');
  };

  return {
    userName,
    visibleDemands,
    error,
    showLoadingScreen: isLoading && visibleDemands.length === 0 && !refreshing,
    showEmptyState: !isLoading,
    refreshing,
    onRefresh,

    appliedFilters,
    applyFilters,

    openDemand: (id: string) => router.push(`/denuncias/${id}`),
    novaDenuncia: () => router.push('/denuncias/nova'),
    goHome: () => router.replace('/'),
    handleLogout,
  };
}
