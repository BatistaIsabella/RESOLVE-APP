import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';

import { useAuth } from '@/hooks/useAuth';
import { useDemandContext } from '@/contexts/DemandContext';
import { filterDemands } from '@/utils/demandFilters';

export function useMinhasDenunciasViewModel() {
  const router = useRouter();
  const { userName, signOut: handleLogout } = useAuth();
  const filters = useDemandContext((s) => s.filters);
  const demands = useDemandContext((s) => s.demands);
  const isLoading = useDemandContext((s) => s.isLoading);
  const error = useDemandContext((s) => s.error);
  const fetchDemands = useDemandContext((s) => s.fetchDemands);
  const setFilters = useDemandContext((s) => s.setFilters);

  const [refreshing, setRefreshing] = useState(false);

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


  const visibleDemands = useMemo(() => filterDemands(demands, filters), [demands, filters]);


  return {
    userName,
    visibleDemands,
    error,
    showLoadingScreen: isLoading && visibleDemands.length === 0 && !refreshing,
    // Falhou e não há nada para mostrar: o erro ocupa o lugar da lista, com "Tentar novamente".
    showErrorState: !!error && visibleDemands.length === 0,
    showEmptyState: !isLoading && !error,
    retry: fetchDemands,
    retrying: isLoading,
    refreshing,
    onRefresh,

    filters,
    applyFilters: setFilters,

    openDemand: (id: string) => router.push(`/denuncias/${id}`),
    novaDenuncia: () => router.push('/denuncias/nova'),
    goHome: () => router.replace('/'),
    goToPerfil: () => router.push('/perfil'),
    handleLogout,
  };
}
