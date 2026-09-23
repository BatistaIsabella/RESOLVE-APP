import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { GradientHeader } from '@/components/ui/GradientHeader';
import { DemandCard } from '@/components/ui/DemandCard';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { SelectField } from '@/components/ui/SelectField';
import { useAuth } from '@/hooks/useAuth';
import { useDemandStore } from '@/stores/useDemandStore';
import { Demand, DemandPriority, DemandStatus } from '@/types/demand';
import { PRIORIDADES, STATUS } from '@/constants/demanda';
import { formatPriorityLabel } from '@/utils/demandMapper';
import { ApiError } from '@/lib/api';
import { AppColors } from '@/constants/colors';

export default function GestorDemandaScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { userName, logout } = useAuth();

  const fetchDemandById = useDemandStore((s) => s.fetchDemandById);
  const updateDemandStatus = useDemandStore((s) => s.updateDemandStatus);
  const updateDemandPriority = useDemandStore((s) => s.updateDemandPriority);
  const isLoading = useDemandStore((s) => s.isLoading);
  const storeError = useDemandStore((s) => s.error);

  const [demand, setDemand] = useState<Demand | null>(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    if (id) {
      fetchDemandById(id).then(setDemand);
    }
  }, [id, fetchDemandById]);

  const handleStatusChange = async (value: string) => {
    if (!id || !demand || value === demand.status) return;
    const status = value as DemandStatus;
    const anterior = demand;
    setErro('');
    setDemand({ ...demand, status });
    try {
      await updateDemandStatus(id, status);
      setDemand(await fetchDemandById(id));
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : 'Erro ao atualizar status');
      setDemand(anterior);
    }
  };

  const handlePriorityChange = async (value: string) => {
    if (!id || !demand) return;
    const priority = (value === 'Média' ? 'Media' : value) as DemandPriority;
    if (priority === demand.priority) return;
    const anterior = demand;
    setErro('');
    setDemand({ ...demand, priority });
    try {
      await updateDemandPriority(id, priority);
      setDemand(await fetchDemandById(id));
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : 'Erro ao atualizar prioridade');
      setDemand(anterior);
    }
  };

  const handleLogout = () => {
    logout();
    router.replace('/');
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
          onLogout={handleLogout}
        />
        <View style={styles.center}>
          <Text style={styles.notFound}>{storeError ?? 'Demanda não encontrada.'}</Text>
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
        onLogout={handleLogout}
      />

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
          />

          <View style={styles.spacer} />

          <SelectField
            label="Prioridade"
            value={formatPriorityLabel(demand.priority)}
            options={[...PRIORIDADES]}
            onChange={handlePriorityChange}
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
    backgroundColor: '#F9FAFB',
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
    color: '#DC2626',
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
