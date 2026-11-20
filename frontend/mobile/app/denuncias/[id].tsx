import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { GradientHeader } from '@/components/ui/GradientHeader';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { DemandCard } from '@/components/ui/DemandCard';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { ErrorState } from '@/components/ui/ErrorState';
import { useAuth } from '@/hooks/useAuth';
import { useDemandDetail } from '@/hooks/useDemandDetail';
import { AppColors } from '@/constants/colors';

export default function DenunciaDetalhesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { userName, signOut } = useAuth();
  const { demand, isLoading, error, reload } = useDemandDetail(id);


  if (isLoading && !demand) {
    return <LoadingScreen message="Carregando detalhes..." />;
  }

  if (!demand) {
    return (
      <View style={styles.container}>
        <GradientHeader
          title="Detalhes"
          profileLabel={userName ?? 'Usuário'}
          onBack={() => router.back()}
          onLogout={signOut}
        />
        <View style={styles.center}>
          {error ? (
            <ErrorState message={error} onRetry={reload} retrying={isLoading} />
          ) : (
            <Text style={styles.notFound}>Denúncia não encontrada.</Text>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <GradientHeader
        title="Detalhes"
        profileLabel={userName ?? 'Usuário'}
        onBack={() => router.back()}
        onLogout={signOut}
      />
      <OfflineBanner />
      <ScrollView contentContainerStyle={styles.content}>
        <DemandCard demand={demand} onViewDetails={() => {}} showImage />
        <View style={styles.infoBox}>
          <Text style={styles.infoLabel}>Região</Text>
          <Text style={styles.infoValue}>{demand.region}</Text>
          <Text style={styles.infoLabel}>Endereço</Text>
          <Text style={styles.infoValue}>{demand.endereco}</Text>
          <Text style={styles.infoLabel}>Registrado em</Text>
          <Text style={styles.infoValue}>{demand.dataRegistro}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  notFound: {
    color: AppColors.textMuted,
    fontSize: 16,
    textAlign: 'center',
  },
  infoBox: {
    backgroundColor: AppColors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: AppColors.border,
    padding: 16,
    gap: 4,
  },
  infoLabel: {
    fontSize: 12,
    color: AppColors.textMuted,
    fontWeight: '600',
    marginTop: 8,
  },
  infoValue: {
    fontSize: 14,
    color: AppColors.text,
  },
});
