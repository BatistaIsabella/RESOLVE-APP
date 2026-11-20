import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { AuthLayout } from '@/components/ui/AuthLayout';
import { FormField } from '@/components/ui/FormField';
import { useAuth } from '@/hooks/useAuth';
import { getPostLoginRoute } from '@/stores/useAuthStore';
import { setRemembered } from '@/lib/secureStorage';
import { getErrorMessage } from '@/lib/api';
import { UserRole } from '@/types/auth';
import { CadastroField, FieldErrors, hasErrors, LIMITES, validateCadastro } from '@/utils/validation';
import { AppColors } from '@/constants/colors';

export default function CadastroScreen() {
  const router = useRouter();
  const { register, isLoading } = useAuth();

  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [papel, setPapel] = useState<UserRole>('cidadao');
  const [codigoAcesso, setCodigoAcesso] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<CadastroField>>({});
  const [erro, setErro] = useState('');

  /** Atualiza o campo e apaga o erro dele: o aviso some assim que o usuário corrige. */
  const bind = (field: CadastroField, setter: (v: string) => void) => (value: string) => {
    setter(value);
    setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleCadastro = async () => {
    setErro('');
    const errors = validateCadastro({ nome, email, senha, confirmarSenha, papel, codigoAcesso });
    setFieldErrors(errors);
    if (hasErrors(errors)) return;

    try {
      setRemembered(true);
      const role = await register(
        nome.trim(),
        email.trim(),
        senha,
        papel,
        papel === 'gestor' ? codigoAcesso.trim() : undefined
      );
      router.replace(getPostLoginRoute(role));
    } catch (err) {
      setErro(getErrorMessage(err, 'Erro ao criar conta.'));
    }
  };

  const selectPapel = (next: UserRole) => {
    setPapel(next);
    if (next === 'cidadao') setCodigoAcesso('');
    setFieldErrors((prev) => ({ ...prev, codigoAcesso: undefined }));
  };

  return (
    <AuthLayout title="Criar conta">
      {erro ? (
        <Text style={styles.errorText} accessibilityRole="alert">
          {erro}
        </Text>
      ) : null}

      <FormField
        label="Nome completo"
        placeholder="Seu nome completo"
        autoCapitalize="words"
        autoComplete="name"
        maxLength={LIMITES.nome}
        value={nome}
        onChangeText={bind('nome', setNome)}
        error={fieldErrors.nome}
        editable={!isLoading}
      />

      <FormField
        label="Email"
        placeholder="seu@email.com"
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
        value={email}
        onChangeText={bind('email', setEmail)}
        error={fieldErrors.email}
        editable={!isLoading}
      />

      <FormField
        label="Senha"
        placeholder={`Mínimo de ${LIMITES.senhaMin} caracteres`}
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
        value={senha}
        onChangeText={bind('senha', setSenha)}
        error={fieldErrors.senha}
        editable={!isLoading}
      />

      <FormField
        label="Confirmar senha"
        placeholder="••••••••"
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
        value={confirmarSenha}
        onChangeText={bind('confirmarSenha', setConfirmarSenha)}
        error={fieldErrors.confirmarSenha}
        editable={!isLoading}
      />

      <View style={styles.field}>
        <Text style={styles.label}>Tipo de usuário:</Text>
        <View style={styles.radioRow} accessibilityRole="radiogroup">
          {(['cidadao', 'gestor'] as const).map((option) => (
            <Pressable
              key={option}
              style={styles.radioOption}
              onPress={() => selectPapel(option)}
              accessibilityRole="radio"
              accessibilityState={{ checked: papel === option }}
            >
              <View style={styles.radioCircle}>{papel === option && <View style={styles.radioDot} />}</View>
              <Text style={styles.radioLabel}>{option === 'cidadao' ? 'Cidadão' : 'Gestor'}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {papel === 'gestor' && (
        <FormField
          placeholder="Código de acesso"
          autoCapitalize="none"
          value={codigoAcesso}
          onChangeText={bind('codigoAcesso', setCodigoAcesso)}
          error={fieldErrors.codigoAcesso}
          editable={!isLoading}
        />
      )}

      <Pressable
        style={({ pressed }) => [
          styles.criarButton,
          pressed && styles.buttonPressed,
          isLoading && styles.buttonDisabled,
        ]}
        onPress={handleCadastro}
        disabled={isLoading}
        accessibilityRole="button"
      >
        <Text style={styles.criarButtonText}>{isLoading ? 'CRIANDO...' : 'Criar Conta'}</Text>
      </Pressable>

      <Text style={styles.helperText}>
        Já tem conta?{' '}
        <Text style={styles.link} onPress={() => router.push('/login')}>
          Fazer login
        </Text>
      </Text>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
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
  field: {
    gap: 6,
  },
  label: {
    color: '#374151',
    fontSize: 13,
    fontWeight: '600',
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
  criarButton: {
    backgroundColor: AppColors.primary,
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
