import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { PrismaClient, NivelPrioridade, StatusDenuncia, Categorias, Regioes } from '@prisma/client';
import app from '../app';

const prisma = new PrismaClient();
const SECRET = process.env.JWT_SECRET || 'change-me';

let tokenGestor: string;
let tokenCidadao: string;
let usuarioIdGestor: number;
let usuarioIdCidadao: number;
let denunciaId: number;

beforeAll(async () => {
  const [gestorRow] = await prisma.$queryRaw<{ id: number }[]>`
    INSERT INTO usuarios (nome, email, senha, papel)
    VALUES ('Gestor TS05', 'ts05.gestor@test.com', 'hash', 'GESTOR')
    ON CONFLICT (email) DO UPDATE SET nome = EXCLUDED.nome
    RETURNING id
  `;
  const [cidadaoRow] = await prisma.$queryRaw<{ id: number }[]>`
    INSERT INTO usuarios (nome, email, senha, papel)
    VALUES ('Cidadao TS05', 'ts05.cidadao@test.com', 'hash', 'CIDADAO')
    ON CONFLICT (email) DO UPDATE SET nome = EXCLUDED.nome
    RETURNING id
  `;

  usuarioIdGestor = gestorRow.id;
  usuarioIdCidadao = cidadaoRow.id;

  tokenGestor = jwt.sign({ userId: usuarioIdGestor, papel: 'gestor' }, SECRET);
  tokenCidadao = jwt.sign({ userId: usuarioIdCidadao, papel: 'cidadao' }, SECRET);

  await prisma.cidadao.upsert({
    where: { usuario_id: usuarioIdCidadao },
    update: {},
    create: { usuario_id: usuarioIdCidadao },
  });

  const cidadao = await prisma.cidadao.findUnique({ where: { usuario_id: usuarioIdCidadao } });

  const denuncia = await prisma.denuncia.create({
    data: {
      titulo: 'Poste quebrado TS05',
      categoria: Categorias.ILUMINACAO_PUBLICA,
      regiao: Regioes.REGIAO_METROPOLITANA_DO_RECIFE,
      descricao: 'Poste sem funcionamento na rua principal',
      endereco: 'Av. Boa Viagem, 100 - Recife - PE',
      prioridade: NivelPrioridade.MEDIA,
      status: StatusDenuncia.ABERTA,
      cidadao_id: cidadao!.id_cidadao,
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
    `DELETE FROM usuarios WHERE email IN ('ts05.gestor@test.com', 'ts05.cidadao@test.com')`
  );
  await prisma.$disconnect();
});

describe('TS05 - Operações do gestor', () => {

  describe('1 — Listagem de denúncias', () => {

    it('Given gestor autenticado, When GET /demandas/gestor, Then retorna 200 com lista paginada', async () => {
      const res = await request(app)
        .get('/demandas/gestor')
        .set('Authorization', `Bearer ${tokenGestor}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.pagination).toBeDefined();
      expect(typeof res.body.pagination.total).toBe('number');
    });

    it('Given cidadão autenticado, When GET /demandas/gestor, Then retorna 403', async () => {
      const res = await request(app)
        .get('/demandas/gestor')
        .set('Authorization', `Bearer ${tokenCidadao}`);

      expect(res.status).toBe(403);
    });

    it('Given requisição sem token, When GET /demandas/gestor, Then retorna 401', async () => {
      const res = await request(app).get('/demandas/gestor');
      expect(res.status).toBe(401);
    });

  });

  describe('2 — Detalhes de uma denúncia', () => {

    it('Given gestor autenticado e denúncia existente, When GET /demandas/gestor/:id, Then retorna 200 com detalhes e imagens', async () => {
      const res = await request(app)
        .get(`/demandas/gestor/${denunciaId}`)
        .set('Authorization', `Bearer ${tokenGestor}`);

      expect(res.status).toBe(200);
      expect(res.body.id_denuncia).toBe(denunciaId);
      expect(res.body.titulo).toBe('Poste quebrado TS05');
      expect(Array.isArray(res.body.imagens)).toBe(true);
      expect(Array.isArray(res.body.historicos)).toBe(true);
    });

    it('Given gestor autenticado e denúncia inexistente, When GET /demandas/gestor/:id, Then retorna 404', async () => {
      const res = await request(app)
        .get('/demandas/gestor/999999')
        .set('Authorization', `Bearer ${tokenGestor}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toBeDefined();
    });

    it('Given ID não numérico, When GET /demandas/gestor/:id, Then retorna 400', async () => {
      const res = await request(app)
        .get('/demandas/gestor/abc')
        .set('Authorization', `Bearer ${tokenGestor}`);

      expect(res.status).toBe(400);
    });

  });

  describe('3 — Atualização de status', () => {

    it('Given gestor autenticado e denúncia ABERTA, When PATCH /gestor/:id/status com EM_ANALISE, Then retorna 200 com status atualizado e histórico', async () => {
      const res = await request(app)
        .patch(`/demandas/gestor/${denunciaId}/status`)
        .set('Authorization', `Bearer ${tokenGestor}`)
        .send({ status: 'EM_ANALISE' });

      expect(res.status).toBe(200);
      expect(res.body.denuncia.status).toBe('EM_ANALISE');
      expect(res.body.historico).toBeDefined();
      expect(res.body.historico.status).toBe('EM_ANALISE');
    });

    it('Given denúncia EM_ANALISE, When PATCH /gestor/:id/status com RESOLVIDA, Then retorna 200', async () => {
      const res = await request(app)
        .patch(`/demandas/gestor/${denunciaId}/status`)
        .set('Authorization', `Bearer ${tokenGestor}`)
        .send({ status: 'RESOLVIDA' });

      expect(res.status).toBe(200);
      expect(res.body.denuncia.status).toBe('RESOLVIDA');
    });

    it('Given gestor autenticado, When PATCH /gestor/:id/status com status inexistente, Then retorna 400', async () => {
      const res = await request(app)
        .patch(`/demandas/gestor/${denunciaId}/status`)
        .set('Authorization', `Bearer ${tokenGestor}`)
        .send({ status: 'PENDENTE' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it('Given gestor autenticado, When PATCH /gestor/:id/status sem campo status, Then retorna 400', async () => {
      const res = await request(app)
        .patch(`/demandas/gestor/${denunciaId}/status`)
        .set('Authorization', `Bearer ${tokenGestor}`)
        .send({});

      expect(res.status).toBe(400);
    });

    it('Given denúncia com status RESOLVIDA, When PATCH /gestor/:id/status com RESOLVIDA, Then retorna 400 (sem mudança)', async () => {
      const res = await request(app)
        .patch(`/demandas/gestor/${denunciaId}/status`)
        .set('Authorization', `Bearer ${tokenGestor}`)
        .send({ status: 'RESOLVIDA' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/já possui/i);
    });

    it('Given gestor autenticado, When PATCH /gestor/999999/status, Then retorna 404', async () => {
      const res = await request(app)
        .patch('/demandas/gestor/999999/status')
        .set('Authorization', `Bearer ${tokenGestor}`)
        .send({ status: 'EM_ANALISE' });

      expect(res.status).toBe(404);
    });

    it('Given cidadão autenticado, When PATCH /gestor/:id/status, Then retorna 403', async () => {
      const res = await request(app)
        .patch(`/demandas/gestor/${denunciaId}/status`)
        .set('Authorization', `Bearer ${tokenCidadao}`)
        .send({ status: 'EM_ANALISE' });

      expect(res.status).toBe(403);
    });

  });

  describe('4 — Atualização de prioridade', () => {

    it('Given gestor autenticado e denúncia com prioridade MEDIA, When PATCH /gestor/:id/prioridade com ALTA, Then retorna 200 com prioridade atualizada', async () => {
      const res = await request(app)
        .patch(`/demandas/gestor/${denunciaId}/prioridade`)
        .set('Authorization', `Bearer ${tokenGestor}`)
        .send({ prioridade: 'ALTA' });

      expect(res.status).toBe(200);
      expect(res.body.denuncia.prioridade).toBe('ALTA');
      expect(res.body.historico).toBeDefined();
      expect(res.body.historico.prioridade).toBe('ALTA');
    });

    it('Given gestor autenticado, When PATCH /gestor/:id/prioridade com BAIXA, Then retorna 200', async () => {
      const res = await request(app)
        .patch(`/demandas/gestor/${denunciaId}/prioridade`)
        .set('Authorization', `Bearer ${tokenGestor}`)
        .send({ prioridade: 'BAIXA' });

      expect(res.status).toBe(200);
      expect(res.body.denuncia.prioridade).toBe('BAIXA');
    });

    it('Given gestor autenticado, When PATCH /gestor/:id/prioridade com valor inexistente, Then retorna 400', async () => {
      const res = await request(app)
        .patch(`/demandas/gestor/${denunciaId}/prioridade`)
        .set('Authorization', `Bearer ${tokenGestor}`)
        .send({ prioridade: 'URGENTE' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it('Given gestor autenticado, When PATCH /gestor/:id/prioridade sem campo prioridade, Then retorna 400', async () => {
      const res = await request(app)
        .patch(`/demandas/gestor/${denunciaId}/prioridade`)
        .set('Authorization', `Bearer ${tokenGestor}`)
        .send({});

      expect(res.status).toBe(400);
    });

    it('Given denúncia com prioridade BAIXA, When PATCH /gestor/:id/prioridade com BAIXA, Then retorna 400', async () => {
      const res = await request(app)
        .patch(`/demandas/gestor/${denunciaId}/prioridade`)
        .set('Authorization', `Bearer ${tokenGestor}`)
        .send({ prioridade: 'BAIXA' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/já possui/i);
    });

    it('Given gestor autenticado, When PATCH /gestor/999999/prioridade, Then retorna 404', async () => {
      const res = await request(app)
        .patch('/demandas/gestor/999999/prioridade')
        .set('Authorization', `Bearer ${tokenGestor}`)
        .send({ prioridade: 'ALTA' });

      expect(res.status).toBe(404);
    });

    it('Given cidadão autenticado, When PATCH /gestor/:id/prioridade, Then retorna 403', async () => {
      const res = await request(app)
        .patch(`/demandas/gestor/${denunciaId}/prioridade`)
        .set('Authorization', `Bearer ${tokenCidadao}`)
        .send({ prioridade: 'ALTA' });

      expect(res.status).toBe(403);
    });

  });

});
