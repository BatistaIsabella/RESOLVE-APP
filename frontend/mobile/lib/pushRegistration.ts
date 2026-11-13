import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { notificacaoService } from '@/services/notificacaoService';

const CANAL_STATUS = 'status-denuncia';

// Com o app aberto a notificação também aparece, em vez de chegar calada.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Token do aparelho já registrado nesta sessão, guardado para poder removê-lo ao sair.
let tokenRegistrado: string | null = null;

async function permissaoConcedida(): Promise<boolean> {
  const atual = await Notifications.getPermissionsAsync();
  if (atual.granted) return true;
  if (!atual.canAskAgain) return false;
  return (await Notifications.requestPermissionsAsync()).granted;
}

function projectId(): string | undefined {
  return Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
}

async function obterTokenPush(): Promise<string | null> {
  // Emulador não recebe push. O canal precisa existir antes do pedido de permissão no Android 13+.
  if (!Device.isDevice) return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CANAL_STATUS, {
      name: 'Status das denúncias',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  if (!(await permissaoConcedida())) return null;

  const id = projectId();
  if (!id) {
    // Sem o projeto do EAS vinculado (`eas init`) o Expo não emite token.
    console.warn('[push] extra.eas.projectId ausente em app.json: rode `eas init` para ativar as notificações.');
    return null;
  }

  return (await Notifications.getExpoPushTokenAsync({ projectId: id })).data;
}

// Registra este aparelho para a conta logada. Falhar aqui nunca deve atrapalhar o uso do app.
export async function registrarDispositivo(): Promise<void> {
  try {
    const token = await obterTokenPush();
    if (!token) return;
    await notificacaoService.registrar(token);
    tokenRegistrado = token;
  } catch (err) {
    console.warn('[push] Não foi possível registrar o aparelho para notificações.', err);
  }
}

// Ao sair, o aparelho deixa de receber as notificações dessa conta.
export function desregistrarDispositivo(sessaoToken: string): void {
  const token = tokenRegistrado;
  tokenRegistrado = null;
  if (!token) return;
  notificacaoService.remover(token, sessaoToken).catch(() => {});
}
