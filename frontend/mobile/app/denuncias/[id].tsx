import React, { useEffect } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { GradientHeader } from '@/components/ui/GradientHeader';
import { DemandCard } from '@/components/ui/DemandCard';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { useAuth } from '@/hooks/useAuth';
import { useDemandStore } from '@/stores/useDemandStore';
import { AppColors } from '@/constants/colors';
import { useExcluirDenuncia } from '@/viewmodels/useExcluirDenuncia';

export default function DenunciaDetalhesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { userName, logout } = useAuth();
  const fetchDemandById = useDemandStore((s) => s.fetchDemandById);
  const isLoading = useDemandStore((s) => s.loadingDetail);
  const error = useDemandStore((s) => s.detailError);

  // Lida do store: nada de copia local, para a tela nao divergir da lista.
  const demand = useDemandStore((s) => s.demands.find((d) => d.id === id) ?? null);
  const { confirmarExclusao, excluindo, excluida, erroExclusao } = useExcluirDenuncia(
    id,
    '/denuncias'
  );

  useEffect(() => {
    if (id) {
      fetchDemandById(id);
    }
  }, [id, fetchDemandById]);

  const handleLogout = () => {
    logout();
    router.replace('/');
  };

  if (excluida) {
    return <LoadingScreen message="Voltando para a lista..." />;
  }

  if (isLoading && !demand) {
    return <LoadingScreen message="Carregando detalhes..." />;
  }

  // A API só aceita editar/excluir enquanto ninguém começou a analisar.
  const podeAlterar = demand?.status === 'Aberta';

  if (!demand) {
    return (
      <View style={styles.container}>
        <GradientHeader
          title="Detalhes"
          profileLabel={userName ?? 'Usuário'}
          onBack={() => router.back()}
          onLogout={handleLogout}
        />
        <View style={styles.center}>
          <Text style={styles.notFound}>{error ?? 'Denúncia não encontrada.'}</Text>
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
        onLogout={handleLogout}
      />
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

        {podeAlterar ? (
          <View style={styles.actions}>
            {erroExclusao ? <Text style={styles.error}>{erroExclusao}</Text> : null}
            <View style={styles.actionsRow}>
              <PrimaryButton
                label="Editar"
                onPress={() => router.push(`/denuncias/editar/${demand.id}`)}
                disabled={excluindo}
                style={styles.actionBtn}
              />
              <PrimaryButton
                label="Excluir"
                onPress={confirmarExclusao}
                loading={excluindo}
                style={{ ...styles.actionBtn, ...styles.deleteBtn }}
              />
            </View>
          </View>
        ) : (
          <Text style={styles.lockedHint}>
            Denúncias em análise ou resolvidas não podem ser editadas nem excluídas.
          </Text>
        )}
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
  actions: {
    marginTop: 16,
    gap: 8,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtn: {
    flex: 1,
  },
  deleteBtn: {
    backgroundColor: '#DC2626',
  },
  error: {
    color: '#DC2626',
    fontSize: 13,
    textAlign: 'center',
  },
  lockedHint: {
    marginTop: 16,
    color: AppColors.textMuted,
    fontSize: 13,
    textAlign: 'center',
  },
});
