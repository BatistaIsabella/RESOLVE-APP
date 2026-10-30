import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';
import { getJwtSecret, isProducao } from '../config/env';
import { httpError } from './httpError';

// AES-256-GCM. Cada uso tem a sua chave (32 bytes em base64; gere com `openssl rand -base64 32`):
//   mfa   -> MFA_ENCRYPTION_KEY    (segredo do autenticador)
//   dados -> DADOS_ENCRYPTION_KEY  (colunas com dados pessoais, como o e-mail)
// Fora de produção, sem a variável, a chave é derivada do JWT_SECRET para o desenvolvimento funcionar.
export type UsoDaChave = 'mfa' | 'dados';

const VARIAVEL: Record<UsoDaChave, string> = { mfa: 'MFA_ENCRYPTION_KEY', dados: 'DADOS_ENCRYPTION_KEY' };

export function chaveConfigurada(uso: UsoDaChave): boolean {
  return Boolean(process.env[VARIAVEL[uso]]);
}

function chave(uso: UsoDaChave): Buffer {
  const configurada = process.env[VARIAVEL[uso]];

  if (configurada) {
    const bytes = Buffer.from(configurada, 'base64');
    if (bytes.length !== 32) throw new Error(`${VARIAVEL[uso]} deve ter 32 bytes em base64`);
    return bytes;
  }
  if (isProducao()) {
    if (uso === 'mfa') throw httpError('A verificação em duas etapas não está disponível no momento', 503);
    throw new Error(`${VARIAVEL[uso]} não definida`);
  }
  return createHash('sha256').update(`${uso}:${getJwtSecret()}`).digest();
}

// Formato gravado: base64(iv[12] + tag[16] + texto cifrado).
export function cifrar(texto: string, uso: UsoDaChave = 'mfa'): string {
  const iv = randomBytes(12);
  const cifra = createCipheriv('aes-256-gcm', chave(uso), iv);
  const cifrado = Buffer.concat([cifra.update(texto, 'utf8'), cifra.final()]);
  return Buffer.concat([iv, cifra.getAuthTag(), cifrado]).toString('base64');
}

export function decifrar(gravado: string, uso: UsoDaChave = 'mfa'): string {
  const bytes = Buffer.from(gravado, 'base64');
  const decifra = createDecipheriv('aes-256-gcm', chave(uso), bytes.subarray(0, 12));
  decifra.setAuthTag(bytes.subarray(12, 28));
  return Buffer.concat([decifra.update(bytes.subarray(28)), decifra.final()]).toString('utf8');
}
