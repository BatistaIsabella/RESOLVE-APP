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

  describe('Cenário: Cadastro bem-sucedido de cidadão', () => {

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

  });

  describe('Cenário: Cadastro bem-sucedido de gestor', () => {

    it('Given dados válidos de gestor, When POST /auth/register, Then retorna 201 com papel gestor', async () => {
      const email = `ts03.gestor.${Date.now()}@test.com`;
      emailsParaLimpar.push(email);

      const res = await request(app)
        .post('/auth/register')
        .send({ nome: 'Gestor TS03', email, senha: 'gestor456', papel: 'gestor' });

      expect(res.status).toBe(201);
      expect(res.body.papel).toBe('gestor');
    });

  });

  describe('Cenário: E-mail duplicado', () => {

    it('Given e-mail já cadastrado, When POST /auth/register com o mesmo e-mail, Then retorna 409', async () => {
      const email = `ts03.dup.${Date.now()}@test.com`;
      emailsParaLimpar.push(email);

      await request(app)
        .post('/auth/register')
        .send({ nome: 'Primeiro TS03', email, senha: 'abc123', papel: 'cidadao' });

      const res = await request(app)
        .post('/auth/register')
        .send({ nome: 'Segundo TS03', email, senha: 'xyz789', papel: 'gestor' });

      expect(res.status).toBe(409);
      expect(res.body.error).toBeDefined();
    });

  });

  describe('Cenário: Campos obrigatórios ausentes', () => {

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

  describe('Cenário: Papel inválido', () => {

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

  describe('Cenário: Contrato de segurança — senha não exposta na resposta', () => {

    it('Given registro bem-sucedido, When POST /auth/register, Then resposta não contém campo senha', async () => {
      const email = `ts03.seguranca.${Date.now()}@test.com`;
      emailsParaLimpar.push(email);

      const res = await request(app)
        .post('/auth/register')
        .send({ nome: 'Teste Segurança', email, senha: 'segredo123', papel: 'cidadao' });

      expect(res.status).toBe(201);
      expect(res.body.senha).toBeUndefined();
    });

  });

  describe('Cenário: Contrato de resposta', () => {

    it('Given registro bem-sucedido, When POST /auth/register, Then Content-Type é application/json', async () => {
      const email = `ts03.contrato.${Date.now()}@test.com`;
      emailsParaLimpar.push(email);

      const res = await request(app)
        .post('/auth/register')
        .send({ nome: 'Contrato TS03', email, senha: 'abc123', papel: 'cidadao' });

      expect(res.status).toBe(201);
      expect(res.headers['content-type']).toMatch(/application\/json/);
    });

    it('Given registro bem-sucedido, When POST /auth/register, Then resposta contém exatamente os campos: id, nome, email, papel', async () => {
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

  });

});
