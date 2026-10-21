import { PrismaClient, Prisma, Usuario } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { Request } from 'express';
import { versaoTermosAtual } from '../config/env';
import { httpError } from '../utils/httpError';
import { registrarEvento } from './auditoriaService';
import { assegurarSenhaAceitavel, gastarTempoDeComparacao, hashSenha } from './senhaService';
import { emitirDesafio, lerDesafio, mfaObrigatoriaParaGestor, verificarSegundoFator } from './mfaService';
import { emitirToken, orgaoEfetivo } from './tokenService';
import { bloqueadoAte, chaveDoEmail, limparTentativas, registrarFalha } from './tentativasLoginService';

const prisma = new PrismaClient();

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizarEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function emailValido(email: string): boolean {
  return email.length <= 254 && EMAIL_REGEX.test(email);
}

export function termosPendentes(usuario: { aceite_termos_em: Date | null; versao_termos: string | null }): boolean {
  return !usuario.aceite_termos_em || usuario.versao_termos !== versaoTermosAtual();
}

export interface DadosCadastro {
  nome: string;
  email: string;
  senha: string;
  papel: 'cidadao' | 'gestor';
  orgao: string | null;
  aceiteTermos: boolean;
  versaoTermos?: string;
}

export async function register(dados: DadosCadastro, req?: Request) {
  const nome = dados.nome.trim();
  const email = normalizarEmail(dados.email);

  if (nome.length === 0 || nome.length > 100) {
    throw httpError('nome deve ter entre 1 e 100 caracteres', 400);
  }
  if (!emailValido(email)) {
    throw httpError('E-mail inválido', 400);
  }
  if (dados.aceiteTermos !== true || dados.versaoTermos !== versaoTermosAtual()) {
    throw httpError('É necessário aceitar a Política de Privacidade e os Termos de Uso', 400);
  }

  await assegurarSenhaAceitavel(dados.senha, { email, nome });

  const existente = await prisma.usuario.findFirst({ where: { email: { equals: email, mode: 'insensitive' } } });
  if (existente) throw httpError('E-mail já cadastrado', 409);

  try {
    const usuario = await prisma.usuario.create({
      data: {
        nome,
        email,
        senha: await hashSenha(dados.senha),
        papel: dados.papel === 'gestor' ? 'GESTOR' : 'CIDADAO',
        orgao: dados.papel === 'gestor' ? dados.orgao : null,
        aceite_termos_em: new Date(),
        versao_termos: versaoTermosAtual(),
      },
    });

    await registrarEvento({ tipo: 'CADASTRO', usuarioId: usuario.id, email, detalhe: dados.papel, req });

    return {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      papel: dados.papel,
      ...(usuario.orgao ? { orgao: usuario.orgao } : {}),
    };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw httpError('E-mail já cadastrado', 409);
    }
    throw err;
  }
}

const MENSAGEM_CREDENCIAIS = 'Credenciais inválidas';
const MENSAGEM_BLOQUEIO = 'Muitas tentativas de login. Tente novamente em alguns minutos.';

export async function login(emailInformado: string, senha: string, req?: Request) {
  const email = normalizarEmail(emailInformado);
  const chave = chaveDoEmail(email);

  const ate = await bloqueadoAte(chave);
  if (ate) {
    await registrarEvento({ tipo: 'LOGIN_BLOQUEADO', email, req });
    const err = httpError(MENSAGEM_BLOQUEIO, 429);
    (err as Error & { retryAfter?: number }).retryAfter = Math.max(1, Math.ceil((ate.getTime() - Date.now()) / 1000));
    throw err;
  }

  const usuario = await prisma.usuario.findFirst({ where: { email: { equals: email, mode: 'insensitive' } } });

  let senhaConfere = false;
  if (usuario) {
    senhaConfere = await bcrypt.compare(senha, usuario.senha);
  } else {
    await gastarTempoDeComparacao(senha);
  }

  if (!usuario || !senhaConfere) {
    const { bloqueado } = await registrarFalha(chave);
    await registrarEvento({
      tipo: 'LOGIN_FALHA',
      usuarioId: usuario?.id,
      email,
      detalhe: bloqueado ? 'conta bloqueada temporariamente' : undefined,
      req,
    });
    throw httpError(MENSAGEM_CREDENCIAIS, 401);
  }

  await limparTentativas(chave);

  // Com a verificação em duas etapas, a senha certa ainda não abre a sessão: devolve só um desafio.
  if (usuario.mfa_ativo) {
    await registrarEvento({ tipo: 'MFA_DESAFIO', usuarioId: usuario.id, email, req });
    return { mfaNecessaria: true as const, desafio: emitirDesafio(usuario.id, 'login') };
  }
  if (usuario.papel === 'GESTOR' && mfaObrigatoriaParaGestor()) {
    await registrarEvento({ tipo: 'MFA_DESAFIO', usuarioId: usuario.id, email, detalhe: 'configuração obrigatória', req });
    return { mfaConfiguracaoNecessaria: true as const, desafio: emitirDesafio(usuario.id, 'setup') };
  }

  await registrarEvento({ tipo: 'LOGIN_SUCESSO', usuarioId: usuario.id, email, req });
  return respostaDeLogin(usuario);
}

export async function respostaDeLogin(usuario: Usuario) {
  const orgao = orgaoEfetivo(usuario);

  return {
    token: await emitirToken(usuario),
    papel: usuario.papel.toLowerCase() as 'cidadao' | 'gestor',
    userId: usuario.id,
    nome: usuario.nome,
    email: usuario.email,
    ...(orgao ? { orgao } : {}),
    termosPendentes: termosPendentes(usuario),
  };
}

// Segunda etapa do login: o desafio vem da etapa da senha e o código, do app autenticador (ou de recuperação).
export async function loginComMfa(desafio: unknown, codigo: unknown, req?: Request) {
  const usuarioId = lerDesafio(desafio, 'login');
  await verificarSegundoFator(usuarioId, codigo, req);

  const usuario = await prisma.usuario.findUnique({ where: { id: usuarioId } });
  if (!usuario) throw httpError(MENSAGEM_CREDENCIAIS, 401);

  await registrarEvento({ tipo: 'LOGIN_SUCESSO', usuarioId, detalhe: 'mfa', req });
  return respostaDeLogin(usuario);
}

export async function loginAposConfigurarMfa(usuarioId: number, req?: Request) {
  const usuario = await prisma.usuario.findUnique({ where: { id: usuarioId } });
  if (!usuario) throw httpError(MENSAGEM_CREDENCIAIS, 401);

  await registrarEvento({ tipo: 'LOGIN_SUCESSO', usuarioId, detalhe: 'mfa configurada', req });
  return respostaDeLogin(usuario);
}

export async function logout(usuarioId: number, req?: Request) {
  await registrarEvento({ tipo: 'LOGOUT', usuarioId, req });
}
