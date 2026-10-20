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
