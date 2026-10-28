import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import app from '../app';
import { hashDoEmail } from '../utils/emailProtegido';
import { hashIdentificador } from '../services/auditoriaService';
import { getJwtSecret, validarConfiguracao } from '../config/env';
import { SENHA_FORTE, TERMOS } from './helpers/dados';

const prisma = new PrismaClient();
const sufixo = Date.now();
const emailsCriados: string[] = [];

interface ClaimsToken {
  userId: number;
  papel: string;
  email: string;
  orgao?: string;
  categorias?: string[];
}

function cadastrar(papel: 'cidadao' | 'gestor', extra: Record<string, unknown> = {}) {
  const email = `ts13.${emailsCriados.length}.${sufixo}@test.com`;
  emailsCriados.push(email);
  return {
    email,
    resposta: request(app)
      .post('/auth/register')
      .send({ nome: 'Pessoa Auditada', email, senha: SENHA_FORTE, papel, ...TERMOS, ...extra }),
  };
}

const entrar = (email: string, senha = SENHA_FORTE) => request(app).post('/auth/login').send({ email, senha });
const claims = (token: string) => jwt.decode(token) as ClaimsToken;

const ENV_ORIGINAL = { ...process.env };

afterEach(() => {
  process.env = { ...ENV_ORIGINAL };
});

beforeAll(() => {
  process.env.GESTOR_ACCESS_CODES = 'OBRAS_E_SANEAMENTO=obras-123;ILUMINACAO=luz-456';
  process.env.GESTOR_ACCESS_CODE = 'geral-789';
  ENV_ORIGINAL.GESTOR_ACCESS_CODES = process.env.GESTOR_ACCESS_CODES;
  ENV_ORIGINAL.GESTOR_ACCESS_CODE = process.env.GESTOR_ACCESS_CODE;
});

afterAll(async () => {
  const usuarios = await prisma.usuario.findMany({ where: { email_hash: { in: emailsCriados.map(hashDoEmail) } }, select: { id: true } });
  await prisma.eventoAuth.deleteMany({
    where: {
      OR: [
        { usuario_id: { in: usuarios.map((u) => u.id) } },
        { identificador: { in: [...emailsCriados, `ts13.fantasma.${sufixo}@test.com`].map(hashIdentificador) } },
      ],
    },
  });
  await prisma.tentativaLogin.deleteMany({
    where: { chave: { in: emailsCriados.map(hashIdentificador) } },
  });
  await prisma.usuario.deleteMany({ where: { email_hash: { in: emailsCriados.map(hashDoEmail) } } });
  await prisma.$disconnect();
});

describe('TS13 - Registro de eventos de autenticação', () => {
  it('registra cadastro, login com sucesso e logout', async () => {
    const { email, resposta } = cadastrar('cidadao');
    const cadastro = await resposta;
    const login = await entrar(email);
    await request(app).post('/auth/logout').set('Authorization', `Bearer ${login.body.token}`);

    const eventos = await prisma.eventoAuth.findMany({ where: { usuario_id: cadastro.body.id }, orderBy: { id: 'asc' } });

    expect(eventos.map((e) => e.tipo)).toEqual(['CADASTRO', 'LOGIN_SUCESSO', 'LOGOUT']);
    expect(eventos.every((e) => e.criado_em instanceof Date)).toBe(true);
  });

  it('registra tentativas falhas e o bloqueio', async () => {
    const { email, resposta } = cadastrar('cidadao');
    const cadastro = await resposta;

    for (let i = 0; i < 3; i++) await entrar(email, 'Errada#Senha123');
    await entrar(email);

    const eventos = await prisma.eventoAuth.findMany({
      where: { OR: [{ usuario_id: cadastro.body.id }, { identificador: hashIdentificador(email) }] },
    });
    const tipos = eventos.map((e) => e.tipo);

    expect(tipos.filter((t) => t === 'LOGIN_FALHA')).toHaveLength(3);
    expect(tipos).toContain('LOGIN_BLOQUEADO');
  });

  it('tentativa com e-mail inexistente fica registrada só pelo hash do e-mail', async () => {
    const email = `ts13.fantasma.${sufixo}@test.com`;
    await entrar(email, 'Errada#Senha123');

    const eventos = await prisma.eventoAuth.findMany({ where: { identificador: hashIdentificador(email) } });

    expect(eventos).toHaveLength(1);
    expect(eventos[0].tipo).toBe('LOGIN_FALHA');
    expect(eventos[0].usuario_id).toBeNull();
  });

  it('nenhum registro contém senha, token ou e-mail em texto', async () => {
    const { email, resposta } = cadastrar('cidadao');
    const cadastro = await resposta;
    const senhaErrada = 'Errada#Segredo987';
    const login = await entrar(email);
    await entrar(email, senhaErrada);

    const eventos = await prisma.eventoAuth.findMany({ where: { usuario_id: cadastro.body.id } });
    const texto = JSON.stringify(eventos);

    expect(texto).not.toContain(SENHA_FORTE);
    expect(texto).not.toContain(senhaErrada);
    expect(texto).not.toContain(login.body.token);
    expect(texto).not.toContain(email);
  });

  it('registra o IP e o aparelho de origem', async () => {
    const { email, resposta } = cadastrar('cidadao');
    const cadastro = await resposta;
    await request(app).post('/auth/login').set('User-Agent', 'RESOLVE-App/1.0').send({ email, senha: SENHA_FORTE });

    const evento = await prisma.eventoAuth.findFirst({
      where: { usuario_id: cadastro.body.id, tipo: 'LOGIN_SUCESSO' },
    });

    expect(evento?.user_agent).toBe('RESOLVE-App/1.0');
    expect(evento?.ip).toBeTruthy();
  });
});

