import { useState } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { CameraView, useCameraPermissions } from 'expo-camera';

import { useAuth } from '@/hooks/useAuth';
import { useDemandStore } from '@/stores/useDemandStore';
import { PROBLEMAS_POR_CATEGORIA } from '@/constants/demanda';
import { DemandCategory, DemandRegion } from '@/types/demand';
import { ApiError } from '@/lib/api';
import { compressImage } from '@/utils/imageUtils';
import { alertPermissaoNegada } from '@/utils/permissionAlert';
import { comTempoLimite } from '@/utils/timeout';

export type NovaDenunciaStep = 'foto' | 'categoria' | 'localizacao' | 'descricao';

const STEPS: NovaDenunciaStep[] = ['foto', 'categoria', 'localizacao', 'descricao'];

// GPS frio em ambiente fechado pode levar minutos; depois disso o usuário
// digita o endereço.
const GPS_TEMPO_LIMITE_MS = 10_000;
const GEOCODE_TEMPO_LIMITE_MS = 5_000;

const ERRO_LOCALIZACAO =
  'Não foi possível obter a localização. Digite o endereço manualmente.';

function formatarCoordenadas(coords: Location.LocationObjectCoords): string {
  return `Lat: ${coords.latitude.toFixed(5)}, Lng: ${coords.longitude.toFixed(5)}`;
}

function formatarEndereco(
  geo: Location.LocationGeocodedAddress,
  coords: Location.LocationObjectCoords,
): string {
  const parts = [geo.street, geo.name, geo.district, geo.city, geo.region].filter(Boolean);
  return `${parts.join(', ')} (${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)})`;
}

/**
 * ViewModel da tela "Nova Denúncia" (app/denuncias/nova.tsx): estado do
 * formulário em 4 passos, validação, câmera/galeria/GPS e envio.
 */
export function useNovaDenunciaViewModel() {
  const router = useRouter();
  const { userName, logout } = useAuth();
  const createDemand = useDemandStore((s) => s.createDemand);
  const isLoading = useDemandStore((s) => s.isLoading);

  const [step, setStep] = useState<NovaDenunciaStep>('foto');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [categoria, setCategoria] = useState('');
  const [problema, setProblema] = useState('');
  const [regiao, setRegiao] = useState('');
  const [endereco, setEndereco] = useState('');
  const [descricao, setDescricao] = useState('');
  const [erro, setErro] = useState('');
  const [locating, setLocating] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const [showCamera, setShowCamera] = useState(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();

  const stepIndex = STEPS.indexOf(step);
  const problemasDisponiveis = categoria ? (PROBLEMAS_POR_CATEGORIA[categoria] ?? []) : [];

  const openCamera = async () => {
    if (!cameraPermission?.granted) {
      const permission = await requestCameraPermission();

      if (!permission.granted) {
        alertPermissaoNegada(
          'Permissão necessária',
          'Autorize o acesso à câmera para anexar fotos.',
        );
        return;
      }
    }

    setShowCamera(true);
  };

  const closeCamera = () => setShowCamera(false);

  // A ref do CameraView é da View (handle do componente nativo); ela entrega
  // a câmera aqui no momento do clique.
  const takePicture = async (camera: CameraView | null) => {
    if (!camera) {
      return;
    }

    try {
      const result = await camera.takePictureAsync({ quality: 0.7 });

      if (result?.uri) {
        setImageUri(result.uri);
        setShowCamera(false);
      }
    } catch {
      Alert.alert('Erro', 'Não foi possível tirar a foto.');
    }
  };

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      alertPermissaoNegada(
        'Permissão necessária',
        'Autorize o acesso à galeria para anexar fotos.',
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      quality: 0.7,
      allowsEditing: true,
    });

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
        alertPermissaoNegada(
          'Permissão negada',
          'Ative a localização para registrar o endereço automaticamente.',
        );
        return;
      }

      const position = await comTempoLimite(
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
        GPS_TEMPO_LIMITE_MS,
      );
      const { coords } = position;

      // Com a posição em mãos, falha do geocoder reverso (sem rede, serviço
      // fora) não deve descartar as coordenadas.
      let geo: Location.LocationGeocodedAddress | undefined;
      try {
        [geo] = await comTempoLimite(
          Location.reverseGeocodeAsync({
            latitude: coords.latitude,
            longitude: coords.longitude,
          }),
          GEOCODE_TEMPO_LIMITE_MS,
        );
      } catch {
        geo = undefined;
      }

      setEndereco(geo ? formatarEndereco(geo, coords) : formatarCoordenadas(coords));
    } catch {
      setErro(ERRO_LOCALIZACAO);
    } finally {
      setLocating(false);
    }
  };

  const selecionarCategoria = (value: string) => {
    setCategoria(value);
    setProblema('');
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

    const next = STEPS[stepIndex + 1];

    if (next) {
      setStep(next);
    }
  };

  const prevStep = () => {
    setErro('');
    const prev = STEPS[stepIndex - 1];

    if (prev) {
      setStep(prev);
    } else {
      router.back();
    }
  };

  const handleSubmit = async () => {
    if (enviando || !validateStep()) return;

    setEnviando(true);

    try {
      const imagemUri = imageUri ? await compressImage(imageUri) : null;

      await createDemand({
        titulo: problema,
        categoria: categoria as DemandCategory,
        regiao: regiao as DemandRegion,
        descricao: descricao.trim(),
        endereco: endereco.trim(),
        imagemUri,
      });

      Alert.alert('Sucesso', 'Denúncia registrada com sucesso!', [
        {
          text: 'OK',
          onPress: () => router.replace('/denuncias'),
        },
      ]);
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : 'Erro ao salvar denúncia');
    } finally {
      setEnviando(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.replace('/');
  };

  return {
    userName,
    step,
    stepNumber: stepIndex + 1,
    totalSteps: STEPS.length,
    erro,

    imageUri,
    showCamera,
    openCamera,
    closeCamera,
    takePicture,
    pickImage,

    categoria,
    problema,
    regiao,
    problemasDisponiveis,
    selecionarCategoria,
    setProblema,
    setRegiao,

    endereco,
    setEndereco,
    locating,
    captureLocation,

    descricao,
    setDescricao,
    salvando: enviando || isLoading,

    nextStep,
    prevStep,
    handleSubmit,
    handleLogout,
  };
}
