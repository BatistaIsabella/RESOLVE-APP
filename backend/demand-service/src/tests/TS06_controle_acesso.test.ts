import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { PrismaClient, Categorias, Regioes, NivelPrioridade, StatusDenuncia } from '@prisma/client';
import app from '../app';

const prisma = new PrismaClient();
const SECRET = process.env.JWT_SECRET || 'change-me';

let tokenCidadao: string;
let tokenGestor: string;
let usuarioIdCidadao: number;
let usuarioIdGestor: number;
let denunciaId: number;

beforeAll(async () => {
  const [cidadaoRow] = await prisma.$queryRaw<{ id: number }[]>`
    INSERT INTO usuarios (nome, email, senha, papel)
    VALUES ('Cidadao TS06', 'ts06.cidadao@test.com', 'hash', 'CIDADAO')
    ON CONFLICT (email) DO UPDATE SET nome = EXCLUDED.nome
    RETURNING id
  `;
  const [gestorRow] = await prisma.$queryRaw<{ id: number }[]>`
    INSERT INTO usuarios (nome, email, senha, papel)
    VALUES ('Gestor TS06', 'ts06.gestor@test.com', 'hash', 'GESTOR')
    ON CONFLICT (email) DO UPDATE SET nome = EXCLUDED.nome
    RETURNING id
  `;

  usuarioIdCidadao = cidadaoRow.id;
  usuarioIdGestor = gestorRow.id;

  tokenCidadao = jwt.sign({ userId: usuarioIdCidadao, papel: 'cidadao' }, SECRET);
  tokenGestor = jwt.sign({ userId: usuarioIdGestor, papel: 'gestor' }, SECRET);

  const cidadao = await prisma.cidadao.upsert({
    where: { usuario_id: usuarioIdCidadao },
    update: {},
    create: { usuario_id: usuarioIdCidadao },
  });

  const denuncia = await prisma.denuncia.create({
    data: {
      titulo: 'Denúncia TS06',
      categoria: Categorias.COLETA_DE_LIXO,
      regiao: Regioes.AGRESTE,
      descricao: 'Lixo acumulado para testes TS06',
      endereco: 'Rua Teste, 1 - Caruaru - PE',
      prioridade: NivelPrioridade.BAIXA,
      status: StatusDenuncia.ABERTA,
      cidadao_id: cidadao.id_cidadao,
    },
  });

  denunciaId = denuncia.id_denuncia;
});

afterAll(async () => {
  await prisma.historico.deleteMany({ where: { denuncia_id: denunciaId } });
  await prisma.denuncia.deleteMany({ where: { id_denuncia: denunciaId } });
  await prisma.cidadao.deleteMany({ where: { usuario_id: usuarioIdCidadao } });
  await prisma.gestor.deleteMany({ where: { usuario_id: usuarioIdGestor } });
  await prisma.$executeRawUnsafe(
    `DELETE FROM usuarios WHERE email IN ('ts06.cidadao@test.com', 'ts06.gestor@test.com')`
  );
  await prisma.$disconnect();
});

