import React from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { AuthCard, authStyles as s } from '@/components/ui/AuthCard';
import { useMfaLoginViewModel } from '@/viewmodels/useMfaViewModel';

// Segunda etapa do login do gestor com verificação em duas etapas.
export default function MfaScreen() {
  const vm = useMfaLoginViewModel();

  return (
    <AuthCard title="Verificação em duas etapas" onBack={vm.goBack}>
      <Text style={s.helperText}>
        Abra o app autenticador e digite o código de 6 números do RESOLVE. Se perdeu o celular, use um dos códigos de
        recuperação (formato xxxxx-xxxxx).
      </Text>

      {vm.desafioAusente ? <Text style={s.errorText}>Faça o login novamente para continuar.</Text> : null}
      {vm.erro ? <Text style={s.errorText}>{vm.erro}</Text> : null}

      <View style={s.field}>
        <Text style={s.label}>Código</Text>
        <TextInput
          style={s.input}
          placeholder="000000"
          placeholderTextColor="#9B8AC4"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="visible-password"
          value={vm.codigo}
          onChangeText={vm.setCodigo}
          onSubmitEditing={vm.confirmar}
        />
      </View>

      <Pressable
        style={({ pressed }) => [s.button, pressed && s.buttonPressed, vm.enviando && s.buttonDisabled]}
        onPress={vm.confirmar}
        disabled={vm.enviando || vm.desafioAusente}
      >
        <Text style={s.buttonText}>{vm.enviando ? 'VERIFICANDO...' : 'Confirmar'}</Text>
      </Pressable>
    </AuthCard>
  );
}
