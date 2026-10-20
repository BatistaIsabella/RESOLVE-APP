import React from 'react';
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { GradientHeader } from '@/components/ui/GradientHeader';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { DemandCard } from '@/components/ui/DemandCard';
import { DemandFiltersPanel } from '@/components/ui/DemandFilters';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { AppColors } from '@/constants/colors';
import { useMinhasDenunciasViewModel } from '@/viewmodels/useMinhasDenunciasViewModel';

export default function DenunciasScreen() {
  const vm = useMinhasDenunciasViewModel();

  if (vm.showLoadingScreen) {
    return <LoadingScreen message="Carregando denúncias..." />;
  }

  return (
    <View style={styles.container}>
      <GradientHeader
        title="Denúncias"
        profileLabel={vm.userName ?? 'Usuário'}
        onBack={vm.goHome}
        onLogout={vm.handleLogout}
        onProfile={vm.goToPerfil}
      />

      <View style={styles.content}>
        <PrimaryButton
          label="Criar nova solicitação"
          onPress={vm.novaDenuncia}
          style={styles.createBtn}
        />

        <DemandFiltersPanel filters={vm.appliedFilters} onApply={vm.applyFilters} />

        {vm.error ? <Text style={styles.error}>{vm.error}</Text> : null}

        <FlatList
          data={vm.visibleDemands}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={vm.refreshing} onRefresh={vm.onRefresh} tintColor={AppColors.primary} />
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
