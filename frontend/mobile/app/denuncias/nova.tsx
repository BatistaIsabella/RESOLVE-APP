import React, { useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { GradientHeader } from '@/components/ui/GradientHeader';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { SelectField } from '@/components/ui/SelectField';
import { useAuth } from '@/hooks/useAuth';
import { useDemandStore } from '@/stores/useDemandStore';
import { CATEGORIAS, PROBLEMAS_POR_CATEGORIA, REGIOES } from '@/constants/demanda';
import { DemandCategory, DemandRegion } from '@/types/demand';
import { ApiError } from '@/lib/api';
import { AppColors } from '@/constants/colors';

type Step = 'foto' | 'categoria' | 'localizacao' | 'descricao';

export default function NovaDenunciaScreen() {
  const router = useRouter();
  const { userName, logout } = useAuth();
  const createDemand = useDemandStore((s) => s.createDemand);
  const isLoading = useDemandStore((s) => s.isLoading);

  const [step, setStep] = useState<Step>('foto');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [categoria, setCategoria] = useState('');
  const [problema, setProblema] = useState('');
  const [regiao, setRegiao] = useState('');
  const [endereco, setEndereco] = useState('');
  const [descricao, setDescricao] = useState('');
  const [erro, setErro] = useState('');
  const [locating, setLocating] = useState(false);

  const steps: Step[] = ['foto', 'categoria', 'localizacao', 'descricao'];
  const stepIndex = steps.indexOf(step);

  const pickImage = async (useCamera: boolean) => {
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
        setEndereco(`${parts.join(', ')}${coords}`);
      } else {
        setEndereco(
          `Lat: ${position.coords.latitude.toFixed(5)}, Lng: ${position.coords.longitude.toFixed(5)}`
        );
      }
    } catch {
      setErro('Não foi possível obter a localização. Digite o endereço manualmente.');
    } finally {
      setLocating(false);
    }
  };

  const validateStep = (): boolean => {
    setErro('');
    if (step === 'categoria' && (!categoria || !problema || !regiao)) {
      setErro('Selecione categoria, problema e região.');
      return false;
    }
    if (step === 'localizacao' && !endereco.trim()) {
      setErro('Informe ou capture o endereço.');
      return false;
    }
    if (step === 'descricao' && !descricao.trim()) {
      setErro('Informe a descrição da denúncia.');
      return false;
    }
    return true;
  };

  const nextStep = () => {
    if (!validateStep()) return;
    const next = steps[stepIndex + 1];
    if (next) setStep(next);
  };

  const prevStep = () => {
    const prev = steps[stepIndex - 1];
    if (prev) setStep(prev);
    else router.back();
  };

  const handleSubmit = async () => {
    if (!validateStep()) return;
    setErro('');

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
      setErro(err instanceof ApiError ? err.message : 'Erro ao salvar denúncia');
    }
  };

  const handleLogout = () => {
    logout();
    router.replace('/');
  };

  return (
    <View style={styles.container}>
      <GradientHeader
        title="Nova Denúncia"
        profileLabel={userName ?? 'Usuário'}
        onBack={prevStep}
        onLogout={handleLogout}
      />

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.stepIndicator}>
          Passo {stepIndex + 1} de {steps.length}
        </Text>

        {step === 'foto' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Adicione imagens</Text>
            <Pressable style={styles.imageBox} onPress={() => pickImage(false)}>
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
              onChange={(v) => {
                setCategoria(v);
                setProblema('');
              }}
            />
            <SelectField
              label="Problema"
              value={problema}
              options={categoria ? PROBLEMAS_POR_CATEGORIA[categoria] ?? [] : []}
              placeholder="Título / Problema"
              onChange={setProblema}
            />
            <SelectField
              label="Região"
              value={regiao}
              options={[...REGIOES]}
              placeholder="Região"
              onChange={setRegiao}
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
            <TextInput
              style={styles.input}
              placeholder="Endereço"
              placeholderTextColor={AppColors.textMuted}
              value={endereco}
              onChangeText={setEndereco}
              multiline
            />
            <PrimaryButton label="Continuar" onPress={nextStep} style={styles.nextBtn} />
          </View>
        )}

        {step === 'descricao' && (
          <View style={styles.section}>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Descrição"
              placeholderTextColor={AppColors.textMuted}
              value={descricao}
              onChangeText={setDescricao}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />
            <PrimaryButton
              label="Salvar"
              onPress={handleSubmit}
              loading={isLoading}
              style={styles.nextBtn}
            />
          </View>
        )}

        {erro ? <Text style={styles.error}>{erro}</Text> : null}
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
});
