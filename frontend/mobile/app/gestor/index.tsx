import React from 'react';
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { GradientHeader } from '@/components/ui/GradientHeader';
import { DemandCard } from '@/components/ui/DemandCard';
import { DemandFiltersPanel } from '@/components/ui/DemandFilters';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { ChartCard } from '@/components/ui/charts/ChartCard';
import { PieChart } from '@/components/ui/charts/PieChart';
import { BarChart } from '@/components/ui/charts/BarChart';
import { LineChart } from '@/components/ui/charts/LineChart';
import { AppColors } from '@/constants/colors';
import { useGestorDashboardViewModel } from '@/viewmodels/useGestorDashboardViewModel';

export default function GestorScreen() {
  const vm = useGestorDashboardViewModel();
  const { width } = useWindowDimensions();

  const chartWidth = width - 64;

  if (vm.showLoadingScreen) {
    return <LoadingScreen message="Carregando painel..." />;
  }

  const header = (
    <View>
      <View style={styles.heroCard}>
        <Text style={styles.heroLabel}>Demanda total</Text>
        <Text style={styles.heroValue}>{vm.total}</Text>
      </View>

      <ChartCard title="Denúncias por categoria" legend={vm.categoryData} total={vm.categoryTotal}>
        <PieChart data={vm.categoryData} size={Math.min(chartWidth * 0.62, 190)} />
      </ChartCard>

      <ChartCard title="Denúncias por status" legend={vm.statusData} total={vm.statusTotal}>
        <PieChart data={vm.statusData} size={Math.min(chartWidth * 0.62, 190)} innerRatio={0.58} />
      </ChartCard>

      <ChartCard title="Denúncias por região">
        <BarChart data={vm.regionSlices} width={chartWidth} />
      </ChartCard>

      <ChartCard title="Denúncias por período">
        <LineChart data={vm.periodSeries} width={chartWidth} />
        <Text style={styles.periodNote}>Últimos 7 dias, sobre as denúncias carregadas.</Text>
      </ChartCard>

      <DemandFiltersPanel filters={vm.filters} onApply={vm.applyFilters} />

      {vm.error ? <Text style={styles.error}>{vm.error}</Text> : null}

      <Text style={styles.listHeading}>Denúncias</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <GradientHeader
        title="Gestão"
        profileLabel={vm.userName ?? 'Gestor'}
        variant="gestor"
        onBack={vm.goHome}
        onLogout={vm.handleLogout}
        onProfile={vm.goToPerfil}
      />

      <FlatList
        data={vm.filteredDemands}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={header}
        refreshControl={
          <RefreshControl
            refreshing={vm.refreshing}
            onRefresh={vm.onRefresh}
            tintColor={AppColors.primary}
          />
        }
        renderItem={({ item }) => (
          <DemandCard demand={item} onViewDetails={vm.openDemand} />
        )}
        ListEmptyComponent={
          vm.showEmptyState ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>Nenhuma denúncia encontrada.</Text>
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
    backgroundColor: '#F9FAFB',
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
  error: {
    color: '#DC2626',
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
