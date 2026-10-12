// TS02 [BDD] — Persistência de nova demanda urbana
//
// PRÉ-REQUISITOS:
//   • PostgreSQL do demand-service rodando e acessível via DATABASE_URL_DEMAND
//   • Migrations aplicadas (prisma migrate deploy)
//   • Variável JWT_SECRET definida (ou usa padrão 'smartcity-dev-secret')
//
// DEPENDÊNCIA DE VERSÃO:
//   Este arquivo testa o endpoint POST /demandas conforme a versão branch do demandRoutes.ts
//   (router.post('/', authMiddleware, apenascidadao, createDemand)).
//   O JWT usa o campo `papel` (não `role`), compatível com o middleware `apenascidadao`.
//
//   ATENÇÃO: demandRoutes.ts e authMiddleware.ts têm conflitos de merge não resolvidos.
//   Para este teste funcionar, resolva os conflitos escolhendo a versão branch (mais simples).
//   Veja a documentação completa no chat.
//
// COMANDO:
//   cd backend/demand-service && npx vitest run src/tests/TS02_persistencia_demanda.bdd.test.ts

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import app from '../app';

const prisma = new PrismaClient();
const SECRET = process.env.JWT_SECRET || 'smartcity-dev-secret';

let token: string;
let tokenGestor: string;
let usuarioIdCidadao: number;
let usuarioIdGestor: number;

const idsParaLimpar: number[] = [];

const demandaValida = {
  titulo: 'Buraco na calçada BDD',
  categoria: 'MANUTENCAO_DE_VIAS',
  regiao: 'AGRESTE',
  descricao: 'Buraco grande na calçada da rua principal.',
  prioridade: 'ALTA',
  numero: '10',
  cep: '55000-000',
  bairro: 'Centro',
  cidade: 'Caruaru',
  rua: 'Rua 15 de Novembro',
};

beforeAll(async () => {
  // Emails distintos do TS02 original para evitar conflitos de ID entre suítes paralelas
  const [cidadaoRow] = await prisma.$queryRaw<{ id: number }[]>`
    INSERT INTO usuarios (nome, email, senha, papel)
    VALUES ('Cidadao TS02BDD', 'ts02bdd.cidadao@test.com', 'hash', 'CIDADAO')
    ON CONFLICT (email) DO UPDATE SET nome = EXCLUDED.nome
    RETURNING id
  `;
  const [gestorRow] = await prisma.$queryRaw<{ id: number }[]>`
    INSERT INTO usuarios (nome, email, senha, papel)
    VALUES ('Gestor TS02BDD', 'ts02bdd.gestor@test.com', 'hash', 'GESTOR')
    ON CONFLICT (email) DO UPDATE SET nome = EXCLUDED.nome
    RETURNING id
  `;

  usuarioIdCidadao = cidadaoRow.id;
  usuarioIdGestor = gestorRow.id;

  // `papel` é o campo lido pelo middleware `apenascidadao` (versão branch)
  token = jwt.sign({ userId: usuarioIdCidadao, papel: 'cidadao' }, SECRET);
  tokenGestor = jwt.sign({ userId: usuarioIdGestor, papel: 'gestor' }, SECRET);
});

afterAll(async () => {
  if (idsParaLimpar.length > 0) {
    await prisma.denuncia.deleteMany({ where: { id_denuncia: { in: idsParaLimpar } } });
  }
  await prisma.cidadao.deleteMany({
    where: { usuario_id: { in: [usuarioIdCidadao, usuarioIdGestor] } },
  });
  await prisma.$executeRawUnsafe(
    `DELETE FROM usuarios WHERE email IN ('ts02bdd.cidadao@test.com', 'ts02bdd.gestor@test.com')`
  );
  await prisma.$disconnect();
});

// ──────────────────────────────────────────────────────────────────────────────

