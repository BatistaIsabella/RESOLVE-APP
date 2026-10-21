import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { Request } from 'express';
import { mfaHabilitada, versaoTermosAtual } from '../config/env';
import { httpError } from '../utils/httpError';
import { anonimizarEventosDoTitular, registrarEvento } from './auditoriaService';
import { emailValido, normalizarEmail, termosPendentes } from './authService';
import { mfaObrigatoriaParaGestor } from './mfaService';
import { assegurarSenhaAceitavel, hashSenha } from './senhaService';
import { invalidarSessoes } from './sessaoService';
import { emitirToken, orgaoEfetivo } from './tokenService';
import { chaveDoEmail, limparTentativas } from './tentativasLoginService';

const prisma = new PrismaClient();

async function buscarUsuario(usuarioId: number) {
  const usuario = await prisma.usuario.findUnique({ where: { id: usuarioId } });
  if (!usuario) throw httpError('Usuário não encontrado', 404);
  return usuario;
}

function formatarConta(usuario: NonNullable<Awaited<ReturnType<typeof buscarUsuario>>>) {
  const orgao = orgaoEfetivo(usuario);
  return {
    id: usuario.id,
    nome: usuario.nome,
    email: usuario.email,
    papel: usuario.papel.toLowerCase() as 'cidadao' | 'gestor',
    ...(orgao ? { orgao } : {}),
    aceiteTermosEm: usuario.aceite_termos_em,
    versaoTermos: usuario.versao_termos,
    termosPendentes: termosPendentes(usuario),
    mfa: {
      // O app só mostra a opção de MFA quando isto é verdadeiro. Quem já a tem ativa a vê mesmo com o recurso desligado.
      disponivel: usuario.papel === 'GESTOR' && (mfaHabilitada() || usuario.mfa_ativo),
      ativa: usuario.mfa_ativo,
      obrigatoria: usuario.papel === 'GESTOR' && mfaObrigatoriaParaGestor(),
    },
  };
}

async function conferirSenhaAtual(senha: unknown, hash: string) {
  if (typeof senha !== 'string' || senha.length === 0) {
    throw httpError('Informe a senha atual', 400);
  }
  if (!(await bcrypt.compare(senha, hash))) {
    throw httpError('Senha atual incorreta', 403);
  }
}

export async function obterConta(usuarioId: number) {
  return formatarConta(await buscarUsuario(usuarioId));
}

export async function atualizarConta(
  usuarioId: number,
  entrada: { nome?: unknown; email?: unknown },
  req?: Request
) {
  const usuario = await buscarUsuario(usuarioId);
  const alteracoes: { nome?: string; email?: string } = {};

  if (entrada.nome !== undefined) {
    if (typeof entrada.nome !== 'string' || entrada.nome.trim().length === 0 || entrada.nome.trim().length > 100) {
      throw httpError('nome deve ter entre 1 e 100 caracteres', 400);
    }
    alteracoes.nome = entrada.nome.trim();
  }

  if (entrada.email !== undefined) {
    if (typeof entrada.email !== 'string' || !emailValido(normalizarEmail(entrada.email))) {
      throw httpError('E-mail inválido', 400);
    }
    const novoEmail = normalizarEmail(entrada.email);
    if (novoEmail !== usuario.email.toLowerCase()) {
      const existente = await prisma.usuario.findFirst({
        where: { email: { equals: novoEmail, mode: 'insensitive' }, NOT: { id: usuarioId } },
      });
      if (existente) throw httpError('E-mail já cadastrado', 409);
      alteracoes.email = novoEmail;
    }
  }

  if (Object.keys(alteracoes).length === 0) {
    throw httpError('Informe nome ou email para atualizar', 400);
  }

  const atualizado = await prisma.usuario.update({ where: { id: usuarioId }, data: alteracoes });
  await registrarEvento({
    tipo: 'DADOS_ALTERADOS',
    usuarioId,
    detalhe: Object.keys(alteracoes).join(','),
    req,
  });

  return { conta: formatarConta(atualizado), token: await emitirToken(atualizado) };
}

export async function alterarSenha(
  usuarioId: number,
  senhaAtual: unknown,
  novaSenha: unknown,
  req?: Request
) {
  const usuario = await buscarUsuario(usuarioId);
  await conferirSenhaAtual(senhaAtual, usuario.senha);

  if (senhaAtual === novaSenha) {
    throw httpError('A nova senha deve ser diferente da atual', 400);
  }
  await assegurarSenhaAceitavel(novaSenha, { email: usuario.email, nome: usuario.nome });

  const atualizado = await prisma.usuario.update({
    where: { id: usuarioId },
    data: { senha: await hashSenha(novaSenha as string) },
  });

  await invalidarSessoes(usuarioId);
  await registrarEvento({ tipo: 'SENHA_ALTERADA', usuarioId, req });

  // O token novo já nasce na versão de sessão atual, então quem trocou a senha continua logado.
  return { token: await emitirToken(atualizado) };
}

export async function aceitarTermos(usuarioId: number, versao: unknown, req?: Request) {
  if (versao !== versaoTermosAtual()) {
    throw httpError(`Versão dos termos inválida. A versão vigente é ${versaoTermosAtual()}`, 400);
  }

  const atualizado = await prisma.usuario.update({
    where: { id: usuarioId },
    data: { aceite_termos_em: new Date(), versao_termos: versaoTermosAtual() },
  });
  await registrarEvento({ tipo: 'TERMOS_ACEITOS', usuarioId, detalhe: versaoTermosAtual(), req });

  return formatarConta(atualizado);
}

// A exclusão primeiro anonimiza os dados no demand-service (que guarda as ocorrências)
// e só depois remove a conta. Se o demand-service falhar, nada é apagado.
async function anonimizarOcorrencias(authorization: string) {
  const base = process.env.DEMAND_SERVICE_URL ?? 'http://demand-service:3002';

  let resposta: Response;
  try {
    resposta = await fetch(`${base}/demandas/me`, {
      method: 'DELETE',
      headers: { Authorization: authorization },
      signal: AbortSignal.timeout(10000),
    });
  } catch {
    throw httpError('Não foi possível concluir a exclusão agora. Tente novamente em instantes', 502);
  }

  if (!resposta.ok) {
    throw httpError('Não foi possível concluir a exclusão agora. Tente novamente em instantes', 502);
  }
}

export async function excluirConta(usuarioId: number, senha: unknown, authorization: string) {
  const usuario = await buscarUsuario(usuarioId);
  await conferirSenhaAtual(senha, usuario.senha);

  await anonimizarOcorrencias(authorization);

  await prisma.usuario.delete({ where: { id: usuarioId } });
  await limparTentativas(chaveDoEmail(usuario.email));
  // Os tokens ainda não expirados deixam de valer para os três serviços.
  await invalidarSessoes(usuarioId);

  // Os registros de segurança antigos perdem a ligação com a pessoa, e o da exclusão guarda só tipo e data.
  await anonimizarEventosDoTitular(usuarioId, usuario.email);
  await registrarEvento({ tipo: 'CONTA_EXCLUIDA' });
}
