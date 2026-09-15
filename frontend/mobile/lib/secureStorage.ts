import * as SecureStore from 'expo-secure-store';
import { StateStorage } from 'zustand/middleware';

let remembered = true;

/**
 * Chamado pela tela de login com o valor do checkbox "Mantenha-me conectado"
 * antes de autenticar.
 */
export function setRemembered(value: boolean) {
  remembered = value;
}

/**
 * Storage do Zustand que guarda o token no Keychain/Keystore (via
 * expo-secure-store) em vez de AsyncStorage puro, por ser um JWT de sessão.
 *
 * Não existe um equivalente nativo de sessionStorage: quando o usuário
 * desmarca "Mantenha-me conectado", a sessão simplesmente não é gravada em
 * disco (só vive em memória enquanto o app está aberto).
 */
export const secureStorage: StateStorage = {
  getItem: async (name) => (await SecureStore.getItemAsync(name)) ?? null,

  setItem: async (name, value) => {
    if (!remembered) return;
    await SecureStore.setItemAsync(name, value);
  },

  removeItem: async (name) => {
    await SecureStore.deleteItemAsync(name);
  },
};
