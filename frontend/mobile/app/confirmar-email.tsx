import React from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { AuthCard, authStyles as s } from '@/components/ui/AuthCard';
import { useConfirmarEmailViewModel } from '@/viewmodels/useConfirmarEmailViewModel';

export default function ConfirmarEmailScreen() {
  const vm = useConfirmarEmailViewModel();

  if (vm.concluido) {
    return (
      <AuthCard title="E-mail confirmado" onBack={vm.irParaLogin}>
        <Text style={s.successText}>Pronto! Sua conta está ativa. Faça login para entrar.</Text>
        <Pressable style={({ pressed }) => [s.button, pressed && s.buttonPressed]} onPress={vm.irParaLogin}>
          <Text style={s.buttonText}>Ir para o login</Text>
        </Pressable>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Confirmar e-mail" onBack={vm.goBack}>
      <Text style={s.helperText}>
        Enviamos um código para o e-mail do cadastro. Informe-o abaixo para ativar a conta.
      </Text>

      {vm.erro ? <Text style={s.errorText}>{vm.erro}</Text> : null}
      {vm.aviso ? <Text style={s.successText}>{vm.aviso}</Text> : null}

      <View style={s.field}>
        <Text style={s.label}>Código recebido por e-mail</Text>
        <TextInput
          style={s.input}
          placeholder="Cole o código aqui"
          placeholderTextColor="#9B8AC4"
          autoCapitalize="none"
          autoCorrect={false}
          value={vm.codigo}
          onChangeText={vm.setCodigo}
        />
      </View>

      <Pressable
        style={({ pressed }) => [s.button, pressed && s.buttonPressed, vm.enviando && s.buttonDisabled]}
        onPress={vm.confirmar}
        disabled={vm.enviando}
      >
        <Text style={s.buttonText}>{vm.enviando ? 'CONFIRMANDO...' : 'Confirmar e-mail'}</Text>
      </Pressable>

      {vm.pedeEmail ? (
        <View style={s.field}>
          <Text style={s.label}>E-mail do cadastro</Text>
          <TextInput
            style={s.input}
            placeholder="seu@email.com"
            placeholderTextColor="#9B8AC4"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            value={vm.email}
            onChangeText={vm.setEmail}
          />
        </View>
      ) : null}

      <Pressable onPress={vm.reenviar} disabled={vm.reenviando}>
        <Text style={[s.helperText, s.link]}>{vm.reenviando ? 'Enviando...' : 'Não recebeu? Reenviar o código'}</Text>
      </Pressable>

      <Text style={s.helperText}>O código vale por 24 horas e só pode ser usado uma vez.</Text>
    </AuthCard>
  );
}
