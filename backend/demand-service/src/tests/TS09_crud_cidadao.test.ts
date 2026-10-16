
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { PrismaClient, Categorias, Regioes, NivelPrioridade, StatusDenuncia } from '@prisma/client';
import app from '../app';

const prisma = new PrismaClient();
const SECRET = process.env.JWT_SECRET || 'change-me';

const TERMO = 'ts09zebra';

let tokenDono: string;
let tokenOutro: string;
let tokenGestor: string;
let usuarioIdDono: number;
let usuarioIdOutro: number;
let usuarioIdGestor: number;
let cidadaoIdDono: number;
let gestorId: number;

const idsParaLimpar: number[] = [];

async function criarDenuncia(dados: {
  titulo: string;
  descricao?: string;
  status?: StatusDenuncia;
  comImagemEHistorico?: boolean;
}) {
  const denuncia = await prisma.denuncia.create({
    data: {
      titulo: dados.titulo,
      descricao: dados.descricao ?? 'Descrição TS09',
      categoria: Categorias.MANUTENCAO_DE_VIAS,
      regiao: Regioes.SERTAO,
      endereco: 'Rua TS09, 9 - Petrolina - PE',
      prioridade: NivelPrioridade.MEDIA,
      status: dados.status ?? StatusDenuncia.ABERTA,
      cidadao_id: cidadaoIdDono,
      ...(dados.comImagemEHistorico
        ? { imagens: { create: [{ caminho_file: 'data:image/png;base64,AAAA' }] } }
        : {}),
    },
  });

  if (dados.comImagemEHistorico) {
    await prisma.historico.create({
      data: {
        status: denuncia.status,
        prioridade: denuncia.prioridade,
        denuncia_id: denuncia.id_denuncia,
        gestor_id: gestorId,
      },
    });
  }

  idsParaLimpar.push(denuncia.id_denuncia);
  return denuncia.id_denuncia;
}

async function criarUsuario(nome: string, email: string, papel: string) {
  const [row] = await prisma.$queryRaw<{ id: number }[]>`
    INSERT INTO usuarios (nome, email, senha, papel)
    VALUES (${nome}, ${email}, 'hash', ${papel})
    ON CONFLICT (email) DO UPDATE SET nome = EXCLUDED.nome
    RETURNING id
  `;
  return row.id;
}

beforeAll(async () => {
  usuarioIdDono = await criarUsuario('Dono TS09', 'ts09.dono@test.com', 'CIDADAO');
  usuarioIdOutro = await criarUsuario('Outro TS09', 'ts09.outro@test.com', 'CIDADAO');
  usuarioIdGestor = await criarUsuario('Gestor TS09', 'ts09.gestor@test.com', 'GESTOR');

  tokenDono = jwt.sign({ userId: usuarioIdDono, papel: 'cidadao' }, SECRET);
  tokenOutro = jwt.sign({ userId: usuarioIdOutro, papel: 'cidadao' }, SECRET);
  tokenGestor = jwt.sign({ userId: usuarioIdGestor, papel: 'gestor' }, SECRET);

  const cidadao = await prisma.cidadao.upsert({
    where: { usuario_id: usuarioIdDono },
    update: {},
    create: { usuario_id: usuarioIdDono },
  });
  cidadaoIdDono = cidadao.id_cidadao;

  const gestor = await prisma.gestor.upsert({
    where: { usuario_id: usuarioIdGestor },
    update: {},
    create: { usuario_id: usuarioIdGestor },
  });
  gestorId = gestor.id_gestor;
});

afterAll(async () => {
  if (idsParaLimpar.length > 0) {
    await prisma.denuncia.deleteMany({ where: { id_denuncia: { in: idsParaLimpar } } });
  }
  await prisma.cidadao.deleteMany({
    where: { usuario_id: { in: [usuarioIdDono, usuarioIdOutro] } },
  });
  await prisma.gestor.deleteMany({ where: { usuario_id: usuarioIdGestor } });
  await prisma.$executeRawUnsafe(
    `DELETE FROM usuarios WHERE email IN ('ts09.dono@test.com', 'ts09.outro@test.com', 'ts09.gestor@test.com')`
  );
  await prisma.$disconnect();
});

