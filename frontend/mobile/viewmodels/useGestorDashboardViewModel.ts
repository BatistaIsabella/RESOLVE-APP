import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';

import { useAuth } from '@/hooks/useAuth';
import { useDemandStore } from '@/stores/useDemandStore';
import { DemandFilters } from '@/types/demand';
import { buildPeriodSeries, countBy, toSlices } from '@/utils/metricsAggregator';
import { filterDemands, hasActiveFilters } from '@/utils/demandFilters';
import { REGIAO_ABREVIADA } from '@/constants/demanda';
import { ChartPalette, ChartStatusColors } from '@/constants/colors';

/**
 * ViewModel do painel do gestor (app/gestor/index.tsx): carrega demandas e
 * métricas, aplica filtros e entrega os dados dos gráficos prontos para
 * desenhar.
 */
export function useGestorDashboardViewModel() {
  const router = useRouter();
  const { userName, logout } = useAuth();

  const filters = useDemandStore((s) => s.filters);
  const metrics = useDemandStore((s) => s.metrics);
  const isLoading = useDemandStore((s) => s.isLoading);
  const error = useDemandStore((s) => s.error);
  const fetchDemands = useDemandStore((s) => s.fetchDemands);
  const fetchMetrics = useDemandStore((s) => s.fetchMetrics);
  const setFilters = useDemandStore((s) => s.setFilters);
  const demands = useDemandStore((s) => s.demands);

  const [refreshing, setRefreshing] = useState(false);
  // `isLoading` da store é compartilhado pelas duas buscas e volta a false
  // quando a primeira termina; o painel só está pronto quando as duas acabam.
  const [carregando, setCarregando] = useState(true);

  const load = useCallback(async () => {
    await Promise.all([fetchDemands(), fetchMetrics()]);
  }, [fetchDemands, fetchMetrics]);

  // Recarrega a cada foco, não só no mount: ao voltar do detalhe depois de
  // mudar status/prioridade, total e gráficos precisam refletir a mudança.
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

  // Sem filtro os números vêm do /metrics (total histórico). Com filtro o
  // recorte só existe no cliente, então são derivados da lista.
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
    handleLogout,
  };
}
