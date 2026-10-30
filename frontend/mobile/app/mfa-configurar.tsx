import React, { useEffect } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { AuthCard, authStyles as s } from '@/components/ui/AuthCard';
import { formatarSegredo } from '@/utils/mfa';
import { useMfaConfigurarViewModel } from '@/viewmodels/useMfaViewModel';

// Ativação da verificação em duas etapas: chave, confirmação do primeiro código e códigos de recuperação.
export default function MfaConfigurarScreen() {
  const vm = useMfaConfigurarViewModel();
  const { gerarSegredo, semAcesso } = vm;

  useEffect(() => {
    if (!semAcesso) gerarSegredo();
    // Gera a chave uma vez ao abrir a tela.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [semAcesso]);

  if (vm.semAcesso) {
    return (
      <AuthCard title="Verificação em duas etapas" onBack={vm.goBack}>
        <Text style={s.errorText}>Faça login para configurar a verificação em duas etapas.</Text>
      </AuthCard>
    );
  }

  if (vm.etapa === 'recuperacao') {
    return (
      <AuthCard title="Códigos de recuperação" onBack={vm.concluir}>
        <Text style={s.helperText}>
          Guarde estes códigos em um lugar seguro. Se você perder o celular, cada um deixa entrar uma vez. Eles não
          serão mostrados de novo.
        </Text>

        <View style={{ gap: 6, alignItems: 'center' }}>
          {vm.codigosRecuperacao.map((c) => (
            <Text key={c} selectable style={{ fontSize: 17, fontWeight: '700', color: '#3D2683', letterSpacing: 1 }}>
              {c}
            </Text>
          ))}
        </View>

        <Pressable style={({ pressed }) => [s.button, pressed && s.buttonPressed]} onPress={vm.compartilharCodigos}>
          <Text style={s.buttonText}>Salvar ou compartilhar</Text>
        </Pressable>
        <Text style={s.helperText}>
          <Text style={s.link} onPress={vm.concluir}>
            Já guardei os códigos, continuar
          </Text>
        </Text>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Verificação em duas etapas" onBack={vm.goBack}>
      {vm.obrigatoria ? (
        <Text style={s.helperText}>Para acessar como gestor, é preciso ativar a verificação em duas etapas.</Text>
      ) : null}

      {vm.erro ? <Text style={s.errorText}>{vm.erro}</Text> : null}

      {vm.etapa === 'segredo' ? (
        <>
          <Text style={s.helperText}>
            1. Instale um app autenticador (Google Authenticator, Microsoft Authenticator ou similar).{'\n'}
            2. Toque em “Abrir no autenticador” ou digite esta chave no app.
          </Text>

          <View style={s.field}>
            <Text style={s.label}>Chave</Text>
            <Text selectable style={{ fontSize: 18, fontWeight: '700', color: '#3D2683', letterSpacing: 1 }}>
              {vm.configuracao ? formatarSegredo(vm.configuracao.segredo) : 'Gerando...'}
            </Text>
          </View>

          <Pressable
            style={({ pressed }) => [s.button, pressed && s.buttonPressed, !vm.configuracao && s.buttonDisabled]}
            onPress={vm.abrirNoAutenticador}
            disabled={!vm.configuracao}
          >
            <Text style={s.buttonText}>Abrir no autenticador</Text>
          </Pressable>

          <Text style={s.helperText}>
            <Text style={s.link} onPress={vm.configuracao ? vm.irParaCodigo : undefined}>
              Já adicionei, informar o código
            </Text>
          </Text>
        </>
      ) : (
        <>
          <Text style={s.helperText}>Digite o código de 6 números que o app autenticador mostra para o RESOLVE.</Text>

          <View style={s.field}>
            <Text style={s.label}>Código</Text>
            <TextInput
              style={s.input}
              placeholder="000000"
              placeholderTextColor="#9B8AC4"
              keyboardType="number-pad"
              maxLength={6}
              value={vm.codigo}
              onChangeText={vm.setCodigo}
              onSubmitEditing={vm.confirmar}
            />
          </View>

          <Pressable
            style={({ pressed }) => [s.button, pressed && s.buttonPressed, vm.carregando && s.buttonDisabled]}
            onPress={vm.confirmar}
            disabled={vm.carregando}
          >
            <Text style={s.buttonText}>{vm.carregando ? 'VERIFICANDO...' : 'Ativar'}</Text>
          </Pressable>
        </>
      )}
    </AuthCard>
  );
}
