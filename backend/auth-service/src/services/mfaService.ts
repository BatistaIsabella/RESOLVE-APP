import { createHash, createHmac, randomBytes } from 'crypto';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { Request } from 'express';
import jwt from 'jsonwebtoken';
import { authenticator } from 'otplib';
import { getJwtSecret } from '../config/env';
import { cifrar, decifrar } from '../utils/cifra';
import { httpError } from '../utils/httpError';
import { registrarEvento } from './auditoriaService';
import { invalidarSessoes } from './sessaoService';
import { bloqueadoAte, chaveDoEmail, limparTentativas, registrarFalha } from './tentativasLoginService';

const prisma = new PrismaClient();

const EMISSOR = 'RESOLVE';
const QUANTIDADE_CODIGOS_RECUPERACAO = 8;
const MENSAGEM_BLOQUEIO = 'Muitas tentativas. Tente novamente em alguns minutos.';
const MENSAGEM_CODIGO_INVALIDO = 'Código inválido';

const PASSO_SEGUNDOS = 30;

// Aceita o código do app autenticador da janela atual e da anterior/seguinte (relógios um pouco fora de hora).
authenticator.options = { step: PASSO_SEGUNDOS, digits: 6, window: 1 };

type TipoDesafio = 'login' | 'setup';

// O desafio é um token curto, assinado com uma chave derivada diferente da usada na sessão.
// Por isso os outros serviços não o aceitam como sessão: ele só vale nas rotas de MFA do auth-service.
function chaveDoDesafio(): string {
  return createHmac('sha256', getJwtSecret()).update('mfa-desafio').digest('hex');
}

export function emitirDesafio(usuarioId: number, tipo: TipoDesafio): string {
  return jwt.sign({ userId: usuarioId, tipo }, chaveDoDesafio(), { expiresIn: tipo === 'login' ? '5m' : '15m' });
}

export function lerDesafio(desafio: unknown, tipo: TipoDesafio): number {
  try {
    const dados = jwt.verify(String(desafio), chaveDoDesafio()) as { userId: number; tipo: TipoDesafio };
    if (dados.tipo === tipo) return dados.userId;
  } catch {
    // cai no erro abaixo
  }
  throw httpError('Desafio inválido ou expirado. Faça login novamente', 401);
}

export function mfaObrigatoriaParaGestor(): boolean {
  return process.env.MFA_OBRIGATORIO_GESTOR === 'true';
}

function chaveDeBloqueio(usuarioId: number): string {
  return chaveDoEmail(`mfa:${usuarioId}`);
}

function hashDoCodigoDeRecuperacao(codigo: string): string {
  return createHash('sha256').update(codigo.toLowerCase().replace(/[^a-z0-9]/g, '')).digest('hex');
}

function gerarCodigosDeRecuperacao(): string[] {
  return Array.from({ length: QUANTIDADE_CODIGOS_RECUPERACAO }, () => {
    const hex = randomBytes(5).toString('hex');
    return `${hex.slice(0, 5)}-${hex.slice(5)}`;
  });
}

async function buscarGestor(usuarioId: number) {
  const usuario = await prisma.usuario.findUnique({ where: { id: usuarioId } });
  if (!usuario) throw httpError('Usuário não encontrado', 404);
  if (usuario.papel !== 'GESTOR') {
    throw httpError('A verificação em duas etapas é para contas de gestor', 403);
  }
  return usuario;
}

// Cadastro do segredo. Ele só passa a valer depois que o primeiro código for confirmado em `ativar`.
export async function iniciarConfiguracao(usuarioId: number) {
  const usuario = await buscarGestor(usuarioId);
  if (usuario.mfa_ativo) throw httpError('A verificação em duas etapas já está ativa', 409);

  const segredo = authenticator.generateSecret();
  await prisma.usuario.update({
    where: { id: usuarioId },
    data: { mfa_segredo: cifrar(segredo), mfa_ultimo_passo: null },
  });

  return { segredo, otpauthUri: authenticator.keyuri(usuario.email, EMISSOR, segredo) };
}

function passoAtual(): number {
  return Math.floor(Date.now() / 1000 / PASSO_SEGUNDOS);
}

// Confere um código TOTP. Um mesmo código não vale duas vezes (o passo de tempo já usado é recusado).
function conferirTotp(codigo: string, segredo: string, ultimoPasso: number | null): number | null {
  const delta = authenticator.checkDelta(codigo, segredo);
  if (delta === null) return null;
  const passo = passoAtual() + delta;
  return ultimoPasso !== null && passo <= ultimoPasso ? null : passo;
}

