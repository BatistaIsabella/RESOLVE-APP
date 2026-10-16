export interface AuthSnapshot {
  token: string | null;
  role: 'cidadao' | 'gestor' | null;
  userEmail: string | null;
}

const vazio: AuthSnapshot = { token: null, role: null, userEmail: null };

let current: AuthSnapshot = vazio;
let unauthorizedHandler: (() => void) | null = null;

export function getAuthSnapshot(): AuthSnapshot {
  return current;
}

export function getAuthToken() {
  return current.token;
}

export function setAuthSnapshot(snapshot: AuthSnapshot | null) {
  current = snapshot ?? vazio;
}

export function setUnauthorizedHandler(handler: (() => void) | null) {
  unauthorizedHandler = handler;
}

export function notifyUnauthorized() {
  unauthorizedHandler?.();
}
