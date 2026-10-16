import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { GradientHeader } from '@/components/ui/GradientHeader';
import { DemandCard } from '@/components/ui/DemandCard';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { SelectField } from '@/components/ui/SelectField';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { PRIORIDADES, STATUS } from '@/constants/demanda';
import { AppColors } from '@/constants/colors';
import { useGestorDemandaViewModel } from '@/viewmodels/useGestorDemandaViewModel';

export default function GestorDemandaScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    userName,
    demand,
    priorityLabel,
    showLoadingScreen,
    notFoundMessage,
    erro,
    changeStatus,
    changePriority,
    excluida,
    excluindo,
    erroExclusao,
    confirmarExclusao,
    goBack,
    handleLogout,
  } = useGestorDemandaViewModel(id);

  if (excluida) {
    return <LoadingScreen message="Voltando para o painel..." />;
  }

  if (showLoadingScreen) {
    return <LoadingScreen message="Carregando demanda..." />;
  }

  if (!demand) {
    return (
      <View style={styles.container}>
        <GradientHeader
          title="Demanda"
          profileLabel={userName ?? 'Gestor'}
          variant="gestor"
          onBack={goBack}
          onLogout={handleLogout}
        />
        <View style={styles.center}>
          <Text style={styles.notFound}>{notFoundMessage}</Text>
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
        onBack={goBack}
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
            onChange={changeStatus}
          />

          <View style={styles.spacer} />

          <SelectField
            label="Prioridade"
            value={priorityLabel}
            options={[...PRIORIDADES]}
            onChange={changePriority}
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

        <View style={styles.dangerZone}>
          {erroExclusao ? <Text style={styles.error}>{erroExclusao}</Text> : null}
          <PrimaryButton
            label="Excluir demanda"
            onPress={confirmarExclusao}
            loading={excluindo}
            style={styles.deleteBtn}
          />
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
  dangerZone: {
    marginTop: 16,
  },
  deleteBtn: {
    backgroundColor: '#DC2626',
  },
});
