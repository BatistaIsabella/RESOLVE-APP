import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';

import { useAuth } from '@/hooks/useAuth';
import { useDemandContext } from '@/contexts/DemandContext';
import { filterDemands } from '@/utils/demandFilters';
import { DemandFilters } from '@/types/demand';

export function useMinhasDenunciasViewModel() {
  const router = useRouter();
  const { userName, logout } = useAuth();
  const filters = useDemandContext((s) => s.filters);
  const demands = useDemandContext((s) => s.demands);
  const isLoading = useDemandContext((s) => s.isLoading);
  const error = useDemandContext((s) => s.error);
  const fetchDemands = useDemandContext((s) => s.fetchDemands);
  const setFilters = useDemandContext((s) => s.setFilters);

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
