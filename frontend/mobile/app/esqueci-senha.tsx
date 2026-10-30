import React from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { AuthCard, authStyles as s } from '@/components/ui/AuthCard';
import { useEsqueciSenhaViewModel } from '@/viewmodels/useRecuperacaoSenhaViewModel';

export default function EsqueciSenhaScreen() {
  const vm = useEsqueciSenhaViewModel();

  return (
    <AuthCard title="Esqueci minha senha" onBack={vm.goBack}>
      <Text style={s.helperText}>
        Informe o e-mail da sua conta. Se ele estiver cadastrado, enviaremos um código para você criar uma nova senha.
      </Text>

      {vm.erro ? <Text style={s.errorText}>{vm.erro}</Text> : null}
      {vm.mensagem ? <Text style={s.successText}>{vm.mensagem}</Text> : null}

      <View style={s.field}>
        <Text style={s.label}>Email</Text>
        <TextInput
          style={s.input}
          placeholder="seu@email.com"
          placeholderTextColor="#9B8AC4"
          autoCapitalize="none"
          keyboardType="email-address"
          value={vm.email}
          onChangeText={vm.setEmail}
        />
      </View>

      <Pressable
        style={({ pressed }) => [s.button, pressed && s.buttonPressed, vm.enviando && s.buttonDisabled]}
        onPress={vm.enviar}
        disabled={vm.enviando}
      >
        <Text style={s.buttonText}>{vm.enviando ? 'ENVIANDO...' : 'Enviar código'}</Text>
      </Pressable>

      <Text style={s.helperText}>
        Já recebeu o código?{' '}
        <Text style={s.link} onPress={vm.irParaRedefinir}>
          Redefinir senha
        </Text>
      </Text>
    </AuthCard>
  );
}