describe('TS13 - Código de acesso e órgão do gestor', () => {
  it('cada código vincula o gestor ao seu órgão e o token carrega as categorias permitidas', async () => {
    const { email, resposta } = cadastrar('gestor', { codigoAcesso: 'obras-123' });
    const cadastro = await resposta;
    const login = await entrar(email);

    expect(cadastro.status).toBe(201);
    expect(cadastro.body.orgao).toBe('OBRAS_E_SANEAMENTO');
    expect(login.body.orgao).toBe('OBRAS_E_SANEAMENTO');
    expect(claims(login.body.token).categorias).toEqual(['MANUTENCAO_DE_VIAS', 'SANEAMENTO']);
  });

  it('o código da gestão geral não restringe categorias', async () => {
    const { email, resposta } = cadastrar('gestor', { codigoAcesso: 'geral-789' });
    await resposta;
    const login = await entrar(email);

    expect(login.body.orgao).toBe('GERAL');
    expect(claims(login.body.token).categorias).toBeUndefined();
  });

  it('recusa código inexistente, vazio ou de tipo errado', async () => {
    for (const codigoAcesso of ['codigo-errado', '', undefined, 123]) {
      const { resposta } = cadastrar('gestor', { codigoAcesso });
      expect((await resposta).status).toBe(403);
    }
  });

  it('gestor cadastrado antes da divisão por órgão (sem órgão no banco) continua com acesso geral', async () => {
    const { email, resposta } = cadastrar('gestor', { codigoAcesso: 'geral-789' });
    const cadastro = await resposta;
    await prisma.usuario.update({ where: { id: cadastro.body.id }, data: { orgao: null } });

    const login = await entrar(email);

    expect(login.body.orgao).toBe('GERAL');
    expect(claims(login.body.token).categorias).toBeUndefined();
  });

  it('cidadão não recebe órgão nem categorias no token, mesmo enviando um código', async () => {
    const { email, resposta } = cadastrar('cidadao', { codigoAcesso: 'geral-789' });
    await resposta;
    const login = await entrar(email);

    expect(claims(login.body.token).orgao).toBeUndefined();
    expect(claims(login.body.token).categorias).toBeUndefined();
    expect(login.body.orgao).toBeUndefined();
  });

  it('em produção, sem códigos configurados, o cadastro de gestor fica fechado', async () => {
    delete process.env.GESTOR_ACCESS_CODES;
    delete process.env.GESTOR_ACCESS_CODE;
    process.env.NODE_ENV = 'production';

    const { resposta } = cadastrar('gestor', { codigoAcesso: 'change-me-codigo-gestor' });

    expect((await resposta).status).toBe(403);
  });

  it('fora de produção, sem códigos configurados, vale o código padrão de desenvolvimento', async () => {
    delete process.env.GESTOR_ACCESS_CODES;
    delete process.env.GESTOR_ACCESS_CODE;

    const { resposta } = cadastrar('gestor', { codigoAcesso: 'change-me-codigo-gestor' });

    expect((await resposta).status).toBe(201);
  });
});

describe('TS13 - Segredo do JWT', () => {
  it('em produção, o serviço não sobe sem JWT_SECRET', () => {
    delete process.env.JWT_SECRET;
    process.env.NODE_ENV = 'production';

    expect(() => validarConfiguracao()).toThrow(/JWT_SECRET/);
    expect(() => getJwtSecret()).toThrow(/JWT_SECRET/);
  });

  it('usa o segredo configurado', () => {
    process.env.JWT_SECRET = 'segredo-configurado';

    expect(getJwtSecret()).toBe('segredo-configurado');
  });

  it('token assinado com outro segredo é recusado', async () => {
    const falso = jwt.sign({ userId: 1, papel: 'gestor' }, 'outro-segredo');

    const res = await request(app).get('/auth/me').set('Authorization', `Bearer ${falso}`);

    expect(res.status).toBe(401);
  });
});
