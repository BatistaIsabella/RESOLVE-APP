import React, { useRef } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { CameraView } from 'expo-camera';
import { Stack } from 'expo-router';

import { GradientHeader } from '@/components/ui/GradientHeader';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { SelectField } from '@/components/ui/SelectField';
import { CATEGORIAS, REGIOES } from '@/constants/demanda';
import { AppColors } from '@/constants/colors';
import { useNovaDenunciaViewModel } from '@/viewmodels/useNovaDenunciaViewModel';

export default function NovaDenunciaScreen() {
  const vm = useNovaDenunciaViewModel();
  const cameraRef = useRef<CameraView>(null);

  const screenOptions = (
    <Stack.Screen options={{ gestureEnabled: vm.podeSairComGesto }} />
  );

  if (vm.showCamera) {
    return (
      <View style={styles.cameraContainer}>
        {screenOptions}
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing="back"
        />

        <View style={styles.cameraControls}>
          <PrimaryButton
            label="Tirar foto"
            onPress={() => vm.takePicture(cameraRef.current)}
            style={styles.cameraButton}
          />

          <PrimaryButton
            label="Cancelar"
            onPress={vm.closeCamera}
            style={styles.cameraButton}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {screenOptions}
      <GradientHeader
        title="Nova Denúncia"
        profileLabel={vm.userName ?? 'Usuário'}
        onBack={vm.prevStep}
        onLogout={vm.handleLogout}
      />

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.stepIndicator}>
          Passo {vm.stepNumber} de {vm.totalSteps}
        </Text>

        {vm.step === 'foto' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Adicione imagens
            </Text>

            <Pressable
              style={styles.imageBox}
              onPress={vm.openCamera}
            >
              {vm.imageUri ? (
                <Image
                  source={{ uri: vm.imageUri }}
                  style={styles.preview}
                />
              ) : (
                <Text style={styles.plus}>+</Text>
              )}
            </Pressable>

            <View style={styles.row}>
              <PrimaryButton
                label="Galeria"
                onPress={vm.pickImage}
                style={styles.halfBtn}
              />

              <PrimaryButton
                label="Câmera"
                onPress={vm.openCamera}
                style={styles.halfBtn}
              />
            </View>

            <PrimaryButton
              label="Continuar"
              onPress={vm.nextStep}
              style={styles.nextBtn}
            />
          </View>
        )}

        {vm.step === 'categoria' && (
          <View style={styles.section}>
            <SelectField
              label="Categoria"
              value={vm.categoria}
              options={[...CATEGORIAS]}
              placeholder="Categoria"
              onChange={vm.selecionarCategoria}
            />

            <SelectField
              label="Problema"
              value={vm.problema}
              options={vm.problemasDisponiveis}
              placeholder="Título / Problema"
              onChange={vm.setProblema}
            />

            <SelectField
              label="Região"
              value={vm.regiao}
              options={[...REGIOES]}
              placeholder="Região"
              onChange={vm.setRegiao}
            />

            <PrimaryButton
              label="Continuar"
              onPress={vm.nextStep}
              style={styles.nextBtn}
            />
          </View>
        )}

        {vm.step === 'localizacao' && (
          <View style={styles.section}>
            <PrimaryButton
              label={
                vm.locating
                  ? 'Obtendo GPS...'
                  : 'Usar minha localização (GPS)'
              }
              onPress={vm.captureLocation}
              loading={vm.locating}
              style={styles.nextBtn}
            />

            <TextInput
              style={styles.input}
              placeholder="Endereço"
              placeholderTextColor={AppColors.textMuted}
              value={vm.endereco}
              onChangeText={vm.setEndereco}
              multiline
            />

            <PrimaryButton
              label="Continuar"
              onPress={vm.nextStep}
              style={styles.nextBtn}
            />
          </View>
        )}

        {vm.step === 'descricao' && (
          <View style={styles.section}>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Descrição"
              placeholderTextColor={AppColors.textMuted}
              value={vm.descricao}
              onChangeText={vm.setDescricao}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />

            <PrimaryButton
              label="Salvar"
              onPress={vm.handleSubmit}
              loading={vm.salvando}
              style={styles.nextBtn}
            />
            {vm.salvando && vm.progressoEnvio !== null ? (
              <Text style={styles.progresso}>Enviando... {vm.progressoEnvio}%</Text>
            ) : null}
          </View>
        )}

        {vm.erro ? (
          <Text style={styles.error}>
            {vm.erro}
          </Text>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },

  content: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },

  stepIndicator: {
    textAlign: 'center',
    color: AppColors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },

  section: {
    gap: 14,
  },

  sectionTitle: {
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '600',
    color: AppColors.text,
  },

  imageBox: {
    borderWidth: 1,
    borderColor: AppColors.border,
    borderRadius: 12,
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AppColors.white,
    overflow: 'hidden',
  },

  preview: {
    width: '100%',
    height: '100%',
  },

  plus: {
    fontSize: 48,
    color: AppColors.textMuted,
  },

  row: {
    flexDirection: 'row',
    gap: 10,
  },

  halfBtn: {
    flex: 1,
  },

  nextBtn: {
    marginTop: 4,
  },

  progresso: {
    marginTop: 8,
    textAlign: 'center',
    color: AppColors.textMuted,
    fontSize: 13,
  },

  input: {
    borderWidth: 1,
    borderColor: AppColors.border,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: AppColors.text,
    backgroundColor: AppColors.white,
    textAlign: 'center',
  },

  textArea: {
    minHeight: 140,
    textAlign: 'left',
  },

  error: {
    color: '#DC2626',
    textAlign: 'center',
    fontSize: 14,
  },

  cameraContainer: {
    flex: 1,
    backgroundColor: '#000',
  },

  camera: {
    flex: 1,
  },

  cameraControls: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    gap: 12,
  },

  cameraButton: {
    marginTop: 4,
  },
});