import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { AuthLayout } from '@/components/ui/AuthLayout';
import { FormField } from '@/components/ui/FormField';
import { useAuth } from '@/hooks/useAuth';
import { getPostLoginRoute } from '@/stores/useAuthStore';
import { setRemembered } from '@/lib/secureStorage';
import { getErrorMessage } from '@/lib/api';
import { FieldErrors, hasErrors, validateLogin } from '@/utils/validation';
import { AppColors } from '@/constants/colors';

type LoginField = 'email' | 'senha';

export default function LoginScreen() {
  const router = useRouter();
  const { login, isLoading } = useAuth();

  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [manterConectado, setManterConectado] = useState(true);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<LoginField>>({});
  const [erro, setErro] = useState('');

  const clearError = (field: LoginField) => setFieldErrors((prev) => ({ ...prev, [field]: undefined }));

  const handleLogin = async () => {
    setErro('');
    const errors = validateLogin({ email, senha });
    setFieldErrors(errors);
    if (hasErrors(errors)) return;

    try {
      setRemembered(manterConectado);
      const role = await login(email.trim(), senha);
      router.replace(getPostLoginRoute(role));
    } catch (err) {
      setErro(getErrorMessage(err, 'Erro ao fazer login.'));
    }
  };

  return (
    <AuthLayout title="Smart City">
      <View style={styles.ssoButtons}>
        <Pressable style={styles.ssoButton} disabled>
          <Text style={styles.ssoButtonText}>Entrar com Certificado Digital</Text>
        </Pressable>
        <Pressable style={styles.ssoButton} disabled>
          <Text style={styles.ssoButtonText}>Entrar com gov.br</Text>
        </Pressable>
      </View>

      <Text style={styles.helperText}>
        Faça login em sua conta. Ou{' '}
        <Text style={styles.link} onPress={() => router.push('/cadastro')}>
          Cadastrar-se
        </Text>
      </Text>

      {erro ? (
        <Text style={styles.errorText} accessibilityRole="alert">
          {erro}
        </Text>
      ) : null}

      <FormField
        label="Email"
        placeholder="seu@email.com"
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
        value={email}
        onChangeText={(v) => {
          setEmail(v);
          clearError('email');
        }}
        error={fieldErrors.email}
        editable={!isLoading}
      />

      <FormField
        label="Senha"
        placeholder="••••••••"
        secureTextEntry
        autoComplete="password"
        textContentType="password"
        value={senha}
        onChangeText={(v) => {
          setSenha(v);
          clearError('senha');
        }}
        error={fieldErrors.senha}
        editable={!isLoading}
        returnKeyType="go"
        onSubmitEditing={handleLogin}
      />

      <Pressable
        style={styles.checkboxRow}
        onPress={() => setManterConectado((v) => !v)}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: manterConectado }}
      >
        <View style={[styles.checkbox, manterConectado && styles.checkboxChecked]}>
          {manterConectado && <Text style={styles.checkboxMark}>✓</Text>}
        </View>
        <Text style={styles.checkboxLabel}>Mantenha-me conectado</Text>
      </Pressable>

      <Pressable
        style={({ pressed }) => [
          styles.enterButton,
          pressed && styles.buttonPressed,
          isLoading && styles.disabled,
        ]}
        onPress={handleLogin}
        disabled={isLoading}
        accessibilityRole="button"
      >
        <Text style={styles.enterButtonText}>{isLoading ? 'ENTRANDO...' : 'ENTRAR'}</Text>
      </Pressable>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
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
    color: AppColors.textMuted,
    fontSize: 13,
    textAlign: 'center',
  },
  link: {
    color: '#7B2BEF',
    fontWeight: '700',
  },
  errorText: {
    color: AppColors.danger,
    fontSize: 13,
    textAlign: 'center',
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
    backgroundColor: AppColors.primary,
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
  disabled: {
    opacity: 0.6,
  },
});
