import { createHash } from 'crypto';
import { Request } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export type TipoEvento =
  | 'CADASTRO'
  | 'LOGIN_SUCESSO'
  | 'LOGIN_FALHA'
  | 'LOGIN_BLOQUEADO'
  | 'LOGOUT'
  | 'SENHA_REDEFINICAO_SOLICITADA'
  | 'SENHA_REDEFINIDA'
  | 'SENHA_ALTERADA'
  | 'DADOS_ALTERADOS'
  | 'TERMOS_ACEITOS'
  | 'MFA_DESAFIO'
  | 'MFA_ATIVADA'
  | 'MFA_DESATIVADA'
  | 'MFA_CODIGO_RECUSADO'
  | 'MFA_RECUPERACAO_USADA'
  | 'CONTA_EXCLUIDA';

interface DadosEvento {
  tipo: TipoEvento;
  usuarioId?: number | null;
  email?: string;
  detalhe?: string;
  req?: Request;
}

export function hashIdentificador(email: string): string {
  return createHash('sha256').update(email.trim().toLowerCase()).digest('hex');
}

// Registra o evento no banco e no stdout. Nunca grava senha, token ou e-mail em texto:
// quem não tem usuário associado é identificado só pelo hash do e-mail informado.
// Uma falha no registro não pode derrubar a operação principal.
export async function registrarEvento({ tipo, usuarioId, email, detalhe, req }: DadosEvento): Promise<void> {
  const registro = {
    tipo,
    usuario_id: usuarioId ?? null,
    identificador: email ? hashIdentificador(email) : null,
    ip: req?.ip ?? null,
    user_agent: req?.get('user-agent')?.slice(0, 255) ?? null,
    detalhe: detalhe?.slice(0, 255) ?? null,
  };

  console.log(
    JSON.stringify({ origem: 'auth', evento: registro.tipo, usuario_id: registro.usuario_id, ip: registro.ip })
  );

  try {
    await prisma.eventoAuth.create({ data: registro });
  } catch (err) {
    console.error('[auth] Falha ao registrar evento de auditoria:', (err as Error).message);
  }
}

export async function removerEventosAntigos(dias: number): Promise<number> {
  const limite = new Date(Date.now() - dias * 24 * 60 * 60 * 1000);
  const { count } = await prisma.eventoAuth.deleteMany({ where: { criado_em: { lt: limite } } });
  return count;
}

// Eliminação do titular: os registros de segurança continuam existindo (tipo e data), mas sem
// nenhum dado que ligue a uma pessoa: usuário, IP, aparelho e hash do e-mail são apagados.
export async function anonimizarEventosDoTitular(usuarioId: number, email: string): Promise<number> {
  const { count } = await prisma.eventoAuth.updateMany({
    where: { OR: [{ usuario_id: usuarioId }, { identificador: hashIdentificador(email) }] },
    data: { usuario_id: null, identificador: null, ip: null, user_agent: null, detalhe: null },
  });
  return count;
}
