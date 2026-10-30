import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';
import { getJwtSecret, isProducao } from '../config/env';

// O e-mail de quem registrou a ocorrência fica cifrado no banco (AES-256-GCM, chave DADOS_ENCRYPTION_KEY,
// a mesma do auth-service). Não é usado em buscas, então não precisa de valor de busca. O prefixo identifica
// a versão do formato e permite trocar a chave ou o algoritmo no futuro.
const PREFIXO = 'enc:v1:';

function chave(): Buffer {
  const configurada = process.env.DADOS_ENCRYPTION_KEY;

  if (configurada) {
    const bytes = Buffer.from(configurada, 'base64');
    if (bytes.length !== 32) throw new Error('DADOS_ENCRYPTION_KEY deve ter 32 bytes em base64');
    return bytes;
  }
  if (isProducao()) throw new Error('DADOS_ENCRYPTION_KEY não definida');
  // Fora de produção a chave é derivada do JWT_SECRET, igual ao auth-service, para os dois se entenderem.
  return createHash('sha256').update(`dados:${getJwtSecret()}`).digest();
}

// Formato gravado: prefixo + base64(iv[12] + tag[16] + texto cifrado).
export function protegerEmail(email: string): string {
  const iv = randomBytes(12);
  const cifra = createCipheriv('aes-256-gcm', chave(), iv);
  const cifrado = Buffer.concat([cifra.update(email.trim().toLowerCase(), 'utf8'), cifra.final()]);
  return PREFIXO + Buffer.concat([iv, cifra.getAuthTag(), cifrado]).toString('base64');
}

// Aceita também o e-mail em texto, de ocorrências anteriores à criptografia, até a migração gravá-lo cifrado.
export function revelarEmail(gravado: string): string {
  if (!gravado.startsWith(PREFIXO)) return gravado;
  const bytes = Buffer.from(gravado.slice(PREFIXO.length), 'base64');
  const decifra = createDecipheriv('aes-256-gcm', chave(), bytes.subarray(0, 12));
  decifra.setAuthTag(bytes.subarray(12, 28));
  return Buffer.concat([decifra.update(bytes.subarray(28)), decifra.final()]).toString('utf8');
}

export function emailEstaProtegido(gravado: string): boolean {
  return gravado.startsWith(PREFIXO);
}
