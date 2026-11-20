import { useEffect } from 'react';
import { AppState } from 'react-native';
import * as Updates from 'expo-updates';

/**
 * Atualizações over-the-air (expo-updates + EAS Update).
 *
 * Na abertura, o próprio expo-updates já verifica e baixa em segundo plano
 * (`checkAutomatically: ON_LOAD` no app.json). Aqui cobrimos o app que fica
 * aberto: a cada volta ao primeiro plano, verifica de novo e baixa o que houver.
 * Quando há atualização baixada, `isUpdatePending` vira true e a View decide
 * quando reiniciar — nunca reiniciamos sem o usuário pedir, para não perder um
 * formulário pela metade.
 *
 * Em desenvolvimento (Expo Go / `expo start`) o módulo fica desligado.
 */
export function useOtaUpdate() {
  const { isUpdateAvailable, isUpdatePending } = Updates.useUpdates();

  useEffect(() => {
    if (__DEV__ || !Updates.isEnabled) return;

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        // Falha de rede aqui não interessa ao usuário: tenta de novo na próxima.
        Updates.checkForUpdateAsync().catch(() => {});
      }
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (isUpdateAvailable && !isUpdatePending) {
      Updates.fetchUpdateAsync().catch(() => {});
    }
  }, [isUpdateAvailable, isUpdatePending]);

  return {
    isUpdatePending,
    applyUpdate: () => Updates.reloadAsync(),
  };
}
