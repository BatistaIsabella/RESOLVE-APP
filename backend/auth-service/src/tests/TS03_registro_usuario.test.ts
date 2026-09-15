import { describe, it, expect, afterAll } from 'vitest';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import app from '../app';

const prisma = new PrismaClient();
const emailsParaLimpar: string[] = [];

afterAll(async () => {
  if (emailsParaLimpar.length > 0) {
    await prisma.usuario.deleteMany({
      where: { email: { in: emailsParaLimpar } },
    });
  }
  await prisma.$disconnect();
});

describe('TS03 - Registro de usuário', () => {

  describe('1 — Cadastros bem-sucedidos', () => {

    it('Given dados válidos de cidadão, When POST /auth/register, Then retorna 201 com id, nome, email e papel', async () => {
      const email = `ts03.cidadao.${Date.now()}@test.com`;
      emailsParaLimpar.push(email);

      const res = await request(app)
        .post('/auth/register')
        .send({ nome: 'Cidadão TS03', email, senha: 'senha123', papel: 'cidadao' });

      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.nome).toBe('Cidadão TS03');
      expect(res.body.email).toBe(email);
      expect(res.body.papel).toBe('cidadao');
    });

    it('Given dados válidos de gestor com código de acesso correto, When POST /auth/register, Then retorna 201 com papel gestor', async () => {
      const email = `ts03.gestor.${Date.now()}@test.com`;
      emailsParaLimpar.push(email);
      const codigoAcesso = process.env.GESTOR_ACCESS_CODE || 'change-me-codigo-gestor';

      const res = await request(app)
        .post('/auth/register')
        .send({ nome: 'Gestor TS03', email, senha: 'gestor456', papel: 'gestor', codigoAcesso });

      expect(res.status).toBe(201);
      expect(res.body.papel).toBe('gestor');
    });

  });

  describe('2 — Validações de campos obrigatórios', () => {

    it('Given body sem nome, When POST /auth/register, Then retorna 400', async () => {
      const res = await request(app)
        .post('/auth/register')
        .send({ email: 'sem.nome@test.com', senha: 'abc123', papel: 'cidadao' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/obrigatório/i);
    });

    it('Given body sem email, When POST /auth/register, Then retorna 400', async () => {
      const res = await request(app)
        .post('/auth/register')
        .send({ nome: 'Sem Email', senha: 'abc123', papel: 'cidadao' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/obrigatório/i);
    });

    it('Given body sem senha, When POST /auth/register, Then retorna 400', async () => {
      const res = await request(app)
        .post('/auth/register')
        .send({ nome: 'Sem Senha', email: 'sem.senha@test.com', papel: 'cidadao' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/obrigatório/i);
    });

    it('Given body sem papel, When POST /auth/register, Then retorna 400', async () => {
      const res = await request(app)
        .post('/auth/register')
        .send({ nome: 'Sem Papel', email: 'sem.papel@test.com', senha: 'abc123' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/obrigatório/i);
    });

    it('Given body completamente vazio, When POST /auth/register, Then retorna 400', async () => {
      const res = await request(app)
        .post('/auth/register')
        .send({});

      expect(res.status).toBe(400);
    });

  });

  describe('3 — Regras de negócio', () => {

    it('Given e-mail já cadastrado, When POST /auth/register com o mesmo e-mail, Then retorna 409', async () => {
      const email = `ts03.dup.${Date.now()}@test.com`;
      emailsParaLimpar.push(email);
      const codigoAcesso = process.env.GESTOR_ACCESS_CODE || 'change-me-codigo-gestor';

      await request(app)
        .post('/auth/register')
        .send({ nome: 'Primeiro TS03', email, senha: 'abc123', papel: 'cidadao' });

      const res = await request(app)
        .post('/auth/register')
        .send({ nome: 'Segundo TS03', email, senha: 'xyz789', papel: 'gestor', codigoAcesso });

      expect(res.status).toBe(409);
      expect(res.body.error).toBeDefined();
    });

    it('Given papel diferente de cidadao/gestor, When POST /auth/register, Then retorna 400', async () => {
      const res = await request(app)
        .post('/auth/register')
        .send({ nome: 'Admin Inválido', email: 'admin@test.com', senha: 'abc123', papel: 'admin' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('papel');
    });

    it('Given papel em maiúsculas "CIDADAO", When POST /auth/register, Then retorna 400 (papel case-sensitive)', async () => {
      const res = await request(app)
        .post('/auth/register')
        .send({ nome: 'Case Errado', email: `ts03.upper.${Date.now()}@test.com`, senha: 'abc123', papel: 'CIDADAO' });

      expect(res.status).toBe(400);
    });

  });

  describe('4 — Código de acesso de gestor', () => {

    it('Given papel gestor sem código de acesso, When POST /auth/register, Then retorna 403', async () => {
      const email = `ts03.gestor.semcodigo.${Date.now()}@test.com`;

      const res = await request(app)
        .post('/auth/register')
        .send({ nome: 'Gestor Sem Código', email, senha: 'gestor456', papel: 'gestor' });

      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/código de acesso/i);
    });

    it('Given papel gestor com código de acesso errado, When POST /auth/register, Then retorna 403', async () => {
      const email = `ts03.gestor.codigoerrado.${Date.now()}@test.com`;

      const res = await request(app)
        .post('/auth/register')
        .send({
          nome: 'Gestor Código Errado',
          email,
          senha: 'gestor456',
          papel: 'gestor',
          codigoAcesso: 'codigo-invalido-qualquer',
        });

      expect(res.status).toBe(403);
    });

    it('Given papel cidadao sem código de acesso, When POST /auth/register, Then retorna 201 (código não se aplica a cidadão)', async () => {
      const email = `ts03.semcod.${Date.now()}@test.com`;
      emailsParaLimpar.push(email);

      const res = await request(app)
        .post('/auth/register')
        .send({ nome: 'Cidadão Sem Código', email, senha: 'senha123', papel: 'cidadao' });

      expect(res.status).toBe(201);
    });

  });

  describe('5 — Contrato da resposta', () => {

    it('Given registro bem-sucedido, When POST /auth/register, Then Content-Type é application/json', async () => {
      const email = `ts03.contrat.${Date.now()}@test.com`;
      emailsParaLimpar.push(email);

      const res = await request(app)
        .post('/auth/register')
        .send({ nome: 'Contrato TS03', email, senha: 'abc123', papel: 'cidadao' });

      expect(res.status).toBe(201);
      expect(res.headers['content-type']).toMatch(/application\/json/);
    });

    it('Given registro bem-sucedido, When POST /auth/register, Then resposta contém os campos: id, nome, email, papel', async () => {
      const email = `ts03.campos.${Date.now()}@test.com`;
      emailsParaLimpar.push(email);

      const res = await request(app)
        .post('/auth/register')
        .send({ nome: 'Campos TS03', email, senha: 'abc123', papel: 'cidadao' });

      expect(res.status).toBe(201);
      expect(typeof res.body.id).toBe('number');
      expect(typeof res.body.nome).toBe('string');
      expect(typeof res.body.email).toBe('string');
      expect(typeof res.body.papel).toBe('string');
    });

    it('Given registro bem-sucedido, When POST /auth/register, Then resposta não contém campo senha', async () => {
      const email = `ts03.segur.${Date.now()}@test.com`;
      emailsParaLimpar.push(email);

      const res = await request(app)
        .post('/auth/register')
        .send({ nome: 'Teste Segurança', email, senha: 'segredo123', papel: 'cidadao' });

      expect(res.status).toBe(201);
      expect(res.body.senha).toBeUndefined();
    });

  });

});
