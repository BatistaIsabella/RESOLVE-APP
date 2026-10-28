import { createHash, randomBytes } from 'crypto';
import { Request } from 'express';
import { config } from '../config/env';
import { prisma } from '../lib/prisma';
import { hashDoEmail } from '../utils/emailProtegido';
import { httpError } from '../utils/httpError';
import { registrarEvento } from './auditoriaService';
import { normalizarEmail } from './authService';
import { enviarEmailRedefinicao } from './emailService';
import { assegurarSenhaAceitavel, hashSenha } from './senhaService';
import { invalidarSessoes } from './sessaoService';
import { chaveDoEmail, limparTentativas } from './tentativasLoginService';

const INTERVALO_MINIMO_MS = 60 * 1000;

function hashDoToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

// A resposta é sempre a mesma, exista ou não a conta, para não revelar e-mails cadastrados.
// Só o hash do token fica no banco; o valor em si vai apenas por e-mail.
export async function solicitarRedefinicao(emailInformado: string, req?: Request): Promise<void> {
  const email = normalizarEmail(emailInformado);
  const usuario = await prisma.usuario.findUnique({ where: { email_hash: hashDoEmail(email) } });

  await registrarEvento({ tipo: 'SENHA_REDEFINICAO_SOLICITADA', usuarioId: usuario?.id, email, req });
  if (!usuario) return;

  const recente = await prisma.tokenRedefinicao.findFirst({
    where: { usuario_id: usuario.id, criado_em: { gt: new Date(Date.now() - INTERVALO_MINIMO_MS) } },
  });
  if (recente) return;

  const token = randomBytes(24).toString('base64url');
  const validade = config.tokenRedefinicaoMinutos();

  await prisma.tokenRedefinicao.create({
    data: {
      usuario_id: usuario.id,
      token_hash: hashDoToken(token),
      expira_em: new Date(Date.now() + validade * 60 * 1000),
    },
  });

  try {
    await enviarEmailRedefinicao(usuario.email, token, validade);
  } catch (err) {
    console.error('[auth] Falha ao enviar e-mail de redefinição:', (err as Error).message);
  }
}

export async function redefinirSenha(token: unknown, novaSenha: unknown, req?: Request): Promise<void> {
  if (typeof token !== 'string' || token.length === 0) {
    throw httpError('Token inválido ou expirado', 400);
  }

  const registro = await prisma.tokenRedefinicao.findUnique({
    where: { token_hash: hashDoToken(token) },
    include: { usuario: true },
  });

  if (!registro || registro.usado_em || registro.expira_em.getTime() <= Date.now()) {
    throw httpError('Token inválido ou expirado', 400);
  }

  const { usuario } = registro;
  await assegurarSenhaAceitavel(novaSenha, { email: usuario.email, nome: usuario.nome });
  const hash = await hashSenha(novaSenha as string);

  // O updateMany condicionado garante uso único mesmo com dois pedidos simultâneos.
  const resultado = await prisma.$transaction(async (tx) => {
    const marcado = await tx.tokenRedefinicao.updateMany({
      where: { id: registro.id, usado_em: null },
      data: { usado_em: new Date() },
    });
    if (marcado.count === 0) return false;

    // Quem recebe e usa o código de redefinição prova que é dono do e-mail, então a conta também fica confirmada.
    await tx.usuario.update({ where: { id: usuario.id }, data: { senha: hash, email_pendente: false } });
    await tx.tokenRedefinicao.deleteMany({ where: { usuario_id: usuario.id, id: { not: registro.id } } });
    return true;
  });

  if (!resultado) throw httpError('Token inválido ou expirado', 400);

  await invalidarSessoes(usuario.id);
  await limparTentativas(chaveDoEmail(usuario.email));
  await registrarEvento({ tipo: 'SENHA_REDEFINIDA', usuarioId: usuario.id, req });
}

export async function removerTokensVencidos(): Promise<number> {
  const { count } = await prisma.tokenRedefinicao.deleteMany({
    where: { OR: [{ expira_em: { lt: new Date() } }, { usado_em: { not: null } }] },
  });
  return count;
}
