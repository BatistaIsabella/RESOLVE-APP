import React from 'react';
import {
  ImageBackground,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { SenhaRequisitos } from '@/components/ui/SenhaRequisitos';
import { useCadastroViewModel } from '@/viewmodels/useCadastroViewModel';

export default function CadastroScreen() {
  const vm = useCadastroViewModel();

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <ImageBackground
        source={require('../assets/images/cidade.png')}
        style={styles.background}
        resizeMode="cover"
      >
        <LinearGradient
          colors={[
            'rgba(101, 35, 220, 0.78)',
            'rgba(137, 35, 220, 0.72)',
            'rgba(255, 75, 92, 0.70)',
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />

        <Pressable style={styles.voltar} onPress={vm.goBack}>
          <Text style={styles.voltarText}>Voltar</Text>
        </Pressable>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.card}>
            <Text style={styles.title}>Criar conta</Text>

            {vm.erro ? <Text style={styles.errorText}>{vm.erro}</Text> : null}

            <View style={styles.field}>
              <Text style={styles.label}>Nome completo</Text>
              <TextInput
                style={styles.input}
                placeholder="Seu nome completo"
                placeholderTextColor="#9B8AC4"
                autoCapitalize="words"
                value={vm.nome}
                onChangeText={vm.setNome}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="seu@email.com"
                placeholderTextColor="#9B8AC4"
                autoCapitalize="none"
                keyboardType="email-address"
                value={vm.email}
                onChangeText={vm.setEmail}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Senha</Text>
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor="#9B8AC4"
                secureTextEntry
                value={vm.senha}
                onChangeText={vm.setSenha}
              />
              <SenhaRequisitos senha={vm.senha} />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Confirmar senha</Text>
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor="#9B8AC4"
                secureTextEntry
                value={vm.confirmarSenha}
                onChangeText={vm.setConfirmarSenha}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Tipo de usuário:</Text>
              <View style={styles.radioRow}>
                <Pressable
                  style={styles.radioOption}
                  onPress={() => vm.selecionarPapel('cidadao')}
                >
                  <View style={styles.radioCircle}>
                    {vm.papel === 'cidadao' && <View style={styles.radioDot} />}
                  </View>
                  <Text style={styles.radioLabel}>Cidadão</Text>
                </Pressable>

                <Pressable
                  style={styles.radioOption}
                  onPress={() => vm.selecionarPapel('gestor')}
                >
                  <View style={styles.radioCircle}>
                    {vm.papel === 'gestor' && <View style={styles.radioDot} />}
                  </View>
                  <Text style={styles.radioLabel}>Gestor</Text>
                </Pressable>
              </View>
            </View>

            {vm.papel === 'gestor' && (
              <View style={styles.field}>
                <TextInput
                  style={styles.input}
                  placeholder="Código de acesso"
                  placeholderTextColor="#9B8AC4"
                  autoCapitalize="none"
                  value={vm.codigoAcesso}
                  onChangeText={vm.setCodigoAcesso}
                />
              </View>
            )}

            <Pressable style={styles.checkboxRow} onPress={vm.toggleAceiteTermos}>
              <View style={[styles.checkbox, vm.aceiteTermos && styles.checkboxChecked]}>
                {vm.aceiteTermos && <Text style={styles.checkboxMark}>✓</Text>}
              </View>
              <Text style={styles.checkboxLabel}>
                Li e aceito a{' '}
                <Text style={styles.link} onPress={vm.goToPrivacidade}>
                  Política de Privacidade e os Termos de Uso
                </Text>
              </Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.criarButton,
                pressed && styles.buttonPressed,
                vm.isLoading && styles.buttonDisabled,
              ]}
              onPress={vm.handleCadastro}
              disabled={vm.isLoading}
            >
              <Text style={styles.criarButtonText}>
                {vm.isLoading ? 'CRIANDO...' : 'Criar Conta'}
              </Text>
            </Pressable>

            <Text style={styles.helperText}>
              Já tem conta?{' '}
              <Text style={styles.link} onPress={vm.goToLogin}>
                Fazer login
              </Text>
            </Text>
          </View>
        </ScrollView>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#7B2BEF',
  },

  background: {
    flex: 1,
    width: '100%',
    height: '100%',
  },

  voltar: {
    position: 'absolute',
    top: 60,
    left: 24,
    zIndex: 10,
  },

  voltarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },

  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 100,
  },

  /*
   * Card branco com o formulário de cadastro
   */
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 32,
    gap: 16,

    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },

  title: {
    color: '#3D2683',
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
  },

  helperText: {
    color: '#6B7280',
    fontSize: 13,
    textAlign: 'center',
  },

  link: {
    color: '#7B2BEF',
    fontWeight: '700',
  },

  errorText: {
    color: '#DC2626',
    fontSize: 13,
    textAlign: 'center',
  },

  field: {
    gap: 6,
  },

  label: {
    color: '#374151',
    fontSize: 13,
    fontWeight: '600',
  },

  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#C9B8F0',
    borderRadius: 10,
    height: 48,
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#1F2937',
  },

  radioRow: {
    flexDirection: 'row',
    gap: 24,
  },

  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#9B8AC4',
    alignItems: 'center',
    justifyContent: 'center',
  },

  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#7B2BEF',
  },

  radioLabel: {
    color: '#374151',
    fontSize: 14,
  },

  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#9B8AC4',
    alignItems: 'center',
    justifyContent: 'center',
  },

  checkboxChecked: {
    backgroundColor: '#7B2BEF',
    borderColor: '#7B2BEF',
  },

  checkboxMark: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },

  checkboxLabel: {
    flex: 1,
    color: '#374151',
    fontSize: 13,
  },

  criarButton: {
    backgroundColor: '#8628FF',
    borderRadius: 30,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },

  criarButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },

  buttonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },

  buttonDisabled: {
    opacity: 0.6,
  },
});
