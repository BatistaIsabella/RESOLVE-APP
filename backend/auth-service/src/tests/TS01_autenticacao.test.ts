import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../app';

const cidadao = {
  nome: 'Cidadao Teste TS01',
  email: `ts01.cidadao.${Date.now()}@test.com`,
  senha: 'senha123',
  papel: 'cidadao',
};

const gestor = {
  nome: 'Gestor Teste TS01',
  email: `ts01.gestor.${Date.now()}@test.com`,
  senha: 'senha456',
  papel: 'gestor',
};

beforeAll(async () => {
  await request(app).post('/auth/register').send(cidadao);
  await request(app).post('/auth/register').send(gestor);
});

describe('TS01 - Autenticação real e perfil JWT', () => {

  describe('Login do Cidadão', () => {
    it('retorna status 200 com token e papel cidadao', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({ email: cidadao.email, senha: cidadao.senha });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.papel).toBe('cidadao');
      expect(res.body.nome).toBe(cidadao.nome);
    });
  });

  describe('Login do Gestor', () => {
    it('retorna status 200 com token e papel gestor', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({ email: gestor.email, senha: gestor.senha });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.papel).toBe('gestor');
      expect(res.body.nome).toBe(gestor.nome);
    });
  });

  describe('Credenciais inválidas', () => {
    it('retorna 401 com senha errada', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({ email: cidadao.email, senha: 'errada' });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Credenciais inválidas');
    });

    it('retorna 401 com email inexistente', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({ email: 'naoexiste@test.com', senha: 'qualquer' });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Credenciais inválidas');
    });
  });

  describe('Redirecionamento por perfil', () => {
    it('JWT do cidadao carrega papel correto para rota /telaUsuario', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({ email: cidadao.email, senha: cidadao.senha });

      expect(res.body.papel).toBe('cidadao');
    });

    it('JWT do gestor carrega papel correto para rota /gestor/dashboard', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({ email: gestor.email, senha: gestor.senha });

      expect(res.body.papel).toBe('gestor');
    });
  });

});
