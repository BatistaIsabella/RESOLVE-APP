import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { PrismaClient, Categorias, Regioes } from '@prisma/client';
import app from '../app';
import { getJwtSecret } from '../config/env';
import { protegerEmail } from '../utils/emailProtegido';

const prisma = new PrismaClient();
const SECRET = getJwtSecret();

const BASE_ID = 700000 + (Date.now() % 100000);
const idCidadaoA = BASE_ID;
const idCidadaoB = BASE_ID + 1;
const idGestorGeral = BASE_ID + 2;
const idGestorLuz = BASE_ID + 3;
const idGestorObras = BASE_ID + 4;

const token = (userId: number, papel: 'cidadao' | 'gestor', extra: Record<string, unknown> = {}) =>
  jwt.sign({ userId, papel, email: `u${userId}@test.com`, ...extra }, SECRET);

const tokenA = token(idCidadaoA, 'cidadao');
const tokenB = token(idCidadaoB, 'cidadao');
const tokenGeral = token(idGestorGeral, 'gestor', { orgao: 'GERAL' });
const tokenLuz = token(idGestorLuz, 'gestor', { orgao: 'ILUMINACAO', categorias: ['ILUMINACAO_PUBLICA'] });
const tokenObras = token(idGestorObras, 'gestor', {
  orgao: 'OBRAS_E_SANEAMENTO',
  categorias: ['MANUTENCAO_DE_VIAS', 'SANEAMENTO'],
});

const bearer = (t: string) => ({ Authorization: `Bearer ${t}` });

let denunciaLuz: number;
let denunciaLixo: number;
let denunciaVia: number;

async function criarDenuncia(cidadaoId: number, categoria: Categorias, extra: Record<string, unknown> = {}) {
  const d = await prisma.denuncia.create({
    data: {
      titulo: `TS10 ${categoria}`,
      categoria,
      regiao: Regioes.AGRESTE,
      descricao: 'Denúncia criada para o teste de escopo',
      endereco: 'Rua Teste, 10, Centro, Recife, PE (-8.05012, -34.88123)',
      email_solicitante_cifrado: protegerEmail(`solicitante.${cidadaoId}@test.com`),
      cidadao_id: cidadaoId,
      ...extra,
    },
  });
  return d.id_denuncia;
}

beforeAll(async () => {
  const cidadaoA = await prisma.cidadao.create({ data: { usuario_id: idCidadaoA } });
  denunciaLuz = await criarDenuncia(cidadaoA.id_cidadao, Categorias.ILUMINACAO_PUBLICA);
  denunciaLixo = await criarDenuncia(cidadaoA.id_cidadao, Categorias.COLETA_DE_LIXO);
  denunciaVia = await criarDenuncia(cidadaoA.id_cidadao, Categorias.MANUTENCAO_DE_VIAS);
  await prisma.cidadao.create({ data: { usuario_id: idCidadaoB } });
});

afterAll(async () => {
  const cidadaos = await prisma.cidadao.findMany({
    where: { usuario_id: { in: [idCidadaoA, idCidadaoB] } },
  });
  await prisma.denuncia.deleteMany({ where: { cidadao_id: { in: cidadaos.map((c) => c.id_cidadao) } } });
  await prisma.cidadao.deleteMany({ where: { id_cidadao: { in: cidadaos.map((c) => c.id_cidadao) } } });
  await prisma.gestor.deleteMany({ where: { usuario_id: { in: [idGestorGeral, idGestorLuz, idGestorObras] } } });
  await prisma.$disconnect();
});

