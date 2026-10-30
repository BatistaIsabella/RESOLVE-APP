import React from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { AuthCard, authStyles as s } from '@/components/ui/AuthCard';
import { SenhaRequisitos } from '@/components/ui/SenhaRequisitos';
import { useRedefinirSenhaViewModel } from '@/viewmodels/useRecuperacaoSenhaViewModel';

export default function RedefinirSenhaScreen() {
  const vm = useRedefinirSenhaViewModel();

  if (vm.concluido) {
    return (
      <AuthCard title="Senha redefinida" onBack={vm.irParaLogin}>
        <Text style={s.successText}>Pronto! Sua senha foi alterada. Faça login com a nova senha.</Text>
        <Pressable style={({ pressed }) => [s.button, pressed && s.buttonPressed]} onPress={vm.irParaLogin}>
          <Text style={s.buttonText}>Ir para o login</Text>
        </Pressable>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Redefinir senha" onBack={vm.goBack}>
      {vm.erro ? <Text style={s.errorText}>{vm.erro}</Text> : null}

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

      <View style={s.field}>
        <Text style={s.label}>Nova senha</Text>
        <TextInput
          style={s.input}
          placeholder="••••••••••••"
          placeholderTextColor="#9B8AC4"
          secureTextEntry
          value={vm.novaSenha}
          onChangeText={vm.setNovaSenha}
        />
        <SenhaRequisitos senha={vm.novaSenha} />
      </View>

      <View style={s.field}>
        <Text style={s.label}>Confirmar nova senha</Text>
        <TextInput
          style={s.input}
          placeholder="••••••••••••"
          placeholderTextColor="#9B8AC4"
          secureTextEntry
          value={vm.confirmar}
          onChangeText={vm.setConfirmar}
        />
      </View>

      <Pressable
        style={({ pressed }) => [s.button, pressed && s.buttonPressed, vm.enviando && s.buttonDisabled]}
        onPress={vm.redefinir}
        disabled={vm.enviando}
      >
        <Text style={s.buttonText}>{vm.enviando ? 'SALVANDO...' : 'Salvar nova senha'}</Text>
      </Pressable>

      <Text style={s.helperText}>O código vale por 30 minutos e só pode ser usado uma vez.</Text>
    </AuthCard>
  );
}
