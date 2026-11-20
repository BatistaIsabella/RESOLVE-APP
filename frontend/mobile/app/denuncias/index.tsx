import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { GradientHeader } from '@/components/ui/GradientHeader';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { DemandCard } from '@/components/ui/DemandCard';
import { DemandFiltersPanel } from '@/components/ui/DemandFilters';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { useAuth } from '@/hooks/useAuth';
import { useDemandStore } from '@/stores/useDemandStore';
import { filterDemands, hasActiveFilters } from '@/utils/demandFilters';
import { AppColors } from '@/constants/colors';

export default function DenunciasScreen() {
  const router = useRouter();
  const { userName, signOut } = useAuth();
  // Seletor por campo: assinar o store inteiro re-renderizava a lista a cada
  // mudança de qualquer parte do estado.
  const filters = useDemandStore((s) => s.filters);
  const demands = useDemandStore((s) => s.demands);
  const isLoading = useDemandStore((s) => s.isLoadingDemands);
  const error = useDemandStore((s) => s.demandsError);
  const fetchDemands = useDemandStore((s) => s.fetchDemands);
  const setFilters = useDemandStore((s) => s.setFilters);

  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchDemands();
  }, [fetchDemands]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchDemands();
    setRefreshing(false);
  }, [fetchDemands]);

  const visibleDemands = useMemo(() => filterDemands(demands, filters), [demands, filters]);

  // Só a primeira carga ocupa a tela: com dados (do cache ou de antes), a
  // atualização acontece por trás, sem esconder a lista.
  if (isLoading && demands.length === 0 && !refreshing) {
    return <LoadingScreen message="Carregando denúncias..." />;
  }

  return (
    <View style={styles.container}>
      <GradientHeader
        title="Denúncias"
        profileLabel={userName ?? 'Usuário'}
        onBack={() => router.replace('/')}
        onLogout={signOut}
      />
      <OfflineBanner />

      <View style={styles.content}>
        <PrimaryButton
          label="Criar nova solicitação"
          onPress={() => router.push('/denuncias/nova')}
          style={styles.createBtn}
        />

        <DemandFiltersPanel filters={filters} onApply={setFilters} />

        {/* Com a lista na tela, o erro vai em cima dela; sem lista, no lugar dela. */}
        {error && demands.length > 0 ? <Text style={styles.error}>{error}</Text> : null}

        <FlatList
          data={visibleDemands}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={AppColors.primary} />
          }
          renderItem={({ item }) => (
            <DemandCard demand={item} onViewDetails={(id) => router.push(`/denuncias/${id}`)} />
          )}
          ListEmptyComponent={
            error ? (
              <ErrorState message={error} onRetry={fetchDemands} retrying={isLoading} />
            ) : !isLoading ? (
              <View style={styles.empty}>
                <Text style={styles.emptyText}>
                  {hasActiveFilters(filters)
                    ? 'Nenhuma denúncia com esses filtros.'
                    : 'Você ainda não registrou denúncias.'}
                </Text>
              </View>
            ) : null
          }
          contentContainerStyle={styles.list}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  createBtn: {
    marginBottom: 16,
  },
  list: {
    paddingBottom: 24,
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
