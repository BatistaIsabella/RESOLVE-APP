import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { GradientHeader } from '@/components/ui/GradientHeader';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { DemandCard } from '@/components/ui/DemandCard';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { ErrorState } from '@/components/ui/ErrorState';
import { SelectField } from '@/components/ui/SelectField';
import { useAuth } from '@/hooks/useAuth';
import { useDemandDetail } from '@/hooks/useDemandDetail';
import { useDemandStore } from '@/stores/useDemandStore';
import { DemandStatus } from '@/types/demand';
import { PRIORIDADES, STATUS } from '@/constants/demanda';
import { formatPriorityLabel, parsePriorityLabel } from '@/utils/demandMapper';
import { getErrorMessage } from '@/lib/api';
import { AppColors } from '@/constants/colors';

export default function GestorDemandaScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { userName, signOut } = useAuth();

  // O otimismo e o rollback das alterações vivem no store, não aqui.
  const { demand, isLoading, error, reload } = useDemandDetail(id);
  const updateDemandStatus = useDemandStore((s) => s.updateDemandStatus);
  const updateDemandPriority = useDemandStore((s) => s.updateDemandPriority);
  const isSaving = useDemandStore((s) => s.isSaving);
  const [erro, setErro] = useState('');

  const handleStatusChange = async (value: string) => {
    if (!id || !demand || value === demand.status) return;
    setErro('');
    try {
      await updateDemandStatus(id, value as DemandStatus);
    } catch (err) {
      setErro(getErrorMessage(err, 'Erro ao atualizar status.'));
    }
  };

  const handlePriorityChange = async (value: string) => {
    if (!id || !demand) return;
    const priority = parsePriorityLabel(value);
    if (priority === demand.priority) return;
    setErro('');
    try {
      await updateDemandPriority(id, priority);
    } catch (err) {
      setErro(getErrorMessage(err, 'Erro ao atualizar prioridade.'));
    }
  };


  if (isLoading && !demand) {
    return <LoadingScreen message="Carregando demanda..." />;
  }

  if (!demand) {
    return (
      <View style={styles.container}>
        <GradientHeader
          title="Demanda"
          profileLabel={userName ?? 'Gestor'}
          variant="gestor"
          onBack={() => router.back()}
          onLogout={signOut}
        />
        <View style={styles.center}>
          {error ? (
            <ErrorState message={error} onRetry={reload} retrying={isLoading} />
          ) : (
            <Text style={styles.notFound}>Demanda não encontrada.</Text>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <GradientHeader
        title="Gerenciar"
        profileLabel={userName ?? 'Gestor'}
        variant="gestor"
        onBack={() => router.back()}
        onLogout={signOut}
      />
      <OfflineBanner />

      <ScrollView contentContainerStyle={styles.content}>
        <DemandCard demand={demand} onViewDetails={() => {}} showImage />

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Gerenciamento</Text>

          {erro ? <Text style={styles.error}>{erro}</Text> : null}

          <SelectField
            label="Status"
            value={demand.status}
            options={[...STATUS]}
            onChange={handleStatusChange}
            disabled={isSaving}
          />

          <View style={styles.spacer} />

          <SelectField
            label="Prioridade"
            value={formatPriorityLabel(demand.priority)}
            options={[...PRIORIDADES]}
            onChange={handlePriorityChange}
            disabled={isSaving}
          />
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoLabel}>Solicitante</Text>
          <Text style={styles.infoValue}>{demand.solicitante || 'Não informado'}</Text>
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
  panel: {
    backgroundColor: AppColors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: AppColors.border,
    padding: 16,
    marginBottom: 16,
  },
  panelTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: AppColors.text,
    marginBottom: 12,
  },
  spacer: {
    height: 12,
  },
  error: {
    color: AppColors.danger,
    fontSize: 13,
    marginBottom: 10,
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
