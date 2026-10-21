import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';
import { getJwtSecret, isProducao } from '../config/env';
import { httpError } from './httpError';

// AES-256-GCM. A chave vem de MFA_ENCRYPTION_KEY (32 bytes em base64; gere com `openssl rand -base64 32`).
// Fora de produção, sem a variável, a chave é derivada do JWT_SECRET para o desenvolvimento funcionar.
function chave(): Buffer {
  const configurada = process.env.MFA_ENCRYPTION_KEY;

  if (configurada) {
    const bytes = Buffer.from(configurada, 'base64');
    if (bytes.length !== 32) throw new Error('MFA_ENCRYPTION_KEY deve ter 32 bytes em base64');
    return bytes;
  }
  if (isProducao()) {
    throw httpError('A verificação em duas etapas não está disponível no momento', 503);
  }
  return createHash('sha256').update(`mfa:${getJwtSecret()}`).digest();
}

// Formato gravado: base64(iv[12] + tag[16] + texto cifrado).
export function cifrar(texto: string): string {
  const iv = randomBytes(12);
  const cifra = createCipheriv('aes-256-gcm', chave(), iv);
  const cifrado = Buffer.concat([cifra.update(texto, 'utf8'), cifra.final()]);
  return Buffer.concat([iv, cifra.getAuthTag(), cifrado]).toString('base64');
}

export function decifrar(gravado: string): string {
  const bytes = Buffer.from(gravado, 'base64');
  const decifra = createDecipheriv('aes-256-gcm', chave(), bytes.subarray(0, 12));
  decifra.setAuthTag(bytes.subarray(12, 28));
  return Buffer.concat([decifra.update(bytes.subarray(28)), decifra.final()]).toString('utf8');
}