describe('TS10 - Escopo do gestor por órgão', () => {
  const idsDaLista = (corpo: { data: Array<{ id_denuncia: number }> }) => corpo.data.map((d) => d.id_denuncia);

  it('gestor de um órgão só vê as categorias do seu órgão na listagem', async () => {
    const res = await request(app).get('/demandas/gestor?limit=100').set(bearer(tokenLuz));

    expect(res.status).toBe(200);
    const ids = idsDaLista(res.body);
    expect(ids).toContain(denunciaLuz);
    expect(ids).not.toContain(denunciaLixo);
    expect(ids).not.toContain(denunciaVia);
    expect(res.body.data.every((d: { categoria: string }) => d.categoria === 'ILUMINACAO_PUBLICA')).toBe(true);
  });

  it('o total da paginação respeita o escopo', async () => {
    const luz = await request(app).get('/demandas/gestor?limit=1').set(bearer(tokenLuz));
    const geral = await request(app).get('/demandas/gestor?limit=1').set(bearer(tokenGeral));

    expect(luz.body.pagination.total).toBeLessThan(geral.body.pagination.total);
  });

  it('órgão com mais de uma categoria vê todas as suas e nenhuma de fora', async () => {
    const res = await request(app).get('/demandas/gestor?limit=100').set(bearer(tokenObras));
    const ids = idsDaLista(res.body);

    expect(ids).toContain(denunciaVia);
    expect(ids).not.toContain(denunciaLuz);
    expect(ids).not.toContain(denunciaLixo);
  });

  it('gestão geral continua vendo todas as categorias', async () => {
    const res = await request(app).get('/demandas/gestor?limit=100').set(bearer(tokenGeral));
    const ids = idsDaLista(res.body);

    expect(ids).toEqual(expect.arrayContaining([denunciaLuz, denunciaLixo, denunciaVia]));
  });

  it('filtrar por uma categoria de outro órgão devolve lista vazia', async () => {
    const res = await request(app).get('/demandas/gestor?categoria=COLETA_DE_LIXO&limit=100').set(bearer(tokenLuz));

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it('detalhe de denúncia de outro órgão responde 404', async () => {
    const fora = await request(app).get(`/demandas/gestor/${denunciaLixo}`).set(bearer(tokenLuz));
    const dentro = await request(app).get(`/demandas/gestor/${denunciaLuz}`).set(bearer(tokenLuz));

    expect(fora.status).toBe(404);
    expect(dentro.status).toBe(200);
  });

  it('não permite alterar status, prioridade nem excluir denúncia de outro órgão', async () => {
    const status = await request(app)
      .patch(`/demandas/gestor/${denunciaLixo}/status`)
      .set(bearer(tokenLuz))
      .send({ status: 'EM_ANALISE' });
    const prioridade = await request(app)
      .patch(`/demandas/gestor/${denunciaLixo}/prioridade`)
      .set(bearer(tokenLuz))
      .send({ prioridade: 'ALTA' });
    const exclusao = await request(app).delete(`/demandas/gestor/${denunciaLixo}`).set(bearer(tokenLuz));

    expect([status.status, prioridade.status, exclusao.status]).toEqual([404, 404, 404]);

    const intacta = await prisma.denuncia.findUnique({ where: { id_denuncia: denunciaLixo } });
    expect(intacta?.status).toBe('ABERTA');
    expect(intacta?.prioridade).toBe('MEDIA');
  });

  it('altera status e prioridade da denúncia do próprio órgão', async () => {
    const status = await request(app)
      .patch(`/demandas/gestor/${denunciaLuz}/status`)
      .set(bearer(tokenLuz))
      .send({ status: 'EM_ANALISE' });
    const prioridade = await request(app)
      .patch(`/demandas/gestor/${denunciaLuz}/prioridade`)
      .set(bearer(tokenLuz))
      .send({ prioridade: 'ALTA' });

    expect(status.status).toBe(200);
    expect(prioridade.status).toBe(200);
  });

  it('cidadão continua sem acesso às rotas de gestor', async () => {
    const res = await request(app).get('/demandas/gestor').set(bearer(tokenA));

    expect(res.status).toBe(403);
  });
});

describe('TS10 - Data de conclusão', () => {
  it('é gravada ao resolver e apagada ao reabrir', async () => {
    const resolvida = await request(app)
      .patch(`/demandas/gestor/${denunciaVia}/status`)
      .set(bearer(tokenGeral))
      .send({ status: 'RESOLVIDA' });
    expect(resolvida.status).toBe(200);
    expect((await prisma.denuncia.findUnique({ where: { id_denuncia: denunciaVia } }))?.data_conclusao).toBeInstanceOf(Date);

    const reaberta = await request(app)
      .patch(`/demandas/gestor/${denunciaVia}/status`)
      .set(bearer(tokenGeral))
      .send({ status: 'ABERTA' });
    expect(reaberta.status).toBe(200);
    expect((await prisma.denuncia.findUnique({ where: { id_denuncia: denunciaVia } }))?.data_conclusao).toBeNull();
  });
});

describe('TS10 - Feed sem dados pessoais', () => {
  it('o feed do cidadão não traz e-mail nem identificador de quem registrou', async () => {
    const res = await request(app).get('/demandas/feed?limit=100').set(bearer(tokenB));

    expect(res.status).toBe(200);
    const doTeste = res.body.data.filter((d: { id_denuncia: number }) =>
      [denunciaLuz, denunciaLixo, denunciaVia].includes(d.id_denuncia)
    );
    expect(doTeste).toHaveLength(3);
    for (const item of doTeste) {
      expect(item.email_solicitante).toBeUndefined();
      expect(item.cidadao_id).toBeUndefined();
    }
    expect(JSON.stringify(res.body)).not.toContain('solicitante.');
  });

  it('o feed reduz a precisão das coordenadas do endereço', async () => {
    const res = await request(app).get('/demandas/demands/feed?limit=100').set(bearer(tokenB));
    const item = res.body.data.find((d: { id_denuncia: number }) => d.id_denuncia === denunciaLuz);

    expect(item.endereco).toContain('(-8.050, -34.881)');
    expect(item.endereco).not.toContain('-8.05012');
  });

  it('um cidadão não abre a denúncia de outro pelo id', async () => {
    const res = await request(app).get(`/demandas/${denunciaLuz}`).set(bearer(tokenB));

    expect(res.status).toBe(404);
  });

  it('o dono continua vendo a própria denúncia completa', async () => {
    const res = await request(app).get(`/demandas/${denunciaLuz}`).set(bearer(tokenA));

    expect(res.status).toBe(200);
    expect(res.body.email_solicitante).toBe(`solicitante.${(await prisma.cidadao.findUnique({ where: { usuario_id: idCidadaoA } }))!.id_cidadao}@test.com`);
  });
});
