import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';

import { useAuth } from '@/hooks/useAuth';
import { useDemandContext } from '@/contexts/DemandContext';
import { DemandFilters } from '@/types/demand';
import { buildPeriodSeries, countBy, toSlices } from '@/utils/metricsAggregator';
import { filterDemands, hasActiveFilters } from '@/utils/demandFilters';
import { REGIAO_ABREVIADA } from '@/constants/demanda';
import { ChartPalette, ChartStatusColors } from '@/constants/colors';

export function useGestorDashboardViewModel() {
  const router = useRouter();
  const { userName, logout } = useAuth();

  const filters = useDemandContext((s) => s.filters);
  const metrics = useDemandContext((s) => s.metrics);
  const isLoading = useDemandContext((s) => s.isLoading);
  const error = useDemandContext((s) => s.error);
  const fetchDemands = useDemandContext((s) => s.fetchDemands);
  const fetchMetrics = useDemandContext((s) => s.fetchMetrics);
  const setFilters = useDemandContext((s) => s.setFilters);
  const demands = useDemandContext((s) => s.demands);

  const [refreshing, setRefreshing] = useState(false);
  const [carregando, setCarregando] = useState(true);

  const load = useCallback(async () => {
    await Promise.all([fetchDemands(), fetchMetrics()]);
  }, [fetchDemands, fetchMetrics]);

  useFocusEffect(
    useCallback(() => {
      load().finally(() => setCarregando(false));
    }, [load])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  };

  const filtrosAtivos = hasActiveFilters(filters);

  const filteredDemands = useMemo(() => filterDemands(demands, filters), [demands, filters]);

  const source = useMemo(() => {
    if (filtrosAtivos || !metrics) {
      return {
        total: filteredDemands.length,
        byCategory: countBy(filteredDemands, (d) => d.category),
        byRegion: countBy(filteredDemands, (d) => d.region),
        byStatus: countBy(filteredDemands, (d) => d.status),
      };
    }
    return {
      total: metrics.total,
      byCategory: metrics.byCategory,
      byRegion: metrics.byRegion,
      byStatus: metrics.byStatus,
    };
  }, [filtrosAtivos, metrics, filteredDemands]);

  const categoryData = useMemo(
    () =>
      toSlices(source.byCategory).map((slice, index) => ({
        ...slice,
        color: ChartPalette[index % ChartPalette.length],
      })),
    [source.byCategory]
  );
  const statusData = useMemo(
    () =>
      toSlices(source.byStatus, 3).map((slice, index) => ({
        ...slice,
        color: ChartStatusColors[slice.label] ?? ChartPalette[index % ChartPalette.length],
      })),
    [source.byStatus]
  );
  const regionSlices = useMemo(
    () =>
      toSlices(source.byRegion).map((slice) => ({
        ...slice,
        label: REGIAO_ABREVIADA[slice.label] ?? slice.label,
      })),
    [source.byRegion]
  );
  const periodSeries = useMemo(() => buildPeriodSeries(filteredDemands), [filteredDemands]);

  const categoryTotal = categoryData.reduce((sum, item) => sum + item.value, 0);
  const statusTotal = statusData.reduce((sum, item) => sum + item.value, 0);

  const applyFilters = (next: DemandFilters) => setFilters(next);

  const openDemand = (id: string) => router.push(`/gestor/${id}`);

  const goHome = () => router.replace('/');
  const goToPerfil = () => router.push('/perfil');

  const handleLogout = () => {
    logout();
    router.replace('/');
  };

  return {
    userName,
    showLoadingScreen: carregando && demands.length === 0 && !metrics && !refreshing,
    showEmptyState: !carregando && !isLoading,
    refreshing,
    onRefresh,
    error,

    total: source.total,
    categoryData,
    categoryTotal,
    statusData,
    statusTotal,
    regionSlices,
    periodSeries,

    filters,
    applyFilters,
    filteredDemands,

    openDemand,
    goHome,
    goToPerfil,
    handleLogout,
  };
}
