import * as SecureStore from 'expo-secure-store';

export interface StoredSession {
  token: string;
  role: 'cidadao' | 'gestor';
  userName: string | null;
  userEmail: string | null;
  orgao: string | null;
  // Verdadeiro enquanto o usuário não aceitou a versão vigente da política e dos termos.
  termosPendentes: boolean;
}

const SESSION_KEY = 'resolve-mobile-auth';

let remembered = true;

export function setRemembered(value: boolean) {
  remembered = value;
}

export function isRemembered() {
  return remembered;
}

export async function loadSession(): Promise<StoredSession | null> {
  const raw = await SecureStore.getItemAsync(SESSION_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    const data = parsed?.state ?? parsed;
    if (typeof data?.token !== 'string' || (data.role !== 'cidadao' && data.role !== 'gestor')) {
      return null;
    }
    return {
      token: data.token,
      role: data.role,
      userName: data.userName ?? null,
      userEmail: data.userEmail ?? null,
      orgao: data.orgao ?? null,
      termosPendentes: data.termosPendentes === true,
    };
  } catch {
    return null;
  }
}

export async function saveSession(session: StoredSession): Promise<void> {
  if (!remembered) {
    await SecureStore.deleteItemAsync(SESSION_KEY);
    return;
  }
  await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session));
}

export async function clearSession(): Promise<void> {
  await SecureStore.deleteItemAsync(SESSION_KEY);
}
