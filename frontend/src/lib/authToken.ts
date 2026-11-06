// Ponte entre a camada HTTP e o authStore: a API lê o token daqui e avisa quando o servidor
// recusa a sessão. Fica fora do store para evitar import circular (store -> service -> api -> store).
let currentToken: string | null = null;
let unauthorizedHandler: (() => void) | null = null;

export function getAuthToken(): string | null {
  return currentToken;
}

export function setAuthToken(token: string | null) {
  currentToken = token;
}

export function setUnauthorizedHandler(handler: (() => void) | null) {
  unauthorizedHandler = handler;
}

export function notifyUnauthorized() {
  unauthorizedHandler?.();
}
