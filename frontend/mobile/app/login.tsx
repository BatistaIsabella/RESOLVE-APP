import React, { useState } from 'react';
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
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/useAuthStore';
import { setRemembered } from '@/lib/secureStorage';
import { ApiError } from '@/lib/api';

export default function LoginScreen() {
  const router = useRouter();
  const login = useAuthStore((state) => state.login);
  const isLoading = useAuthStore((state) => state.isLoading);

  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [manterConectado, setManterConectado] = useState(true);
  const [erro, setErro] = useState('');

  const handleLogin = async () => {
    setErro('');
    try {
      setRemembered(manterConectado);
      await login(email, senha);
      router.replace('/');
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : 'Erro ao fazer login');
    }
  };

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

        <Pressable style={styles.voltar} onPress={() => router.back()}>
          <Text style={styles.voltarText}>Voltar</Text>
        </Pressable>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.card}>
            <Text style={styles.title}>Smart City</Text>

            <View style={styles.ssoButtons}>
              <Pressable
                style={({ pressed }) => [
                  styles.ssoButton,
                  pressed && styles.buttonPressed,
                ]}
                disabled
              >
                <Text style={styles.ssoButtonText}>
                  Entrar com Certificado Digital
                </Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.ssoButton,
                  pressed && styles.buttonPressed,
                ]}
                disabled
              >
                <Text style={styles.ssoButtonText}>Entrar com gov.br</Text>
              </Pressable>
            </View>

            <Text style={styles.helperText}>
              Faça login em sua conta. Ou{' '}
              <Text
                style={styles.link}
                onPress={() => router.push('/cadastro')}
              >
                Cadastrar-se
              </Text>
            </Text>

            {erro ? <Text style={styles.errorText}>{erro}</Text> : null}

            <View style={styles.field}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="seu@email.com"
                placeholderTextColor="#9B8AC4"
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Senha</Text>
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor="#9B8AC4"
                secureTextEntry
                value={senha}
                onChangeText={setSenha}
              />
            </View>

            <Pressable
              style={styles.checkboxRow}
              onPress={() => setManterConectado((v) => !v)}
            >
              <View
                style={[
                  styles.checkbox,
                  manterConectado && styles.checkboxChecked,
                ]}
              >
                {manterConectado && <Text style={styles.checkboxMark}>✓</Text>}
              </View>
              <Text style={styles.checkboxLabel}>Mantenha-me conectado</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.enterButton,
                pressed && styles.buttonPressed,
                isLoading && styles.buttonDisabled,
              ]}
              onPress={handleLogin}
              disabled={isLoading}
            >
              <Text style={styles.enterButtonText}>
                {isLoading ? 'ENTRANDO...' : 'ENTRAR'}
              </Text>
            </Pressable>
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
   * Card branco com o formulário de login
   */
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 32,
    gap: 20,

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

  ssoButtons: {
    gap: 12,
  },

  ssoButton: {
    backgroundColor: '#3D2683',
    borderRadius: 10,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },

  ssoButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
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
    color: '#374151',
    fontSize: 13,
  },

  enterButton: {
    backgroundColor: '#8628FF',
    borderRadius: 30,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },

  enterButtonText: {
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
