import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import app from '../app';

const prisma = new PrismaClient();
const emailsParaLimpar: string[] = [];

const usuarioBase = {
  nome: 'Contrato TS07',
  email: `ts07.contrato.${Date.now()}@test.com`,
  senha: 'senha123',
  papel: 'cidadao',
};

beforeAll(async () => {
  emailsParaLimpar.push(usuarioBase.email);
  await request(app).post('/auth/register').send(usuarioBase);
});

afterAll(async () => {
  if (emailsParaLimpar.length > 0) {
    await prisma.usuario.deleteMany({ where: { email: { in: emailsParaLimpar } } });
  }
  await prisma.$disconnect();
});

describe('TS07 - Health check e contrato da API (auth-service)', () => {

  describe('1 — Health check do serviço', () => {

    it('Given serviço online, When GET /health, Then retorna 200', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
    });

    it('Given serviço online, When GET /health, Then body contém status "ok"', async () => {
      const res = await request(app).get('/health');
      expect(res.body.status).toBe('ok');
    });

    it('Given serviço online, When GET /health, Then body identifica o serviço como auth-service', async () => {
      const res = await request(app).get('/health');
      expect(res.body.service).toBe('auth-service');
    });

    it('Given serviço online, When GET /health, Then Content-Type é application/json', async () => {
      const res = await request(app).get('/health');
      expect(res.headers['content-type']).toMatch(/application\/json/);
    });

  });

  describe('2 — Headers CORS', () => {

    it('Given qualquer requisição ao auth-service, When resposta chega, Then Access-Control-Allow-Origin está presente', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({ email: usuarioBase.email, senha: usuarioBase.senha });

      expect(res.headers['access-control-allow-origin']).toBeDefined();
    });

    it('Given requisição OPTIONS (preflight CORS), When OPTIONS /auth/register, Then retorna 204', async () => {
      const res = await request(app).options('/auth/register');
      expect(res.status).toBe(204);
    });

  });

  describe('3 — Contrato da resposta de registro', () => {

    it('Given registro bem-sucedido, When POST /auth/register, Then resposta contém id (number), nome, email, papel', async () => {
      const email = `ts07.reg.${Date.now()}@test.com`;
      emailsParaLimpar.push(email);

      const res = await request(app)
        .post('/auth/register')
        .send({ nome: 'Reg TS07', email, senha: 'abc123', papel: 'cidadao' });

      expect(res.status).toBe(201);
      expect(typeof res.body.id).toBe('number');
      expect(typeof res.body.nome).toBe('string');
      expect(typeof res.body.email).toBe('string');
      expect(typeof res.body.papel).toBe('string');
    });

    it('Given registro bem-sucedido, When POST /auth/register, Then resposta NÃO expõe o campo senha', async () => {
      const email = `ts07.nosensinha.${Date.now()}@test.com`;
      emailsParaLimpar.push(email);
      const codigoAcesso = process.env.GESTOR_ACCESS_CODE || 'change-me-codigo-gestor';

      const res = await request(app)
        .post('/auth/register')
        .send({ nome: 'Sem Senha TS07', email, senha: 'secreto999', papel: 'gestor', codigoAcesso });

      expect(res.status).toBe(201);
      expect(res.body.senha).toBeUndefined();
    });

  });

  describe('4 — Contrato da resposta de login', () => {

    it('Given login bem-sucedido, When POST /auth/login, Then resposta contém token, papel, userId e nome', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({ email: usuarioBase.email, senha: usuarioBase.senha });

      expect(res.status).toBe(200);
      expect(typeof res.body.token).toBe('string');
      expect(res.body.token.length).toBeGreaterThan(0);
      expect(typeof res.body.papel).toBe('string');
      expect(typeof res.body.userId).toBe('number');
      expect(typeof res.body.nome).toBe('string');
    });

    it('Given login bem-sucedido, When POST /auth/login, Then token tem formato JWT (3 segmentos separados por ponto)', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({ email: usuarioBase.email, senha: usuarioBase.senha });

      expect(res.status).toBe(200);
      const partes = res.body.token.split('.');
      expect(partes).toHaveLength(3);
    });

    it('Given login bem-sucedido, When POST /auth/login, Then Content-Type é application/json', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({ email: usuarioBase.email, senha: usuarioBase.senha });

      expect(res.headers['content-type']).toMatch(/application\/json/);
    });

  });

  describe('5 — Contrato de respostas de erro', () => {

    it('Given credenciais inválidas, When POST /auth/login, Then erro contém campo "error" (não "message")', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({ email: 'nao.existe@test.com', senha: 'errada' });

      expect(res.status).toBe(401);
      expect(res.body.error).toBeDefined();
      expect(res.body.message).toBeUndefined();
    });

    it('Given campos ausentes, When POST /auth/register, Then erro contém campo "error"', async () => {
      const res = await request(app)
        .post('/auth/register')
        .send({ nome: 'Incompleto' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

  });

});
