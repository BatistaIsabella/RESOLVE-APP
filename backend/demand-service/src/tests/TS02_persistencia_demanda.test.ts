import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import app from '../app';

const prisma = new PrismaClient();
const SECRET = process.env.JWT_SECRET || 'smartcity-dev-secret';

let token: string;
let tokenGestor: string;
let usuarioIdTeste: number;
let usuarioIdGestor: number;

const demandaValida = {
  titulo: 'Poste sem luz na esquina',
  categoria: 'ILUMINACAO_PUBLICA',
  regiao: 'REGIAO_METROPOLITANA_DO_RECIFE',
  descricao: 'Poste apagado há 3 dias, rua sem iluminação à noite.',
  prioridade: 'ALTA',
  endereco: 'Av. Boa Viagem, 45 - Boa Viagem, Recife - CEP: 50000-000',
};

const idsParaLimpar: number[] = [];

beforeAll(async () => {
  const [cidadaoRow] = await prisma.$queryRaw<{ id: number }[]>`
    INSERT INTO usuarios (nome, email, senha, papel)
    VALUES ('Cidadao TS02', 'ts02.cidadao@test.com', 'hash', 'CIDADAO')
    ON CONFLICT (email) DO UPDATE SET nome = EXCLUDED.nome
    RETURNING id
  `;
  const [gestorRow] = await prisma.$queryRaw<{ id: number }[]>`
    INSERT INTO usuarios (nome, email, senha, papel)
    VALUES ('Gestor TS02', 'ts02.gestor@test.com', 'hash', 'GESTOR')
    ON CONFLICT (email) DO UPDATE SET nome = EXCLUDED.nome
    RETURNING id
  `;

  usuarioIdTeste = cidadaoRow.id;
  usuarioIdGestor = gestorRow.id;
  token = jwt.sign({ userId: usuarioIdTeste, papel: 'cidadao' }, SECRET);
  tokenGestor = jwt.sign({ userId: usuarioIdGestor, papel: 'gestor' }, SECRET);
});

afterAll(async () => {
  if (idsParaLimpar.length > 0) {
    await prisma.denuncia.deleteMany({ where: { id_denuncia: { in: idsParaLimpar } } });
  }
  await prisma.cidadao.deleteMany({ where: { usuario_id: { in: [usuarioIdTeste, usuarioIdGestor] } } });
  await prisma.$executeRawUnsafe(
    `DELETE FROM usuarios WHERE email IN ('ts02.cidadao@test.com', 'ts02.gestor@test.com')`
  );
  await prisma.$disconnect();
});

describe('TS02 - Persistência de nova demanda urbana', () => {

  describe('1 — Autenticação e autorização', () => {

    it('Given usuário sem token, When POST /demandas, Then retorna 401', async () => {
      const res = await request(app).post('/demandas').send(demandaValida);
      expect(res.status).toBe(401);
    });

    it('Given gestor autenticado, When POST /demandas, Then retorna 403 com mensagem de acesso restrito', async () => {
      const res = await request(app)
        .post('/demandas')
        .set('Authorization', `Bearer ${tokenGestor}`)
        .send(demandaValida);
      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/acesso/i);
    });

  });

  describe('2 — Validação de campos', () => {

    it('Given cidadão autenticado, When POST /demandas com body vazio, Then retorna 400', async () => {
      const res = await request(app)
        .post('/demandas')
        .set('Authorization', `Bearer ${token}`)
        .send({});
      expect(res.status).toBe(400);
    });

    it('Given cidadão autenticado, When POST /demandas com categoria inexistente, Then retorna 400', async () => {
      const res = await request(app)
        .post('/demandas')
        .set('Authorization', `Bearer ${token}`)
        .send({ ...demandaValida, categoria: 'CATEGORIA_INEXISTENTE' });
      expect(res.status).toBe(400);
    });

    it('Given cidadão autenticado, When POST /demandas com região inexistente, Then retorna 400', async () => {
      const res = await request(app)
        .post('/demandas')
        .set('Authorization', `Bearer ${token}`)
        .send({ ...demandaValida, regiao: 'REGIAO_INEXISTENTE' });
      expect(res.status).toBe(400);
    });

  });

  describe('3 — Persistência no banco', () => {

    it('Given cidadão autenticado com dados válidos, When POST /demandas, Then retorna 201 com os dados persistidos', async () => {
      const res = await request(app)
        .post('/demandas')
        .set('Authorization', `Bearer ${token}`)
        .send(demandaValida);

      expect(res.status).toBe(201);
      expect(res.body.id_denuncia).toBeDefined();
      expect(res.body.titulo).toBe(demandaValida.titulo);
      expect(res.body.categoria).toBe(demandaValida.categoria);
      expect(res.body.status).toBe('ABERTA');
      expect(res.body.prioridade).toBe(demandaValida.prioridade);

      idsParaLimpar.push(res.body.id_denuncia);
    });

    it('Given criação bem-sucedida, When POST /demandas, Then status padrão é ABERTA', async () => {
      const res = await request(app)
        .post('/demandas')
        .set('Authorization', `Bearer ${token}`)
        .send(demandaValida);

      expect(res.body.status).toBe('ABERTA');
      idsParaLimpar.push(res.body.id_denuncia);
    });

    it('Given prioridade não informada, When POST /demandas, Then prioridade padrão é MEDIA', async () => {
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

  describe('4 — Concorrência', () => {

    it('Given dois POSTs simultâneos do mesmo cidadão via Promise.all, When ambos são enviados, Then ambos retornam 201 e cidadão não é duplicado no banco', async () => {
      const [res1, res2] = await Promise.all([
        request(app)
          .post('/demandas')
          .set('Authorization', `Bearer ${token}`)
          .send({ ...demandaValida, titulo: 'Demanda paralela A' }),
        request(app)
          .post('/demandas')
          .set('Authorization', `Bearer ${token}`)
          .send({ ...demandaValida, titulo: 'Demanda paralela B' }),
      ]);

      expect(res1.status).toBe(201);
      expect(res2.status).toBe(201);

      const cidadaos = await prisma.cidadao.findMany({ where: { usuario_id: usuarioIdTeste } });
      expect(cidadaos.length).toBe(1);

      idsParaLimpar.push(res1.body.id_denuncia, res2.body.id_denuncia);
    });

  });

});
