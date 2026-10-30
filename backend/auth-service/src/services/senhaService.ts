import bcrypt from 'bcryptjs';
import { config } from '../config/env';
import { httpError } from '../utils/httpError';
import { ContextoSenha, validarPoliticaSenha } from '../utils/senha';
import { senhaVazada } from './senhaVazada';

export function hashSenha(senha: string): Promise<string> {
  return bcrypt.hash(senha, config.bcryptRounds());
}

// Hash usado para gastar o mesmo tempo quando o e-mail não existe,
// evitando que a diferença de tempo revele quais contas estão cadastradas.
let hashFalso: string | null = null;
export async function gastarTempoDeComparacao(senha: string): Promise<void> {
  hashFalso ??= await hashSenha('senha-falsa-para-igualar-tempo');
  await bcrypt.compare(senha, hashFalso);
}

export async function assegurarSenhaAceitavel(senha: unknown, contexto: ContextoSenha): Promise<string> {
  const erros = validarPoliticaSenha(senha, contexto);
  if (erros.length > 0) {
    throw httpError('A senha não atende à política de segurança', 400, erros);
  }

  if (await senhaVazada(senha as string)) {
    throw httpError('Essa senha apareceu em vazamentos de dados. Escolha outra', 400, [
      'Essa senha apareceu em vazamentos de dados. Escolha outra',
    ]);
  }

  return senha as string;
}
