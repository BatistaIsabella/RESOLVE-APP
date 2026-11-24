import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useDemandContext } from '@/contexts/DemandContext';
import { formatarDataSincronizacao } from '@/utils/dataSincronizacao';

// Aviso de que a tela mostra a cópia salva no aparelho porque a API não respondeu.
// Some sozinho na próxima busca que der certo.
export function OfflineBanner() {
  const isOffline = useDemandContext((s) => s.isOffline);
  const lastSyncedAt = useDemandContext((s) => s.lastSyncedAt);

  if (!isOffline) return null;

  // Data inválida ou inconsistente cai na mensagem sem data.
  const dataSalva = formatarDataSincronizacao(lastSyncedAt);

  return (
    <View style={styles.banner} accessibilityRole="alert">
      <Text style={styles.title}>Sem conexão</Text>
      <Text style={styles.text}>
        {dataSalva
          ? `Exibindo dados salvos em ${dataSalva}.`
          : 'Exibindo os últimos dados salvos.'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginHorizontal: 16,
    marginTop: 8,
  },
  title: {
    color: '#92400E',
    fontWeight: '700',
    fontSize: 13,
  },
  text: {
    color: '#92400E',
    fontSize: 12,
    marginTop: 2,
  },
});
