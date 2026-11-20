import AsyncStorage from '@react-native-async-storage/async-storage';

import { isRemembered } from '@/lib/secureStorage';
import { DemandCache, lerCache } from '@/utils/demandCache';

// AsyncStorage, e não SecureStore como a sessão: a lista não é segredo e o
// SecureStore limita cada valor a cerca de 2 KB.
const CACHE_KEY = 'resolve-mobile-demandas';

export async function loadDemandCache(email: string | null): Promise<DemandCache | null> {
  return lerCache(await AsyncStorage.getItem(CACHE_KEY), email);
}

export async function saveDemandCache(cache: DemandCache): Promise<void> {
  // Mesma regra da sessão: sem "Mantenha-me conectado", nada fica no aparelho.
  if (!isRemembered()) {
    await AsyncStorage.removeItem(CACHE_KEY);
    return;
  }
  await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cache));
}

export async function clearDemandCache(): Promise<void> {
  await AsyncStorage.removeItem(CACHE_KEY);
}
