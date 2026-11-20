import React, { useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { GradientHeader } from '@/components/ui/GradientHeader';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { SelectField } from '@/components/ui/SelectField';
import { FormField } from '@/components/ui/FormField';
import { useAuth } from '@/hooks/useAuth';
import { useDemandStore } from '@/stores/useDemandStore';
import { CATEGORIAS, PROBLEMAS_POR_CATEGORIA, REGIOES } from '@/constants/demanda';
import { DemandCategory, DemandRegion } from '@/types/demand';
import { getErrorMessage } from '@/lib/api';
import {
  DemandField,
  DemandStep,
  FieldErrors,
  hasErrors,
  LIMITES,
  validateDemandStep,
} from '@/utils/validation';
import { AppColors } from '@/constants/colors';

const STEPS: DemandStep[] = ['foto', 'categoria', 'localizacao', 'descricao'];

export default function NovaDenunciaScreen() {
  const router = useRouter();
  const { userName, signOut } = useAuth();
  const createDemand = useDemandStore((s) => s.createDemand);
  const isSaving = useDemandStore((s) => s.isSaving);

  const [step, setStep] = useState<DemandStep>('foto');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [categoria, setCategoria] = useState('');
  const [problema, setProblema] = useState('');
  const [regiao, setRegiao] = useState('');
  const [endereco, setEndereco] = useState('');
  const [descricao, setDescricao] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<DemandField>>({});
  const [erro, setErro] = useState('');
  const [locating, setLocating] = useState(false);

  const stepIndex = STEPS.indexOf(step);
  const values = { categoria, problema, regiao, endereco, descricao };

  /** Atualiza o campo e apaga o erro dele: o aviso some assim que o usuário corrige. */
  const bind = (field: DemandField, setter: (v: string) => void) => (value: string) => {
    setter(value);
    setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const pickImage = async (useCamera: boolean) => {
    try {
      const permission = useCamera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert('Permissão necessária', 'Autorize o acesso à câmera ou galeria para anexar fotos.');
        return;
      }

      const result = useCamera
        ? await ImagePicker.launchCameraAsync({ quality: 0.7, allowsEditing: true })
        : await ImagePicker.launchImageLibraryAsync({ quality: 0.7, allowsEditing: true });

      if (!result.canceled && result.assets[0]) {
        setImageUri(result.assets[0].uri);
      }
    } catch {
      // Ex.: emulador sem câmera. A foto é opcional, então só avisamos.
      Alert.alert('Não foi possível abrir', useCamera ? 'A câmera não está disponível.' : 'A galeria não está disponível.');
    }
  };

  const captureLocation = async () => {
    setLocating(true);
    setErro('');
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permissão negada', 'Ative a localização para registrar o endereço automaticamente.');
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const [geo] = await Location.reverseGeocodeAsync({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });

      if (geo) {
        const parts = [geo.street, geo.name, geo.district, geo.city, geo.region].filter(Boolean);
        const coords = ` (${position.coords.latitude.toFixed(5)}, ${position.coords.longitude.toFixed(5)})`;
        bind('endereco', setEndereco)(`${parts.join(', ')}${coords}`);
      } else {
        bind('endereco', setEndereco)(
          `Lat: ${position.coords.latitude.toFixed(5)}, Lng: ${position.coords.longitude.toFixed(5)}`
        );
      }
    } catch {
      setErro('Não foi possível obter a localização. Digite o endereço manualmente.');
    } finally {
      setLocating(false);
    }
  };

  const validate = (target: DemandStep): boolean => {
    const errors = validateDemandStep(target, values);
    setFieldErrors(errors);
    return !hasErrors(errors);
  };

  const nextStep = () => {
    setErro('');
    if (!validate(step)) return;
    const next = STEPS[stepIndex + 1];
    if (next) setStep(next);
  };

  const prevStep = () => {
    setErro('');
    setFieldErrors({});
    const prev = STEPS[stepIndex - 1];
    if (prev) setStep(prev);
    else router.back();
  };

  const handleSubmit = async () => {
    setErro('');
    // Revalida todos os passos: se algum ficou inválido, volta para ele.
    const invalid = STEPS.find((s) => hasErrors(validateDemandStep(s, values)));
    if (invalid) {
      setStep(invalid);
      validate(invalid);
      return;
    }

    try {
      await createDemand({
        titulo: problema,
        categoria: categoria as DemandCategory,
        regiao: regiao as DemandRegion,
        descricao: descricao.trim(),
        endereco: endereco.trim(),
        imagemUri: imageUri,
      });
      Alert.alert('Sucesso', 'Denúncia registrada com sucesso!', [
        { text: 'OK', onPress: () => router.replace('/denuncias') },
      ]);
    } catch (err) {
      setErro(getErrorMessage(err, 'Erro ao salvar denúncia.'));
    }
  };

  return (
    <View style={styles.container}>
      <GradientHeader
        title="Nova Denúncia"
        profileLabel={userName ?? 'Usuário'}
        onBack={prevStep}
        onLogout={signOut}
      />

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.stepIndicator}>
          Passo {stepIndex + 1} de {STEPS.length}
        </Text>

        {step === 'foto' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Adicione imagens (opcional)</Text>
            <Pressable
              style={styles.imageBox}
              onPress={() => pickImage(false)}
              accessibilityRole="button"
              accessibilityLabel="Escolher foto da galeria"
            >
              {imageUri ? (
                <Image source={{ uri: imageUri }} style={styles.preview} />
              ) : (
                <Text style={styles.plus}>+</Text>
              )}
            </Pressable>
            <View style={styles.row}>
              <PrimaryButton label="Galeria" onPress={() => pickImage(false)} style={styles.halfBtn} />
              <PrimaryButton label="Câmera" onPress={() => pickImage(true)} style={styles.halfBtn} />
            </View>
            <PrimaryButton label="Continuar" onPress={nextStep} style={styles.nextBtn} />
          </View>
        )}

        {step === 'categoria' && (
          <View style={styles.section}>
            <SelectField
              label="Categoria"
              value={categoria}
              options={[...CATEGORIAS]}
              placeholder="Categoria"
              error={fieldErrors.categoria}
              onChange={(v) => {
                bind('categoria', setCategoria)(v);
                setProblema('');
              }}
            />
            <SelectField
              label="Problema"
              value={problema}
              options={categoria ? PROBLEMAS_POR_CATEGORIA[categoria] ?? [] : []}
              placeholder={categoria ? 'Título / Problema' : 'Escolha a categoria primeiro'}
              error={fieldErrors.problema}
              disabled={!categoria}
              onChange={bind('problema', setProblema)}
            />
            <SelectField
              label="Região"
              value={regiao}
              options={[...REGIOES]}
              placeholder="Região"
              error={fieldErrors.regiao}
              onChange={bind('regiao', setRegiao)}
            />
            <PrimaryButton label="Continuar" onPress={nextStep} style={styles.nextBtn} />
          </View>
        )}

        {step === 'localizacao' && (
          <View style={styles.section}>
            <PrimaryButton
              label={locating ? 'Obtendo GPS...' : 'Usar minha localização (GPS)'}
              onPress={captureLocation}
              loading={locating}
              style={styles.nextBtn}
            />
            <FormField
              style={styles.input}
              placeholder="Endereço"
              placeholderTextColor={AppColors.textMuted}
              value={endereco}
              onChangeText={bind('endereco', setEndereco)}
              error={fieldErrors.endereco}
              editable={!locating}
              multiline
            />
            <PrimaryButton label="Continuar" onPress={nextStep} style={styles.nextBtn} />
          </View>
        )}

        {step === 'descricao' && (
          <View style={styles.section}>
            <FormField
              style={[styles.input, styles.textArea]}
              placeholder="Descrição"
              placeholderTextColor={AppColors.textMuted}
              value={descricao}
              onChangeText={bind('descricao', setDescricao)}
              error={fieldErrors.descricao}
              editable={!isSaving}
              maxLength={LIMITES.descricao}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />
            <Text style={styles.counter}>
              {descricao.trim().length}/{LIMITES.descricao}
            </Text>
            <PrimaryButton
              label="Salvar"
              onPress={handleSubmit}
              loading={isSaving}
              style={styles.nextBtn}
            />
          </View>
        )}

        {erro ? (
          <Text style={styles.error} accessibilityRole="alert">
            {erro}
          </Text>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.background,
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
  counter: {
    alignSelf: 'flex-end',
    color: AppColors.textMuted,
    fontSize: 12,
    marginTop: -8,
  },
  textArea: {
    minHeight: 140,
    textAlign: 'left',
  },
  error: {
    color: AppColors.danger,
    textAlign: 'center',
    fontSize: 14,
  },
});
