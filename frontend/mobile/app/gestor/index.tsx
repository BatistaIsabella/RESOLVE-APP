import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { GradientHeader } from '@/components/ui/GradientHeader';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { DemandCard } from '@/components/ui/DemandCard';
import { DemandFiltersPanel } from '@/components/ui/DemandFilters';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { ErrorState } from '@/components/ui/ErrorState';
import { ChartCard } from '@/components/ui/charts/ChartCard';
import { PieChart } from '@/components/ui/charts/PieChart';
import { BarChart } from '@/components/ui/charts/BarChart';
import { LineChart } from '@/components/ui/charts/LineChart';
import { useAuth } from '@/hooks/useAuth';
import { useDemandStore } from '@/stores/useDemandStore';
import { buildPeriodSeries, countBy, toSlices } from '@/utils/metricsAggregator';
import { REGIAO_ABREVIADA } from '@/constants/demanda';
import { filterDemands, hasActiveFilters } from '@/utils/demandFilters';
import { AppColors, ChartPalette, ChartStatusColors } from '@/constants/colors';

export default function GestorScreen() {
  const router = useRouter();
  const { userName, signOut } = useAuth();
  const { width } = useWindowDimensions();

  const filters = useDemandStore((s) => s.filters);
  const metrics = useDemandStore((s) => s.metrics);
  const isLoadingDemands = useDemandStore((s) => s.isLoadingDemands);
  const isLoadingMetrics = useDemandStore((s) => s.isLoadingMetrics);
  const demandsError = useDemandStore((s) => s.demandsError);
  const metricsError = useDemandStore((s) => s.metricsError);
  const fetchDemands = useDemandStore((s) => s.fetchDemands);
  const fetchMetrics = useDemandStore((s) => s.fetchMetrics);
  const setFilters = useDemandStore((s) => s.setFilters);
  const demands = useDemandStore((s) => s.demands);

  const [refreshing, setRefreshing] = useState(false);
  const isLoading = isLoadingDemands || isLoadingMetrics;

  const load = useCallback(async () => {
    await Promise.all([fetchDemands(), fetchMetrics()]);
  }, [fetchDemands, fetchMetrics]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
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

  const categorySlices = useMemo(() => toSlices(source.byCategory), [source.byCategory]);
  const statusSlices = useMemo(() => toSlices(source.byStatus, 3), [source.byStatus]);
  const regionSlices = useMemo(
    () =>
      toSlices(source.byRegion).map((slice) => ({
        ...slice,
        label: REGIAO_ABREVIADA[slice.label] ?? slice.label,
      })),
    [source.byRegion]
  );
  const periodSeries = useMemo(() => buildPeriodSeries(filteredDemands), [filteredDemands]);

  const chartWidth = width - 64;

  const categoryData = categorySlices.map((slice, index) => ({
    ...slice,
    color: ChartPalette[index % ChartPalette.length],
  }));
  const statusData = statusSlices.map((slice, index) => ({
    ...slice,
    color: ChartStatusColors[slice.label] ?? ChartPalette[index % ChartPalette.length],
  }));

  const categoryTotal = categoryData.reduce((sum, item) => sum + item.value, 0);
  const statusTotal = statusData.reduce((sum, item) => sum + item.value, 0);

  // Só a primeira carga ocupa a tela; com dados, a atualização é por trás.
  if (isLoading && demands.length === 0 && !metrics && !refreshing) {
    return <LoadingScreen message="Carregando painel..." />;
  }

  const header = (
    <GradientHeader
      title="Gestão"
      profileLabel={userName ?? 'Gestor'}
      variant="gestor"
      onBack={() => router.replace('/')}
      onLogout={signOut}
    />
  );

  // Nada para mostrar: sem lista e sem métricas, um painel de zeros enganaria.
  if (demands.length === 0 && !metrics && (demandsError || metricsError)) {
    return (
      <View style={styles.container}>
        {header}
        <ErrorState message={demandsError ?? metricsError ?? ''} onRetry={load} retrying={isLoading} />
      </View>
    );
  }

  const dashboard = (
    <View>
      {metricsError && !filtrosAtivos ? (
        <Text style={styles.warning}>
          O total histórico está indisponível agora. Os números abaixo são das denúncias carregadas.
        </Text>
      ) : null}

      <View style={styles.heroCard}>
        <Text style={styles.heroLabel}>Demanda total</Text>
        <Text style={styles.heroValue}>{source.total}</Text>
      </View>

      <ChartCard title="Denúncias por categoria" legend={categoryData} total={categoryTotal}>
        <PieChart data={categoryData} size={Math.min(chartWidth * 0.62, 190)} />
      </ChartCard>

      <ChartCard title="Denúncias por status" legend={statusData} total={statusTotal}>
        <PieChart data={statusData} size={Math.min(chartWidth * 0.62, 190)} innerRatio={0.58} />
      </ChartCard>

      <ChartCard title="Denúncias por região">
        <BarChart data={regionSlices} width={chartWidth} />
      </ChartCard>

      <ChartCard title="Denúncias por período">
        <LineChart data={periodSeries} width={chartWidth} />
        <Text style={styles.periodNote}>Últimos 7 dias, sobre as denúncias carregadas.</Text>
      </ChartCard>

      <DemandFiltersPanel filters={filters} onApply={setFilters} />

      {demandsError ? <Text style={styles.error}>{demandsError}</Text> : null}

      <Text style={styles.listHeading}>Denúncias</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {header}
      <OfflineBanner />

      <FlatList
        data={filteredDemands}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={dashboard}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={AppColors.primary}
          />
        }
        renderItem={({ item }) => (
          <DemandCard demand={item} onViewDetails={(id) => router.push(`/gestor/${id}`)} />
        )}
        ListEmptyComponent={
          !isLoadingDemands && !demandsError ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>
                {filtrosAtivos ? 'Nenhuma denúncia com esses filtros.' : 'Nenhuma denúncia registrada.'}
              </Text>
            </View>
          ) : null
        }
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  list: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
  },
  heroCard: {
    backgroundColor: AppColors.primary,
    borderRadius: 20,
    paddingVertical: 28,
    alignItems: 'center',
    marginBottom: 16,
  },
  heroLabel: {
    color: AppColors.white,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  heroValue: {
    color: AppColors.white,
    fontSize: 56,
    fontWeight: '800',
  },
  periodNote: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 8,
  },
  listHeading: {
    fontSize: 18,
    fontWeight: '700',
    color: AppColors.text,
    marginBottom: 12,
  },
  warning: {
    color: '#92400E',
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    padding: 10,
    fontSize: 12,
    marginBottom: 12,
  },
  error: {
    color: AppColors.danger,
    textAlign: 'center',
    marginBottom: 8,
  },
  empty: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: AppColors.textMuted,
    fontSize: 15,
  },
});
