import { BASES_COMUNS, SENHAS_COMUNS } from './senhasComuns';

export const SENHA_TAMANHO_MINIMO = 12;
// O bcrypt só considera os primeiros 72 bytes; acima disso a senha seria truncada.
export const SENHA_BYTES_MAXIMO = 72;

export interface ContextoSenha {
  email?: string;
  nome?: string;
}

function apenasLetras(valor: string): string {
  return valor
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z]/g, '');
}

function usaTrechoDe(senha: string, trecho: string | undefined): boolean {
  if (!trecho) return false;
  const alvo = apenasLetras(trecho);
  if (alvo.length < 4) return false;
  return apenasLetras(senha).includes(alvo);
}

// Devolve os motivos pelos quais a senha não atende à política.
// Lista vazia significa que a senha é aceita.
export function validarPoliticaSenha(senha: unknown, contexto: ContextoSenha = {}): string[] {
  if (typeof senha !== 'string') return ['A senha deve ser um texto'];

  const erros: string[] = [];

  if (senha.length < SENHA_TAMANHO_MINIMO) {
    erros.push(`A senha deve ter pelo menos ${SENHA_TAMANHO_MINIMO} caracteres`);
  }
  if (Buffer.byteLength(senha, 'utf8') > SENHA_BYTES_MAXIMO) {
    erros.push(`A senha deve ter no máximo ${SENHA_BYTES_MAXIMO} bytes`);
  }
  if (!/[A-Z]/.test(senha)) erros.push('A senha deve ter pelo menos uma letra maiúscula');
  if (!/[a-z]/.test(senha)) erros.push('A senha deve ter pelo menos uma letra minúscula');
  if (!/[0-9]/.test(senha)) erros.push('A senha deve ter pelo menos um número');
  if (!/[^A-Za-z0-9]/.test(senha)) erros.push('A senha deve ter pelo menos um caractere especial');

  if (erros.length === 0) {
    if (SENHAS_COMUNS.has(senha.toLowerCase()) || BASES_COMUNS.has(apenasLetras(senha))) {
      erros.push('A senha é muito comum. Escolha outra');
    } else if (/(.)\1{4,}/.test(senha)) {
      erros.push('A senha não pode ter o mesmo caractere repetido várias vezes');
    } else if (
      usaTrechoDe(senha, contexto.email?.split('@')[0]) ||
      usaTrechoDe(senha, contexto.nome?.split(' ')[0])
    ) {
      erros.push('A senha não pode conter seu nome ou e-mail');
    }
  }

  return erros;
}
