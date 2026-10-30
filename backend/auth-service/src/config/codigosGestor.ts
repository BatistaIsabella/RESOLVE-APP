import { createHash, timingSafeEqual } from 'crypto';
import { ORGAOS } from './orgaos';
import { isProducao } from './env';

const CODIGO_DESENVOLVIMENTO = 'change-me-codigo-gestor';

// GESTOR_ACCESS_CODES no formato "ORGAO=codigo;ORGAO2=codigo2".
// GESTOR_ACCESS_CODE (um código só) continua valendo e libera a gestão geral.
// Em produção não existe valor padrão: sem configuração o cadastro de gestor fica fechado.
function carregarCodigos(): Array<{ orgao: string; codigo: string }> {
  const lista: Array<{ orgao: string; codigo: string }> = [];

  for (const parte of (process.env.GESTOR_ACCESS_CODES ?? '').split(';')) {
    const [orgao, ...resto] = parte.split('=');
    const codigo = resto.join('=').trim();
    if (orgao && codigo && orgao.trim() in ORGAOS) {
      lista.push({ orgao: orgao.trim(), codigo });
    }
  }

  const unico = process.env.GESTOR_ACCESS_CODE;
  if (unico) lista.push({ orgao: 'GERAL', codigo: unico });

  if (lista.length === 0 && !isProducao()) {
    lista.push({ orgao: 'GERAL', codigo: CODIGO_DESENVOLVIMENTO });
  }

  return lista;
}

function digest(valor: string): Buffer {
  return createHash('sha256').update(valor).digest();
}

// Devolve o órgão ao qual o código dá acesso, ou null se o código não existir.
export function orgaoPorCodigo(informado: unknown): string | null {
  if (typeof informado !== 'string' || informado.length === 0) return null;
  const alvo = digest(informado);

  let encontrado: string | null = null;
  for (const { orgao, codigo } of carregarCodigos()) {
    if (timingSafeEqual(alvo, digest(codigo)) && encontrado === null) {
      encontrado = orgao;
    }
  }
  return encontrado;
}
