import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppColors } from '@/constants/colors';
import { POLITICA_PRIVACIDADE, SecaoTexto, TERMOS_DE_USO, VERSAO_TERMOS } from '@/constants/termos';

function Bloco({ titulo, secoes }: { titulo: string; secoes: SecaoTexto[] }) {
  return (
    <View style={styles.bloco}>
      <Text style={styles.blocoTitulo}>{titulo}</Text>
      {secoes.map((secao) => (
        <View key={secao.titulo} style={styles.secao}>
          <Text style={styles.secaoTitulo}>{secao.titulo}</Text>
          {secao.paragrafos.map((p) => (
            <Text key={p} style={styles.paragrafo}>
              {p}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
}

// Tela pública: precisa abrir antes do cadastro, para a pessoa ler antes de aceitar.
export default function PrivacidadeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} hitSlop={12}>
          <Text style={styles.voltar}>Voltar</Text>
        </Pressable>
        <Text style={styles.headerTitulo}>Privacidade e termos</Text>
        <View style={styles.espaco} />
      </View>

      <ScrollView contentContainerStyle={styles.conteudo}>
        <Text style={styles.versao}>Versão {VERSAO_TERMOS}</Text>
        <Bloco titulo="Política de Privacidade" secoes={POLITICA_PRIVACIDADE} />
        <Bloco titulo="Termos de Uso" secoes={TERMOS_DE_USO} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  header: {
    backgroundColor: AppColors.gradientStart,
    paddingHorizontal: 20,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  voltar: { color: AppColors.white, fontSize: 15, fontWeight: '600' },
  headerTitulo: { color: AppColors.white, fontSize: 17, fontWeight: '700' },
  espaco: { width: 48 },
  conteudo: { padding: 20, gap: 24 },
  versao: { color: AppColors.textMuted, fontSize: 12, textAlign: 'center' },
  bloco: { gap: 12 },
  blocoTitulo: { color: '#3D2683', fontSize: 22, fontWeight: '800' },
  secao: {
    backgroundColor: AppColors.cardBg,
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  secaoTitulo: { color: AppColors.text, fontSize: 15, fontWeight: '700' },
  paragrafo: { color: AppColors.text, fontSize: 14, lineHeight: 20 },
});
