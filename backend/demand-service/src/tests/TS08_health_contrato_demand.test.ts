import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import app from '../app';

const prisma = new PrismaClient();
const SECRET = process.env.JWT_SECRET || 'change-me';

let tokenCidadao: string;
let tokenGestor: string;
let usuarioIdCidadao: number;
let usuarioIdGestor: number;

const idsParaLimpar: number[] = [];

const demandaValida = {
  titulo: 'Rua esburacada TS08',
  categoria: 'MANUTENCAO_DE_VIAS',
  regiao: 'AGRESTE',
  descricao: 'Buraco enorme no meio da rua principal do bairro.',
  endereco: 'Rua 15 de Novembro, 200 - Caruaru - PE - CEP: 55000-000',
  prioridade: 'ALTA',
};

beforeAll(async () => {
  const [cidadaoRow] = await prisma.$queryRaw<{ id: number }[]>`
    INSERT INTO usuarios (nome, email, senha, papel)
    VALUES ('Cidadao TS08', 'ts08.cidadao@test.com', 'hash', 'CIDADAO')
    ON CONFLICT (email) DO UPDATE SET nome = EXCLUDED.nome
    RETURNING id
  `;
  const [gestorRow] = await prisma.$queryRaw<{ id: number }[]>`
    INSERT INTO usuarios (nome, email, senha, papel)
    VALUES ('Gestor TS08', 'ts08.gestor@test.com', 'hash', 'GESTOR')
    ON CONFLICT (email) DO UPDATE SET nome = EXCLUDED.nome
    RETURNING id
  `;

  usuarioIdCidadao = cidadaoRow.id;
  usuarioIdGestor = gestorRow.id;

  tokenCidadao = jwt.sign({ userId: usuarioIdCidadao, papel: 'cidadao' }, SECRET);
  tokenGestor = jwt.sign({ userId: usuarioIdGestor, papel: 'gestor' }, SECRET);
});

afterAll(async () => {
  if (idsParaLimpar.length > 0) {
    await prisma.denuncia.deleteMany({ where: { id_denuncia: { in: idsParaLimpar } } });
  }
  await prisma.cidadao.deleteMany({ where: { usuario_id: usuarioIdCidadao } });
  await prisma.gestor.deleteMany({ where: { usuario_id: usuarioIdGestor } });
  await prisma.$executeRawUnsafe(
    `DELETE FROM usuarios WHERE email IN ('ts08.cidadao@test.com', 'ts08.gestor@test.com')`
  );
  await prisma.$disconnect();
});