describe('TS02 [BDD] - Persistência de nova demanda urbana', () => {

  describe('Cenário: Cidadão autenticado cria uma demanda válida', () => {

    it(
      'Given um cidadão autenticado com token JWT válido, When envia POST /demandas com todos os campos obrigatórios, Then retorna 201 com os dados persistidos no banco',
      async () => {
        const res = await request(app)
          .post('/demandas')
          .set('Authorization', `Bearer ${token}`)
          .send(demandaValida);

        expect(res.status).toBe(201);
        expect(res.body.id_denuncia).toBeDefined();
        expect(res.body.titulo).toBe(demandaValida.titulo);
        expect(res.body.categoria).toBe(demandaValida.categoria);
        expect(res.body.regiao).toBe(demandaValida.regiao);

        idsParaLimpar.push(res.body.id_denuncia);
      }
    );

    it('And o status padrão é ABERTA', async () => {
      const res = await request(app)
        .post('/demandas')
        .set('Authorization', `Bearer ${token}`)
        .send(demandaValida);

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('ABERTA');

      idsParaLimpar.push(res.body.id_denuncia);
    });

    it('And a prioridade padrão é MEDIA quando não informada', async () => {
      const { prioridade, ...semPrioridade } = demandaValida;
      const res = await request(app)
        .post('/demandas')
        .set('Authorization', `Bearer ${token}`)
        .send(semPrioridade);

      expect(res.status).toBe(201);
      expect(res.body.prioridade).toBe('MEDIA');

      idsParaLimpar.push(res.body.id_denuncia);
    });

  });

  // ────────────────────────────────────────────────────────────────────────────

  describe('Cenário: Requisição sem autenticação', () => {

    it(
      'Given um usuário sem token, When envia POST /demandas, Then retorna 401',
      async () => {
        const res = await request(app).post('/demandas').send(demandaValida);
        expect(res.status).toBe(401);
      }
    );

  });

  // ────────────────────────────────────────────────────────────────────────────

  describe('Cenário: Gestor tenta criar demanda', () => {

    it(
      'Given um gestor autenticado, When envia POST /demandas, Then retorna 403 com mensagem "Acesso restrito a cidadãos"',
      async () => {
        const res = await request(app)
          .post('/demandas')
          .set('Authorization', `Bearer ${tokenGestor}`)
          .send(demandaValida);

        expect(res.status).toBe(403);
        expect(res.body.error).toBe('Acesso restrito a cidadãos');
      }
    );

  });

  // ────────────────────────────────────────────────────────────────────────────

  describe('Cenário: Campos obrigatórios ausentes', () => {

    it(
      'Given um cidadão autenticado, When envia POST /demandas com body vazio, Then retorna 400',
      async () => {
        const res = await request(app)
          .post('/demandas')
          .set('Authorization', `Bearer ${token}`)
          .send({});

        expect(res.status).toBe(400);
      }
    );

  });

  // ────────────────────────────────────────────────────────────────────────────

  describe('Cenário: Categoria inválida', () => {

    it(
      'Given um cidadão autenticado, When envia POST /demandas com categoria inexistente, Then retorna 400',
      async () => {
        const res = await request(app)
          .post('/demandas')
          .set('Authorization', `Bearer ${token}`)
          .send({ ...demandaValida, categoria: 'CATEGORIA_INEXISTENTE' });

        expect(res.status).toBe(400);
      }
    );

  });

  // ────────────────────────────────────────────────────────────────────────────

  describe('Cenário: Região inválida', () => {

    it(
      'Given um cidadão autenticado, When envia POST /demandas com região inexistente, Then retorna 400',
      async () => {
        const res = await request(app)
          .post('/demandas')
          .set('Authorization', `Bearer ${token}`)
          .send({ ...demandaValida, regiao: 'REGIAO_INEXISTENTE' });

        expect(res.status).toBe(400);
      }
    );

  });

  // ────────────────────────────────────────────────────────────────────────────

  describe('Cenário: Criações simultâneas do mesmo cidadão', () => {

    it(
      'Given um cidadão autenticado, When envia dois POSTs simultâneos via Promise.all, Then ambos retornam 201 e o registro de cidadão não é duplicado',
      async () => {
        const [res1, res2] = await Promise.all([
          request(app)
            .post('/demandas')
            .set('Authorization', `Bearer ${token}`)
            .send({ ...demandaValida, titulo: 'BDD Paralela A' }),
          request(app)
            .post('/demandas')
            .set('Authorization', `Bearer ${token}`)
            .send({ ...demandaValida, titulo: 'BDD Paralela B' }),
        ]);

        expect(res1.status).toBe(201);
        expect(res2.status).toBe(201);

        // O upsert em resolveCidadaoId não pode criar duplicatas — deve haver exatamente 1 registro
        const cidadaos = await prisma.cidadao.findMany({
          where: { usuario_id: usuarioIdCidadao },
        });
        expect(cidadaos.length).toBe(1);

        idsParaLimpar.push(res1.body.id_denuncia, res2.body.id_denuncia);
      }
    );

  });

});
