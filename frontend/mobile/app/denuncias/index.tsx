import React, { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { GradientHeader } from '@/components/ui/GradientHeader';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { DemandCard } from '@/components/ui/DemandCard';
import { DemandFiltersPanel } from '@/components/ui/DemandFilters';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { useAuth } from '@/hooks/useAuth';
import { useDemandStore } from '@/stores/useDemandStore';
import { DemandFilters } from '@/types/demand';
import { AppColors } from '@/constants/colors';

export default function DenunciasScreen() {
  const router = useRouter();
  const { userName, logout } = useAuth();
  const {
    filters,
    isLoading,
    error,
    fetchDemands,
    setFilters,
    getFilteredDemands,
  } = useDemandStore();

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
    await fetchDemands();
    setRefreshing(false);
  };

  const handleApplyFilters = (next: DemandFilters) => {
    setAppliedFilters(next);
    setFilters(next);
  };

  const demands = getFilteredDemands();

  const handleLogout = () => {
    logout();
    router.replace('/');
  };

  if (isLoading && demands.length === 0 && !refreshing) {
    return <LoadingScreen message="Carregando denúncias..." />;
  }

  return (
    <View style={styles.container}>
      <GradientHeader
        title="Denúncias"
        profileLabel={userName ?? 'Usuário'}
        onBack={() => router.replace('/')}
        onLogout={handleLogout}
      />

      <View style={styles.content}>
        <PrimaryButton
          label="Criar nova solicitação"
          onPress={() => router.push('/denuncias/nova')}
          style={styles.createBtn}
        />

        <DemandFiltersPanel filters={appliedFilters} onApply={handleApplyFilters} />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <FlatList
          data={demands}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={AppColors.primary} />
          }
          renderItem={({ item }) => (
            <DemandCard demand={item} onViewDetails={(id) => router.push(`/denuncias/${id}`)} />
          )}
          ListEmptyComponent={
            !isLoading ? (
              <View style={styles.empty}>
                <Text style={styles.emptyText}>Nenhuma denúncia encontrada.</Text>
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
    backgroundColor: '#F9FAFB',
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
