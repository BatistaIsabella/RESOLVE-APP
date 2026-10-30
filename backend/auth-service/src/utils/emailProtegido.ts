import { createHash, createHmac } from 'crypto';
import { getJwtSecret, isProducao } from '../config/env';
import { cifrar, decifrar } from './cifra';

// O e-mail fica cifrado no banco (AES-256-GCM, chave DADOS_ENCRYPTION_KEY). Como a cifra muda a cada
// gravação, a busca do login usa um segundo valor: o HMAC-SHA256 do e-mail normalizado, com chave
// própria (EMAIL_HASH_KEY). Sem a chave, o hash não dá para ser refeito a partir de uma lista de e-mails.
// O prefixo identifica a versão do formato e permite trocar a chave ou o algoritmo no futuro.
const PREFIXO = 'enc:v1:';

function chaveDoHash(): Buffer {
  const configurada = process.env.EMAIL_HASH_KEY;

  if (configurada) {
    const bytes = Buffer.from(configurada, 'base64');
    if (bytes.length < 32) throw new Error('EMAIL_HASH_KEY deve ter pelo menos 32 bytes em base64');
    return bytes;
  }
  if (isProducao()) throw new Error('EMAIL_HASH_KEY não definida');
  return createHash('sha256').update(`email-hash:${getJwtSecret()}`).digest();
}

function normalizar(email: string): string {
  return email.trim().toLowerCase();
}

// Valor de busca do e-mail (64 caracteres hexadecimais).
export function hashDoEmail(email: string): string {
  return createHmac('sha256', chaveDoHash()).update(normalizar(email)).digest('hex');
}

export function protegerEmail(email: string): string {
  return PREFIXO + cifrar(normalizar(email), 'dados');
}

// Aceita também o e-mail em texto, de contas anteriores à criptografia, até a migração gravá-lo cifrado.
export function revelarEmail(gravado: string): string {
  if (!gravado.startsWith(PREFIXO)) return gravado;
  return decifrar(gravado.slice(PREFIXO.length), 'dados');
}

export function emailEstaProtegido(gravado: string): boolean {
  return gravado.startsWith(PREFIXO);
}
