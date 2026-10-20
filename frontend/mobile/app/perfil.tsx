import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { AuthGuard } from '@/components/AuthGuard';
import { GradientHeader } from '@/components/ui/GradientHeader';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { SenhaRequisitos } from '@/components/ui/SenhaRequisitos';
import { AppColors } from '@/constants/colors';
import { CONTATO_PRIVACIDADE } from '@/constants/termos';
import { useAuth } from '@/hooks/useAuth';
import { usePerfilViewModel } from '@/viewmodels/usePerfilViewModel';

const ROTULO_PAPEL = { cidadao: 'Cidadão', gestor: 'Gestor' } as const;

function Cartao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <View style={styles.cartao}>
      <Text style={styles.cartaoTitulo}>{titulo}</Text>
      {children}
    </View>
  );
}

function Campo({ rotulo, ...props }: { rotulo: string } & React.ComponentProps<typeof TextInput>) {
  return (
    <View style={styles.campo}>
      <Text style={styles.rotulo}>{rotulo}</Text>
      <TextInput style={styles.input} placeholderTextColor="#9B8AC4" autoCapitalize="none" {...props} />
    </View>
  );
}

function Aviso({ erro, ok }: { erro?: string; ok?: string }) {
  if (erro) return <Text style={styles.erro}>{erro}</Text>;
  if (ok) return <Text style={styles.sucesso}>{ok}</Text>;
  return null;
}

function PerfilConteudo() {
  const vm = usePerfilViewModel();
  const { role } = useAuth();

  return (
    <View style={styles.container}>
      <GradientHeader
        title="Meus dados"
        profileLabel={vm.conta ? ROTULO_PAPEL[vm.conta.papel] : ''}
        variant={role === 'gestor' ? 'gestor' : 'default'}
        onBack={vm.goBack}
        onLogout={vm.sair}
      />

      <ScrollView contentContainerStyle={styles.conteudo} keyboardShouldPersistTaps="handled">
        {vm.carregando ? <ActivityIndicator color={AppColors.primary} /> : null}
        {vm.erroCarga ? <Text style={styles.erro}>{vm.erroCarga}</Text> : null}

        {vm.conta ? (
          <>
            <Cartao titulo="Dados da conta">
              <Campo rotulo="Nome" value={vm.nome} onChangeText={vm.setNome} autoCapitalize="words" />
              <Campo
                rotulo="E-mail"
                value={vm.email}
                onChangeText={vm.setEmail}
                keyboardType="email-address"
              />
              <Text style={styles.detalhe}>
                Tipo de conta: {ROTULO_PAPEL[vm.conta.papel]}
                {vm.conta.orgao ? ` • Órgão: ${vm.conta.orgao.replace(/_/g, ' ').toLowerCase()}` : ''}
              </Text>
              <Aviso erro={vm.erroDados} ok={vm.mensagemDados} />
              <PrimaryButton label="Salvar alterações" onPress={vm.salvarDados} loading={vm.salvandoDados} />
            </Cartao>

            <Cartao titulo="Alterar senha">
              <Campo rotulo="Senha atual" value={vm.senhaAtual} onChangeText={vm.setSenhaAtual} secureTextEntry />
              <Campo rotulo="Nova senha" value={vm.novaSenha} onChangeText={vm.setNovaSenha} secureTextEntry />
              <SenhaRequisitos senha={vm.novaSenha} />
              <Campo
                rotulo="Confirmar nova senha"
                value={vm.confirmarSenha}
                onChangeText={vm.setConfirmarSenha}
                secureTextEntry
              />
              <Aviso erro={vm.erroSenha} ok={vm.mensagemSenha} />
              <PrimaryButton label="Alterar senha" onPress={vm.alterarSenha} loading={vm.salvandoSenha} />
            </Cartao>

            <Cartao titulo="Privacidade">
              <Text style={styles.texto}>
                Você pode pedir uma cópia dos seus dados, ler a política de privacidade ou excluir a conta. Outros
                pedidos (bloqueio, anonimização ou informação sobre compartilhamento): {CONTATO_PRIVACIDADE}.
              </Text>
              <Aviso erro={vm.erroExportacao} />
              <PrimaryButton label="Exportar meus dados" onPress={vm.exportarDados} loading={vm.exportando} />
              <Pressable onPress={vm.abrirPrivacidade} hitSlop={8}>
                <Text style={styles.link}>Ler Política de Privacidade e Termos de Uso</Text>
              </Pressable>
            </Cartao>

            <Cartao titulo="Excluir conta">
              <Text style={styles.texto}>
                Apaga o seu e-mail e as suas fotos e remove a ligação das ocorrências com você. As ocorrências ficam
                guardadas pelo prazo legal de retenção, sem identificar quem as registrou.
              </Text>
              {vm.confirmandoExclusao ? (
                <>
                  <Campo
                    rotulo="Digite sua senha para confirmar"
                    value={vm.senhaExclusao}
                    onChangeText={vm.setSenhaExclusao}
                    secureTextEntry
                  />
                  <Aviso erro={vm.erroExclusao} />
                  <Pressable
                    style={[styles.botaoPerigo, vm.excluindo && styles.desabilitado]}
                    onPress={vm.confirmarExclusao}
                    disabled={vm.excluindo}
                  >
                    <Text style={styles.botaoPerigoTexto}>{vm.excluindo ? 'Excluindo...' : 'Excluir definitivamente'}</Text>
                  </Pressable>
                  <Pressable onPress={vm.cancelarExclusao} hitSlop={8}>
                    <Text style={styles.link}>Cancelar</Text>
                  </Pressable>
                </>
              ) : (
                <Pressable style={styles.botaoPerigoContorno} onPress={vm.pedirExclusao}>
                  <Text style={styles.botaoPerigoContornoTexto}>Excluir minha conta</Text>
                </Pressable>
              )}
            </Cartao>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

export default function PerfilScreen() {
  return (
    <AuthGuard>
      <PerfilConteudo />
    </AuthGuard>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  conteudo: { padding: 16, gap: 16, paddingBottom: 48 },
  cartao: { backgroundColor: AppColors.cardBg, borderRadius: 16, padding: 16, gap: 12 },
  cartaoTitulo: { color: '#3D2683', fontSize: 17, fontWeight: '800' },
  campo: { gap: 6 },
  rotulo: { color: '#374151', fontSize: 13, fontWeight: '600' },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#C9B8F0',
    borderRadius: 10,
    height: 46,
    paddingHorizontal: 14,
    fontSize: 15,
    color: AppColors.text,
  },
  detalhe: { color: AppColors.textMuted, fontSize: 12 },
  texto: { color: AppColors.text, fontSize: 13, lineHeight: 19 },
  link: { color: AppColors.primaryDark, fontSize: 14, fontWeight: '700', textAlign: 'center' },
  erro: { color: '#DC2626', fontSize: 13 },
  sucesso: { color: '#15803D', fontSize: 13 },
  botaoPerigo: { backgroundColor: '#DC2626', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  botaoPerigoTexto: { color: AppColors.white, fontSize: 16, fontWeight: '700' },
  botaoPerigoContorno: {
    borderWidth: 1.5,
    borderColor: '#DC2626',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  botaoPerigoContornoTexto: { color: '#DC2626', fontSize: 15, fontWeight: '700' },
  desabilitado: { opacity: 0.6 },
});
