import AsyncStorage from '@react-native-async-storage/async-storage';
import { StateStorage } from 'zustand/middleware';
import { isRemembered } from '@/lib/secureStorage';

/**
 * Storage do Zustand para o cache offline de demandas e métricas.
 *
 * Fica no AsyncStorage, e não no SecureStore como a sessão: não é segredo, e o
 * SecureStore limita cada valor a ~2 KB, pouco para uma lista de demandas.
 *
 * Segue a regra do "Mantenha-me conectado": se o usuário pediu para não
 * guardar a sessão, também não deixamos os dados dele em disco.
 */
export const cacheStorage: StateStorage = {
  getItem: (name) => AsyncStorage.getItem(name),

  setItem: async (name, value) => {
    if (!isRemembered()) return;
    await AsyncStorage.setItem(name, value);
  },

  removeItem: (name) => AsyncStorage.removeItem(name),
};