describe('TS08 - Health check e contrato da API (demand-service)', () => {

  describe('1 — Health check do serviço', () => {

    it('Given serviço online, When GET /health, Then retorna 200', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
    });

    it('Given serviço online, When GET /health, Then body contém status "ok"', async () => {
      const res = await request(app).get('/health');
      expect(res.body.status).toBe('ok');
    });

    it('Given serviço online, When GET /health, Then body identifica o serviço', async () => {
      const res = await request(app).get('/health');
      expect(res.body.service).toBeDefined();
    });

    it('Given serviço online, When GET /health, Then Content-Type é application/json', async () => {
      const res = await request(app).get('/health');
      expect(res.headers['content-type']).toMatch(/application\/json/);
    });

  });

  describe('2 — Contrato da resposta de criação de denúncia', () => {

    it('Given cidadão autenticado e dados válidos, When POST /demandas, Then resposta contém os campos obrigatórios', async () => {
      const res = await request(app)
        .post('/demandas')
        .set('Authorization', `Bearer ${tokenCidadao}`)
        .send(demandaValida);

      expect(res.status).toBe(201);
      expect(typeof res.body.id_denuncia).toBe('number');
      expect(typeof res.body.titulo).toBe('string');
      expect(typeof res.body.categoria).toBe('string');
      expect(typeof res.body.regiao).toBe('string');
      expect(typeof res.body.status).toBe('string');
      expect(typeof res.body.prioridade).toBe('string');
      expect(typeof res.body.descricao).toBe('string');
      expect(typeof res.body.endereco).toBe('string');
      expect(res.body.data_registro).toBeDefined();
      expect(Array.isArray(res.body.imagens)).toBe(true);

      idsParaLimpar.push(res.body.id_denuncia);
    });

    it('Given criação bem-sucedida, When POST /demandas, Then Content-Type é application/json', async () => {
      const res = await request(app)
        .post('/demandas')
        .set('Authorization', `Bearer ${tokenCidadao}`)
        .send(demandaValida);

      expect(res.status).toBe(201);
      expect(res.headers['content-type']).toMatch(/application\/json/);

      idsParaLimpar.push(res.body.id_denuncia);
    });

    it('Given criação bem-sucedida, When POST /demandas, Then status padrão é "ABERTA"', async () => {
      const res = await request(app)
        .post('/demandas')
        .set('Authorization', `Bearer ${tokenCidadao}`)
        .send(demandaValida);

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('ABERTA');

      idsParaLimpar.push(res.body.id_denuncia);
    });

  });

  describe('3 — Contrato das listagens paginadas', () => {

    it('Given cidadão autenticado, When GET /demandas/my-demands, Then resposta contém "data" e "pagination"', async () => {
      const res = await request(app)
        .get('/demandas/my-demands')
        .set('Authorization', `Bearer ${tokenCidadao}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(typeof res.body.pagination).toBe('object');
    });

    it('Given cidadão autenticado, When GET /demandas/my-demands, Then pagination contém page, limit, total, totalPages', async () => {
      const res = await request(app)
        .get('/demandas/my-demands')
        .set('Authorization', `Bearer ${tokenCidadao}`);

      expect(res.status).toBe(200);
      expect(typeof res.body.pagination.page).toBe('number');
      expect(typeof res.body.pagination.limit).toBe('number');
      expect(typeof res.body.pagination.total).toBe('number');
      expect(typeof res.body.pagination.totalPages).toBe('number');
    });

    it('Given cidadão autenticado, When GET /demandas/feed, Then resposta contém "data" (array) e "pagination"', async () => {
      const res = await request(app)
        .get('/demandas/feed')
        .set('Authorization', `Bearer ${tokenCidadao}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.pagination).toBeDefined();
    });

    it('Given gestor autenticado, When GET /demandas/gestor, Then resposta contém "data" (array) e "pagination"', async () => {
      const res = await request(app)
        .get('/demandas/gestor')
        .set('Authorization', `Bearer ${tokenGestor}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.pagination).toBeDefined();
    });

    it('Given gestor autenticado, When GET /demandas/gestor, Then pagination.limit respeita o padrão (20) quando não informado', async () => {
      const res = await request(app)
        .get('/demandas/gestor')
        .set('Authorization', `Bearer ${tokenGestor}`);

      expect(res.status).toBe(200);
      expect(res.body.pagination.limit).toBe(20);
    });

  });

  describe('4 — Contrato de respostas de erro', () => {

    it('Given requisição sem token, When POST /demandas, Then resposta contém campo "error"', async () => {
      const res = await request(app).post('/demandas').send(demandaValida);

      expect(res.status).toBe(401);
      expect(res.body.error).toBeDefined();
      expect(res.body.message).toBeUndefined();
    });

    it('Given categoria inválida, When POST /demandas, Then resposta contém campo "error"', async () => {
      const res = await request(app)
        .post('/demandas')
        .set('Authorization', `Bearer ${tokenCidadao}`)
        .send({ ...demandaValida, categoria: 'INVALIDA' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it('Given ID inexistente, When GET /demandas/gestor/:id, Then resposta contém campo "error"', async () => {
      const res = await request(app)
        .get('/demandas/gestor/999999')
        .set('Authorization', `Bearer ${tokenGestor}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toBeDefined();
    });

  });

});