export async function ativar(usuarioId: number, codigo: unknown, req?: Request): Promise<string[]> {
  const usuario = await buscarGestor(usuarioId);
  if (usuario.mfa_ativo) throw httpError('A verificação em duas etapas já está ativa', 409);
  if (!usuario.mfa_segredo) throw httpError('Inicie a configuração antes de confirmar o código', 400);

  const passo = typeof codigo === 'string' ? conferirTotp(codigo.trim(), decifrar(usuario.mfa_segredo), null) : null;
  if (passo === null) throw httpError(MENSAGEM_CODIGO_INVALIDO, 400);

  const codigos = gerarCodigosDeRecuperacao();
  await prisma.$transaction([
    prisma.codigoRecuperacaoMfa.deleteMany({ where: { usuario_id: usuarioId } }),
    prisma.codigoRecuperacaoMfa.createMany({
      data: codigos.map((c) => ({ usuario_id: usuarioId, codigo_hash: hashDoCodigoDeRecuperacao(c) })),
    }),
    prisma.usuario.update({ where: { id: usuarioId }, data: { mfa_ativo: true, mfa_ultimo_passo: passo } }),
  ]);

  await registrarEvento({ tipo: 'MFA_ATIVADA', usuarioId, req });
  return codigos;
}

// Segundo fator no login e na desativação: código do app autenticador ou código de recuperação.
export async function verificarSegundoFator(usuarioId: number, codigo: unknown, req?: Request): Promise<void> {
  const chave = chaveDeBloqueio(usuarioId);

  if (await bloqueadoAte(chave)) {
    await registrarEvento({ tipo: 'MFA_CODIGO_RECUSADO', usuarioId, detalhe: 'bloqueado', req });
    throw httpError(MENSAGEM_BLOQUEIO, 429);
  }

  const usuario = await prisma.usuario.findUnique({ where: { id: usuarioId } });
  const texto = typeof codigo === 'string' ? codigo.trim() : '';
  let aceito = false;

  if (usuario?.mfa_ativo && usuario.mfa_segredo && texto) {
    if (/^\d{6}$/.test(texto)) {
      const passo = conferirTotp(texto, decifrar(usuario.mfa_segredo), usuario.mfa_ultimo_passo);
      if (passo !== null) {
        // Só avança se ninguém usou o mesmo passo no meio do caminho.
        const { count } = await prisma.usuario.updateMany({
          where: { id: usuarioId, OR: [{ mfa_ultimo_passo: null }, { mfa_ultimo_passo: { lt: passo } }] },
          data: { mfa_ultimo_passo: passo },
        });
        aceito = count === 1;
      }
    } else {
      const { count } = await prisma.codigoRecuperacaoMfa.updateMany({
        where: { usuario_id: usuarioId, codigo_hash: hashDoCodigoDeRecuperacao(texto), usado_em: null },
        data: { usado_em: new Date() },
      });
      aceito = count === 1;
      if (aceito) await registrarEvento({ tipo: 'MFA_RECUPERACAO_USADA', usuarioId, req });
    }
  }

  if (!aceito) {
    await registrarFalha(chave);
    await registrarEvento({ tipo: 'MFA_CODIGO_RECUSADO', usuarioId, req });
    throw httpError(MENSAGEM_CODIGO_INVALIDO, 401);
  }

  await limparTentativas(chave);
}

export async function desativar(usuarioId: number, senha: unknown, codigo: unknown, req?: Request) {
  const usuario = await buscarGestor(usuarioId);
  if (!usuario.mfa_ativo) throw httpError('A verificação em duas etapas não está ativa', 409);

  if (typeof senha !== 'string' || !(await bcrypt.compare(senha, usuario.senha))) {
    throw httpError('Senha incorreta', 403);
  }
  await verificarSegundoFator(usuarioId, codigo, req);

  await prisma.$transaction([
    prisma.codigoRecuperacaoMfa.deleteMany({ where: { usuario_id: usuarioId } }),
    prisma.usuario.update({
      where: { id: usuarioId },
      data: { mfa_ativo: false, mfa_segredo: null, mfa_ultimo_passo: null },
    }),
  ]);

  await invalidarSessoes(usuarioId);
  await registrarEvento({ tipo: 'MFA_DESATIVADA', usuarioId, req });
}