describe('TS06 - Controle de acesso e autenticação', () => {

  describe('1 — Requisições sem token de autenticação', () => {

    it('Given sem Authorization, When POST /demandas, Then retorna 401', async () => {
      const res = await request(app).post('/demandas').send({ titulo: 'Sem token' });
      expect(res.status).toBe(401);
      expect(res.body.error).toBeDefined();
    });

    it('Given sem Authorization, When GET /demandas/my-demands, Then retorna 401', async () => {
      const res = await request(app).get('/demandas/my-demands');
      expect(res.status).toBe(401);
    });

    it('Given sem Authorization, When GET /demandas/feed, Then retorna 401', async () => {
      const res = await request(app).get('/demandas/feed');
      expect(res.status).toBe(401);
    });

    it('Given sem Authorization, When GET /demandas/gestor, Then retorna 401', async () => {
      const res = await request(app).get('/demandas/gestor');
      expect(res.status).toBe(401);
    });

    it('Given sem Authorization, When PATCH /demandas/gestor/:id/status, Then retorna 401', async () => {
      const res = await request(app)
        .patch(`/demandas/gestor/${denunciaId}/status`)
        .send({ status: 'EM_ANALISE' });
      expect(res.status).toBe(401);
    });

    it('Given sem Authorization, When PATCH /demandas/gestor/:id/prioridade, Then retorna 401', async () => {
      const res = await request(app)
        .patch(`/demandas/gestor/${denunciaId}/prioridade`)
        .send({ prioridade: 'ALTA' });
      expect(res.status).toBe(401);
    });

  });

  describe('2 — Token com formato inválido', () => {

    it('Given header sem prefixo Bearer, When GET /demandas/feed, Then retorna 401', async () => {
      const res = await request(app)
        .get('/demandas/feed')
        .set('Authorization', tokenCidadao);

      expect(res.status).toBe(401);
    });

    it('Given token com assinatura corrompida, When GET /demandas/feed, Then retorna 401', async () => {
      const res = await request(app)
        .get('/demandas/feed')
        .set('Authorization', 'Bearer token.invalido.corrompido');

      expect(res.status).toBe(401);
      expect(res.body.error).toMatch(/inválido|expirado/i);
    });

    it('Given token aleatório não JWT, When GET /demandas/feed, Then retorna 401', async () => {
      const res = await request(app)
        .get('/demandas/feed')
        .set('Authorization', 'Bearer nao-e-um-jwt');

      expect(res.status).toBe(401);
    });

  });

  describe('3 — Token expirado e secret incorreto', () => {

    it('Given token com expiração no passado, When GET /demandas/feed, Then retorna 401', async () => {
      const tokenExpirado = jwt.sign(
        { userId: usuarioIdCidadao, papel: 'cidadao' },
        SECRET,
        { expiresIn: -1 }
      );

      const res = await request(app)
        .get('/demandas/feed')
        .set('Authorization', `Bearer ${tokenExpirado}`);

      expect(res.status).toBe(401);
      expect(res.body.error).toMatch(/inválido|expirado/i);
    });

    it('Given token gerado com secret diferente, When GET /demandas/feed, Then retorna 401', async () => {
      const tokenSecretErrado = jwt.sign(
        { userId: usuarioIdCidadao, papel: 'cidadao' },
        'secret-completamente-errado'
      );

      const res = await request(app)
        .get('/demandas/feed')
        .set('Authorization', `Bearer ${tokenSecretErrado}`);

      expect(res.status).toBe(401);
    });

  });

  describe('4 — Autorização por papel', () => {

    it('Given cidadão autenticado, When GET /demandas/gestor, Then retorna 403', async () => {
      const res = await request(app)
        .get('/demandas/gestor')
        .set('Authorization', `Bearer ${tokenCidadao}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toBeDefined();
    });

    it('Given cidadão autenticado, When GET /demandas/gestor/:id, Then retorna 403', async () => {
      const res = await request(app)
        .get(`/demandas/gestor/${denunciaId}`)
        .set('Authorization', `Bearer ${tokenCidadao}`);

      expect(res.status).toBe(403);
    });

    it('Given cidadão autenticado, When PATCH /demandas/gestor/:id/status, Then retorna 403', async () => {
      const res = await request(app)
        .patch(`/demandas/gestor/${denunciaId}/status`)
        .set('Authorization', `Bearer ${tokenCidadao}`)
        .send({ status: 'EM_ANALISE' });

      expect(res.status).toBe(403);
    });

    it('Given cidadão autenticado, When PATCH /demandas/gestor/:id/prioridade, Then retorna 403', async () => {
      const res = await request(app)
        .patch(`/demandas/gestor/${denunciaId}/prioridade`)
        .set('Authorization', `Bearer ${tokenCidadao}`)
        .send({ prioridade: 'ALTA' });

      expect(res.status).toBe(403);
    });

    it('Given gestor autenticado, When POST /demandas (criação de denúncia), Then retorna 403', async () => {
      const res = await request(app)
        .post('/demandas')
        .set('Authorization', `Bearer ${tokenGestor}`)
        .send({
          titulo: 'Tentativa do Gestor',
          categoria: 'COLETA_DE_LIXO',
          regiao: 'AGRESTE',
          descricao: 'Gestor não pode criar denúncia',
          endereco: 'Rua Qualquer, 1',
        });

      expect(res.status).toBe(403);
    });

    it('Given gestor autenticado, When GET /demandas/my-demands, Then retorna 403', async () => {
      const res = await request(app)
        .get('/demandas/my-demands')
        .set('Authorization', `Bearer ${tokenGestor}`);

      expect(res.status).toBe(403);
    });

    it('Given gestor autenticado, When GET /demandas/feed, Then retorna 403', async () => {
      const res = await request(app)
        .get('/demandas/feed')
        .set('Authorization', `Bearer ${tokenGestor}`);

      expect(res.status).toBe(403);
    });

  });

  describe('5 — Validação de parâmetros de rota', () => {

    it('Given ID não numérico, When GET /demandas/:id pelo cidadão, Then retorna 400', async () => {
      const res = await request(app)
        .get('/demandas/nao-e-numero')
        .set('Authorization', `Bearer ${tokenCidadao}`);

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it('Given ID zero (inválido), When GET /demandas/:id pelo cidadão, Then retorna 400', async () => {
      const res = await request(app)
        .get('/demandas/0')
        .set('Authorization', `Bearer ${tokenCidadao}`);

      expect(res.status).toBe(400);
    });

    it('Given ID inexistente, When GET /demandas/:id pelo cidadão, Then retorna 404', async () => {
      const res = await request(app)
        .get('/demandas/999999')
        .set('Authorization', `Bearer ${tokenCidadao}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toBeDefined();
    });

  });

});
