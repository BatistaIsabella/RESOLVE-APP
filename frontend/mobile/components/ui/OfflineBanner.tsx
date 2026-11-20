import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useDemandContext } from '@/contexts/DemandContext';

function formatarData(iso: string): string {
  const data = new Date(iso);
  const dia = data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  const hora = data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return `${dia} às ${hora}`;
}

// Aviso de que a tela mostra a cópia salva no aparelho porque a API não respondeu.
// Some sozinho na próxima busca que der certo.
export function OfflineBanner() {
  const isOffline = useDemandContext((s) => s.isOffline);
  const lastSyncedAt = useDemandContext((s) => s.lastSyncedAt);

  if (!isOffline) return null;

  return (
    <View style={styles.banner} accessibilityRole="alert">
      <Text style={styles.title}>Sem conexão</Text>
      <Text style={styles.text}>
        {lastSyncedAt
          ? `Exibindo dados salvos em ${formatarData(lastSyncedAt)}.`
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
