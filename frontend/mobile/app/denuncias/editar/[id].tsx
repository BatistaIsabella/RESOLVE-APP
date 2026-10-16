import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { GradientHeader } from '@/components/ui/GradientHeader';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { SelectField } from '@/components/ui/SelectField';
import { CATEGORIAS, REGIOES } from '@/constants/demanda';
import { AppColors } from '@/constants/colors';
import { TITULO_MAX, useEditarDenunciaViewModel } from '@/viewmodels/useEditarDenunciaViewModel';

export default function EditarDenunciaScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const vm = useEditarDenunciaViewModel(id);

  if (vm.carregando) {
    return <LoadingScreen message="Carregando denúncia..." />;
  }

  const header = (
    <GradientHeader
      title="Editar denúncia"
      profileLabel={vm.userName ?? 'Usuário'}
      onBack={vm.voltar}
      onLogout={vm.sair}
    />
  );

  if (!vm.demand || !vm.podeEditar) {
    return (
      <View style={styles.container}>
        {header}
        <View style={styles.center}>
          <Text style={styles.notFound}>
            {!vm.demand
              ? 'Denúncia não encontrada.'
              : `Esta denúncia está "${vm.demand.status}" e não pode mais ser editada.`}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {header}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.field}>
            <Text style={styles.label}>Título</Text>
            <TextInput
              style={[styles.input, !!vm.erros.titulo && styles.inputError]}
              value={vm.valores.titulo}
              onChangeText={vm.alterarTitulo}
              maxLength={TITULO_MAX}
              placeholder="Resumo do problema"
              placeholderTextColor={AppColors.textMuted}
            />
            <Text style={styles.counter}>
              {vm.valores.titulo.length}/{TITULO_MAX}
            </Text>
            {vm.erros.titulo ? <Text style={styles.error}>{vm.erros.titulo}</Text> : null}
          </View>

          <View style={styles.field}>
            <SelectField
              label="Categoria"
              value={vm.valores.categoria}
              options={[...CATEGORIAS]}
              onChange={vm.alterarCategoria}
            />
            {vm.erros.categoria ? <Text style={styles.error}>{vm.erros.categoria}</Text> : null}
          </View>

          <View style={styles.field}>
            <SelectField
              label="Região"
              value={vm.valores.regiao}
              options={[...REGIOES]}
              onChange={vm.alterarRegiao}
            />
            {vm.erros.regiao ? <Text style={styles.error}>{vm.erros.regiao}</Text> : null}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Endereço</Text>
            <TextInput
              style={[styles.input, !!vm.erros.endereco && styles.inputError]}
              value={vm.valores.endereco}
              onChangeText={vm.alterarEndereco}
              placeholder="Rua, número, bairro, cidade"
              placeholderTextColor={AppColors.textMuted}
            />
            {vm.erros.endereco ? <Text style={styles.error}>{vm.erros.endereco}</Text> : null}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Descrição</Text>
            <TextInput
              style={[styles.input, styles.textArea, !!vm.erros.descricao && styles.inputError]}
              value={vm.valores.descricao}
              onChangeText={vm.alterarDescricao}
              multiline
              textAlignVertical="top"
              placeholder="Descreva o problema"
              placeholderTextColor={AppColors.textMuted}
            />
            {vm.erros.descricao ? <Text style={styles.error}>{vm.erros.descricao}</Text> : null}
          </View>

          {vm.erroEnvio ? <Text style={[styles.error, styles.submitError]}>{vm.erroEnvio}</Text> : null}

          <PrimaryButton label="Salvar alterações" onPress={vm.salvar} loading={vm.salvando} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  flex: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  notFound: {
    color: AppColors.textMuted,
    fontSize: 16,
    textAlign: 'center',
  },
  field: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: AppColors.text,
  },
  input: {
    borderWidth: 1,
    borderColor: AppColors.border,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: AppColors.text,
    backgroundColor: AppColors.white,
  },
  inputError: {
    borderColor: '#DC2626',
  },
  textArea: {
    minHeight: 140,
  },
  counter: {
    alignSelf: 'flex-end',
    fontSize: 12,
    color: AppColors.textMuted,
  },
  error: {
    color: '#DC2626',
    fontSize: 13,
  },
  submitError: {
    textAlign: 'center',
  },
});
