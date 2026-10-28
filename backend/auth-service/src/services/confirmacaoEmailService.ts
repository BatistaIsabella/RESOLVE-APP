import { createHash, randomBytes } from 'crypto';
import { Request } from 'express';
import { config } from '../config/env';
import { prisma } from '../lib/prisma';
import { hashDoEmail } from '../utils/emailProtegido';
import { httpError } from '../utils/httpError';
import { registrarEvento } from './auditoriaService';
import { enviarEmailConfirmacao } from './emailService';

const INTERVALO_MINIMO_MS = 60 * 1000;

function hashDoToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

// Gera o código de confirmação e o envia ao e-mail. Só o hash do código fica no banco.
// Uma falha de envio não derruba o cadastro: a pessoa pode pedir o reenvio.
export async function emitirConfirmacao(usuarioId: number, email: string): Promise<void> {
  const token = randomBytes(24).toString('base64url');
  const validade = config.tokenConfirmacaoHoras();

  await prisma.tokenConfirmacaoEmail.deleteMany({ where: { usuario_id: usuarioId } });
  await prisma.tokenConfirmacaoEmail.create({
    data: {
      usuario_id: usuarioId,
      token_hash: hashDoToken(token),
      expira_em: new Date(Date.now() + validade * 60 * 60 * 1000),
    },
  });

  try {
    await enviarEmailConfirmacao(email, token, validade);
  } catch (err) {
    console.error('[auth] Falha ao enviar e-mail de confirmação:', (err as Error).message);
  }
}

// A resposta é sempre a mesma: não revela se o e-mail tem conta nem se ela já foi confirmada.
export async function reenviarConfirmacao(email: string, req?: Request): Promise<void> {
  const usuario = await prisma.usuario.findUnique({ where: { email_hash: hashDoEmail(email) } });
  if (!usuario || !usuario.email_pendente) return;

  const recente = await prisma.tokenConfirmacaoEmail.findFirst({
    where: { usuario_id: usuario.id, criado_em: { gt: new Date(Date.now() - INTERVALO_MINIMO_MS) } },
  });
  if (recente) return;

  await registrarEvento({ tipo: 'CONFIRMACAO_REENVIADA', usuarioId: usuario.id, req });
  await emitirConfirmacao(usuario.id, usuario.email);
}

export async function confirmarEmail(token: unknown, req?: Request): Promise<void> {
  if (typeof token !== 'string' || token.length === 0) {
    throw httpError('Código inválido ou expirado', 400);
  }

  const registro = await prisma.tokenConfirmacaoEmail.findUnique({ where: { token_hash: hashDoToken(token) } });
  if (!registro || registro.usado_em || registro.expira_em.getTime() <= Date.now()) {
    throw httpError('Código inválido ou expirado', 400);
  }

  // O updateMany condicionado garante uso único mesmo com dois pedidos simultâneos.
  const confirmou = await prisma.$transaction(async (tx) => {
    const marcado = await tx.tokenConfirmacaoEmail.updateMany({
      where: { id: registro.id, usado_em: null },
      data: { usado_em: new Date() },
    });
    if (marcado.count === 0) return false;

    await tx.usuario.update({ where: { id: registro.usuario_id }, data: { email_pendente: false } });
    await tx.tokenConfirmacaoEmail.deleteMany({ where: { usuario_id: registro.usuario_id, id: { not: registro.id } } });
    return true;
  });

  if (!confirmou) throw httpError('Código inválido ou expirado', 400);

  await registrarEvento({ tipo: 'EMAIL_CONFIRMADO', usuarioId: registro.usuario_id, req });
}

// Contas que não foram confirmadas a tempo liberam o e-mail para quem for o dono de verdade.
export async function removerContasNaoConfirmadas(): Promise<number> {
  const limite = new Date(Date.now() - config.contaNaoConfirmadaDias() * 24 * 60 * 60 * 1000);
  const { count } = await prisma.usuario.deleteMany({ where: { email_pendente: true, criado_em: { lt: limite } } });
  await prisma.tokenConfirmacaoEmail.deleteMany({
    where: { OR: [{ expira_em: { lt: new Date() } }, { usado_em: { not: null } }] },
  });
  return count;
}
