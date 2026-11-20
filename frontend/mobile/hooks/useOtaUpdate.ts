import { useEffect } from 'react';
import { Alert, AppState } from 'react-native';
import * as Updates from 'expo-updates';

// Atualização over-the-air (EAS Update). Na abertura o expo-updates já verifica e baixa sozinho;
// aqui cobrimos o app que ficou aberto: ao voltar para o primeiro plano verifica de novo, e quando
// há versão baixada pergunta antes de reiniciar, para não perder um formulário pela metade.
// Desligado no Expo Go e no `expo start`.
export function useOtaUpdate() {
  const { isUpdateAvailable, isUpdatePending } = Updates.useUpdates();

  useEffect(() => {
    if (__DEV__ || !Updates.isEnabled) return;
    const assinatura = AppState.addEventListener('change', (estado) => {
      // Falha de rede aqui não interessa ao usuário: tenta de novo na próxima volta ao app.
      if (estado === 'active') Updates.checkForUpdateAsync().catch(() => {});
    });
    return () => assinatura.remove();
  }, []);

  useEffect(() => {
    if (isUpdateAvailable && !isUpdatePending) Updates.fetchUpdateAsync().catch(() => {});
  }, [isUpdateAvailable, isUpdatePending]);

  useEffect(() => {
    if (!isUpdatePending) return;
    Alert.alert('Atualização disponível', 'Uma nova versão do app foi baixada. Reiniciar agora para aplicar?', [
      { text: 'Depois', style: 'cancel' },
      { text: 'Reiniciar', onPress: () => Updates.reloadAsync().catch(() => {}) },
    ]);
  }, [isUpdatePending]);
}