describe('TS09 - CRUD das ocorrências', () => {

  describe('Detalhe pelo cidadão (GET /demandas/:id)', () => {

    it('Given denúncia do próprio cidadão, When GET, Then retorna 200', async () => {
      const id = await criarDenuncia({ titulo: 'TS09 detalhe' });

      const res = await request(app).get(`/demandas/${id}`).set('Authorization', `Bearer ${tokenDono}`);

      expect(res.status).toBe(200);
      expect(res.body.id_denuncia).toBe(id);
    });

    it('Given denúncia de outro cidadão, When GET, Then retorna 404', async () => {
      const id = await criarDenuncia({ titulo: 'TS09 detalhe alheio' });

      const res = await request(app).get(`/demandas/${id}`).set('Authorization', `Bearer ${tokenOutro}`);

      expect(res.status).toBe(404);
    });
  });

  describe('Edição pelo cidadão (PATCH /demandas/:id)', () => {

    it('Given denúncia ABERTA do dono, When PATCH com campos editáveis, Then retorna 200 e persiste', async () => {
      const id = await criarDenuncia({ titulo: 'TS09 editar' });

      const res = await request(app)
        .patch(`/demandas/${id}`)
        .set('Authorization', `Bearer ${tokenDono}`)
        .send({
          titulo: 'TS09 editado',
          descricao: 'Nova descrição',
          categoria: 'SANEAMENTO',
          regiao: 'AGRESTE',
          endereco: 'Rua Nova, 1',
        });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        id_denuncia: id,
        titulo: 'TS09 editado',
        descricao: 'Nova descrição',
        categoria: 'SANEAMENTO',
        regiao: 'AGRESTE',
        endereco: 'Rua Nova, 1',
        status: 'ABERTA',
      });
      expect(Array.isArray(res.body.imagens)).toBe(true);

      const noBanco = await prisma.denuncia.findUnique({ where: { id_denuncia: id } });
      expect(noBanco?.titulo).toBe('TS09 editado');
    });

    it('Given edição parcial, When PATCH só com titulo, Then os outros campos não mudam', async () => {
      const id = await criarDenuncia({ titulo: 'TS09 parcial', descricao: 'Fica igual' });

      const res = await request(app)
        .patch(`/demandas/${id}`)
        .set('Authorization', `Bearer ${tokenDono}`)
        .send({ titulo: 'TS09 parcial 2' });

      expect(res.status).toBe(200);
      expect(res.body.descricao).toBe('Fica igual');
    });

    it('Given denúncia de outro cidadão, When PATCH, Then retorna 404 e não altera', async () => {
      const id = await criarDenuncia({ titulo: 'TS09 alheia' });

      const res = await request(app)
        .patch(`/demandas/${id}`)
        .set('Authorization', `Bearer ${tokenOutro}`)
        .send({ titulo: 'Invasor' });

      expect(res.status).toBe(404);
      const noBanco = await prisma.denuncia.findUnique({ where: { id_denuncia: id } });
      expect(noBanco?.titulo).toBe('TS09 alheia');
    });

    it('Given denúncia EM_ANALISE, When PATCH pelo dono, Then retorna 409', async () => {
      const id = await criarDenuncia({ titulo: 'TS09 em análise', status: StatusDenuncia.EM_ANALISE });

      const res = await request(app)
        .patch(`/demandas/${id}`)
        .set('Authorization', `Bearer ${tokenDono}`)
        .send({ titulo: 'Tarde demais' });

      expect(res.status).toBe(409);
      expect(res.body.error).toContain('ABERTA');
    });

    it('Given campo não editável (status), When PATCH, Then retorna 400', async () => {
      const id = await criarDenuncia({ titulo: 'TS09 status' });

      const res = await request(app)
        .patch(`/demandas/${id}`)
        .set('Authorization', `Bearer ${tokenDono}`)
        .send({ status: 'RESOLVIDA' });

      expect(res.status).toBe(400);
    });

    it('Given body vazio, When PATCH, Then retorna 400', async () => {
      const id = await criarDenuncia({ titulo: 'TS09 vazio' });

      const res = await request(app)
        .patch(`/demandas/${id}`)
        .set('Authorization', `Bearer ${tokenDono}`)
        .send({});

      expect(res.status).toBe(400);
    });

    it('Given categoria inválida, When PATCH, Then retorna 400', async () => {
      const id = await criarDenuncia({ titulo: 'TS09 categoria' });

      const res = await request(app)
        .patch(`/demandas/${id}`)
        .set('Authorization', `Bearer ${tokenDono}`)
        .send({ categoria: 'BURACO' });

      expect(res.status).toBe(400);
    });

    it('Given token de gestor, When PATCH /demandas/:id, Then retorna 403', async () => {
      const id = await criarDenuncia({ titulo: 'TS09 gestor patch' });

      const res = await request(app)
        .patch(`/demandas/${id}`)
        .set('Authorization', `Bearer ${tokenGestor}`)
        .send({ titulo: 'X' });

      expect(res.status).toBe(403);
    });

    it('Given sem token, When PATCH, Then retorna 401', async () => {
      const res = await request(app).patch('/demandas/1').send({ titulo: 'X' });
      expect(res.status).toBe(401);
    });
  });

  describe('Exclusão pelo cidadão (DELETE /demandas/:id)', () => {

    it('Given denúncia ABERTA do dono com imagem e histórico, When DELETE, Then retorna 204 e apaga tudo', async () => {
      const id = await criarDenuncia({ titulo: 'TS09 excluir', comImagemEHistorico: true });

      const res = await request(app).delete(`/demandas/${id}`).set('Authorization', `Bearer ${tokenDono}`);

      expect(res.status).toBe(204);
      expect(await prisma.denuncia.findUnique({ where: { id_denuncia: id } })).toBeNull();
      expect(await prisma.imagem.count({ where: { denuncia_id: id } })).toBe(0);
      expect(await prisma.historico.count({ where: { denuncia_id: id } })).toBe(0);

      const detalhe = await request(app).get(`/demandas/${id}`).set('Authorization', `Bearer ${tokenDono}`);
      expect(detalhe.status).toBe(404);
    });

    it('Given denúncia de outro cidadão, When DELETE, Then retorna 404 e não apaga', async () => {
      const id = await criarDenuncia({ titulo: 'TS09 não é sua' });

      const res = await request(app).delete(`/demandas/${id}`).set('Authorization', `Bearer ${tokenOutro}`);

      expect(res.status).toBe(404);
      expect(await prisma.denuncia.findUnique({ where: { id_denuncia: id } })).not.toBeNull();
    });

    it('Given denúncia RESOLVIDA, When DELETE pelo dono, Then retorna 409', async () => {
      const id = await criarDenuncia({ titulo: 'TS09 resolvida', status: StatusDenuncia.RESOLVIDA });

      const res = await request(app).delete(`/demandas/${id}`).set('Authorization', `Bearer ${tokenDono}`);

      expect(res.status).toBe(409);
      expect(await prisma.denuncia.findUnique({ where: { id_denuncia: id } })).not.toBeNull();
    });

    it('Given ID inválido, When DELETE, Then retorna 400', async () => {
      const res = await request(app).delete('/demandas/abc').set('Authorization', `Bearer ${tokenDono}`);
      expect(res.status).toBe(400);
    });
  });

  describe('Exclusão pelo gestor (DELETE /demandas/gestor/:id)', () => {

    it('Given denúncia EM_ANALISE com histórico, When gestor DELETE, Then retorna 204', async () => {
      const id = await criarDenuncia({
        titulo: 'TS09 gestor exclui',
        status: StatusDenuncia.EM_ANALISE,
        comImagemEHistorico: true,
      });

      const res = await request(app)
        .delete(`/demandas/gestor/${id}`)
        .set('Authorization', `Bearer ${tokenGestor}`);

      expect(res.status).toBe(204);
      expect(await prisma.denuncia.findUnique({ where: { id_denuncia: id } })).toBeNull();
    });

    it('Given denúncia inexistente, When gestor DELETE, Then retorna 404', async () => {
      const res = await request(app)
        .delete('/demandas/gestor/999999999')
        .set('Authorization', `Bearer ${tokenGestor}`);

      expect(res.status).toBe(404);
    });

    it('Given token de cidadão, When DELETE /demandas/gestor/:id, Then retorna 403', async () => {
      const id = await criarDenuncia({ titulo: 'TS09 cidadão na rota do gestor' });

      const res = await request(app)
        .delete(`/demandas/gestor/${id}`)
        .set('Authorization', `Bearer ${tokenDono}`);

      expect(res.status).toBe(403);
      expect(await prisma.denuncia.findUnique({ where: { id_denuncia: id } })).not.toBeNull();
    });
  });

  describe('Busca por texto (?q=)', () => {

    let idNoTitulo: number;
    let idNaDescricao: number;
    let idEmAnalise: number;

    beforeAll(async () => {
      idNoTitulo = await criarDenuncia({ titulo: `Poste ${TERMO}` });
      idNaDescricao = await criarDenuncia({
        titulo: 'TS09 sem o termo no título',
        descricao: `Perto do ${TERMO.toUpperCase()} da praça`,
      });
      idEmAnalise = await criarDenuncia({
        titulo: `Buraco ${TERMO}`,
        status: StatusDenuncia.EM_ANALISE,
      });
      await criarDenuncia({ titulo: 'TS09 não deve aparecer' });
    });

    const ids = (body: { data: Array<{ id_denuncia: number }> }) =>
      body.data.map((d) => d.id_denuncia).sort((a, b) => a - b);

    it('Given termo no título ou na descrição, When GET /demandas/my-demands?q=, Then retorna só as que batem (sem diferenciar maiúsculas)', async () => {
      const res = await request(app)
        .get(`/demandas/my-demands?q=${TERMO}`)
        .set('Authorization', `Bearer ${tokenDono}`);

      expect(res.status).toBe(200);
      expect(ids(res.body)).toEqual([idNoTitulo, idNaDescricao, idEmAnalise].sort((a, b) => a - b));
      expect(res.body.pagination.total).toBe(3);
    });

    it('Given q + status, When GET /demandas/my-demands, Then aplica os dois filtros', async () => {
      const res = await request(app)
        .get(`/demandas/my-demands?q=${TERMO}&status=EM_ANALISE`)
        .set('Authorization', `Bearer ${tokenDono}`);

      expect(res.status).toBe(200);
      expect(ids(res.body)).toEqual([idEmAnalise]);
    });

    it('Given q com paginação, When limit=1, Then total continua contando todos os resultados', async () => {
      const res = await request(app)
        .get(`/demandas/my-demands?q=${TERMO}&page=1&limit=1`)
        .set('Authorization', `Bearer ${tokenDono}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.pagination.total).toBe(3);
      expect(res.body.pagination.totalPages).toBe(3);
    });

    it('Given outro cidadão, When busca o mesmo termo em /my-demands, Then não vê as denúncias do dono', async () => {
      const res = await request(app)
        .get(`/demandas/my-demands?q=${TERMO}`)
        .set('Authorization', `Bearer ${tokenOutro}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(0);
    });

    it('Given gestor, When GET /demandas/gestor?q=, Then encontra as do termo', async () => {
      const res = await request(app)
        .get(`/demandas/gestor?q=${TERMO}`)
        .set('Authorization', `Bearer ${tokenGestor}`);

      expect(res.status).toBe(200);
      expect(ids(res.body)).toEqual([idNoTitulo, idNaDescricao, idEmAnalise].sort((a, b) => a - b));
    });

    it('Given cidadão, When GET /demandas/demands/feed?q=, Then o feed também filtra', async () => {
      const res = await request(app)
        .get(`/demandas/demands/feed?q=${TERMO}`)
        .set('Authorization', `Bearer ${tokenOutro}`);

      expect(res.status).toBe(200);
      expect(res.body.pagination.total).toBe(3);
    });

    it('Given status inválido, When GET /demandas/my-demands?status=FECHADA, Then retorna 400', async () => {
      const res = await request(app)
        .get('/demandas/my-demands?status=FECHADA')
        .set('Authorization', `Bearer ${tokenDono}`);

      expect(res.status).toBe(400);
    });
  });
});
