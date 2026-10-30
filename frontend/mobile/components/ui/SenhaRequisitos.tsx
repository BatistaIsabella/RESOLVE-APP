import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { REQUISITOS_SENHA } from '@/utils/senha';

// Lista que vai ficando marcada conforme a senha digitada cumpre cada regra.
export function SenhaRequisitos({ senha }: { senha: string }) {
  return (
    <View style={styles.lista}>
      {REQUISITOS_SENHA.map((requisito) => {
        const ok = requisito.atendido(senha);
        return (
          <Text key={requisito.id} style={[styles.item, ok && styles.itemOk]}>
            {ok ? '✓' : '•'} {requisito.texto}
          </Text>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  lista: { gap: 2 },
  item: { color: '#6B7280', fontSize: 12 },
  itemOk: { color: '#15803D' },
});
