import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { PrismaClient, Categorias, Regioes, StatusDenuncia } from '@prisma/client';
import app from '../app';
import { getJwtSecret } from '../config/env';
import { executarRetencao } from '../jobs/retencao';
import { protegerEmail, revelarEmail } from '../utils/emailProtegido';

const prisma = new PrismaClient();
const SECRET = getJwtSecret();

const BASE_ID = 800000 + (Date.now() % 100000);
const idTitular = BASE_ID;
const idOutro = BASE_ID + 1;
const idGestor = BASE_ID + 2;

const token = (userId: number, papel: 'cidadao' | 'gestor') =>
  jwt.sign({ userId, papel, email: `u${userId}@test.com` }, SECRET);
const bearer = (t: string) => ({ Authorization: `Bearer ${t}` });

let cidadaoTitular: number;
let cidadaoOutro: number;
let denunciaTitular: number;
let denunciaOutro: number;

function umaDenuncia(cidadaoId: number, extra: Record<string, unknown> = {}) {
  return prisma.denuncia.create({
    data: {
      titulo: 'TS11 denúncia',
      categoria: Categorias.SANEAMENTO,
      regiao: Regioes.AGRESTE,
      descricao: 'Criada para o teste de direitos do titular',
      endereco: 'Rua do Teste, 5',
      email_solicitante_cifrado: protegerEmail(`u${cidadaoId}@test.com`),
      cidadao_id: cidadaoId,
      ...extra,
    },
  });
}

beforeAll(async () => {
  cidadaoTitular = (await prisma.cidadao.create({ data: { usuario_id: idTitular } })).id_cidadao;
  cidadaoOutro = (await prisma.cidadao.create({ data: { usuario_id: idOutro } })).id_cidadao;
  await prisma.gestor.create({ data: { usuario_id: idGestor } });

  denunciaTitular = (await umaDenuncia(cidadaoTitular)).id_denuncia;
  denunciaOutro = (await umaDenuncia(cidadaoOutro)).id_denuncia;

  await prisma.imagem.createMany({
    data: [
      { caminho_file: 'data:image/jpeg;base64,AAAA', denuncia_id: denunciaTitular },
      { caminho_file: 'data:image/jpeg;base64,BBBB', denuncia_id: denunciaTitular },
      { caminho_file: 'data:image/jpeg;base64,CCCC', denuncia_id: denunciaOutro },
    ],
  });
});

afterAll(async () => {
  const cidadaos = await prisma.cidadao.findMany({
    where: { OR: [{ id_cidadao: { in: [cidadaoTitular, cidadaoOutro] } }, { usuario_id: { in: [idTitular, idOutro] } }] },
  });
  const ids = cidadaos.map((c) => c.id_cidadao);
  await prisma.denuncia.deleteMany({ where: { cidadao_id: { in: ids } } });
  await prisma.cidadao.deleteMany({ where: { id_cidadao: { in: ids } } });
  await prisma.gestor.deleteMany({ where: { OR: [{ usuario_id: idGestor }, { usuario_id: { lt: 0 }, historicos: { none: {} } }] } });
  await prisma.$disconnect();
});

describe('TS11 - Acesso e portabilidade dos dados do titular', () => {
  it('exige autenticação', async () => {
    const res = await request(app).get('/demandas/me/export');

    expect(res.status).toBe(401);
  });

  it('exporta só as denúncias do próprio titular, sem as fotos em si', async () => {
    const res = await request(app).get('/demandas/me/export').set(bearer(token(idTitular, 'cidadao')));

    expect(res.status).toBe(200);
    expect(res.body.denuncias).toHaveLength(1);
    expect(res.body.denuncias[0]).toMatchObject({
      id: denunciaTitular,
      email_solicitante: `u${cidadaoTitular}@test.com`,
      quantidade_fotos: 2,
    });
    expect(JSON.stringify(res.body)).not.toContain('base64');
    expect(JSON.stringify(res.body)).not.toContain(`u${cidadaoOutro}@test.com`);
  });

  it('exporta o histórico de atualizações de um gestor', async () => {
    await request(app)
      .patch(`/demandas/gestor/${denunciaOutro}/status`)
      .set(bearer(token(idGestor, 'gestor')))
      .send({ status: 'EM_ANALISE' });

    const res = await request(app).get('/demandas/me/export').set(bearer(token(idGestor, 'gestor')));

    expect(res.status).toBe(200);
    expect(res.body.papel).toBe('gestor');
    expect(res.body.atualizacoes.length).toBeGreaterThan(0);
  });
});

describe('TS11 - Eliminação dos dados pessoais (anonimização)', () => {
  it('apaga e-mail e fotos, mantém a ocorrência e desfaz o vínculo com a conta', async () => {
    const res = await request(app).delete('/demandas/me').set(bearer(token(idTitular, 'cidadao')));

    expect(res.status).toBe(204);

    const denuncia = await prisma.denuncia.findUnique({ where: { id_denuncia: denunciaTitular } });
    expect(denuncia).not.toBeNull();
    expect(denuncia?.email_solicitante_cifrado).toBeNull();
    expect(await prisma.imagem.count({ where: { denuncia_id: denunciaTitular } })).toBe(0);

    const cidadao = await prisma.cidadao.findUnique({ where: { id_cidadao: cidadaoTitular } });
    expect(cidadao?.usuario_id).toBeLessThan(0);
  });

  it('não mexe nos dados de outros titulares', async () => {
    const denuncia = await prisma.denuncia.findUnique({ where: { id_denuncia: denunciaOutro } });

    expect(revelarEmail(denuncia!.email_solicitante_cifrado!)).toBe(`u${cidadaoOutro}@test.com`);
    expect(await prisma.imagem.count({ where: { denuncia_id: denunciaOutro } })).toBe(1);
  });

  it('depois da eliminação, a exportação não devolve mais nada para aquele usuário', async () => {
    const res = await request(app).get('/demandas/me/export').set(bearer(token(idTitular, 'cidadao')));

    expect(res.body.denuncias).toEqual([]);
  });

  it('chamar de novo não dá erro (operação repetível)', async () => {
    const res = await request(app).delete('/demandas/me').set(bearer(token(idTitular, 'cidadao')));

    expect(res.status).toBe(204);
  });

  it('a rota /me não é confundida com /:id', async () => {
    const res = await request(app).delete('/demandas/me').set(bearer(token(idOutro, 'cidadao')));

    expect(res.status).toBe(204);
    expect(await prisma.denuncia.findUnique({ where: { id_denuncia: denunciaOutro } })).not.toBeNull();
  });

  it('gestor excluído deixa de estar vinculado ao usuário, mas o histórico de ações permanece', async () => {
    const antes = await prisma.gestor.findUnique({ where: { usuario_id: idGestor } });
    const res = await request(app).delete('/demandas/me').set(bearer(token(idGestor, 'gestor')));

    expect(res.status).toBe(204);
    expect(await prisma.gestor.findUnique({ where: { usuario_id: idGestor } })).toBeNull();
    expect((await prisma.gestor.findUnique({ where: { id_gestor: antes!.id_gestor } }))?.usuario_id).toBeLessThan(0);
    await prisma.gestor.delete({ where: { id_gestor: antes!.id_gestor } }).catch(() => {});
  });
});

describe('TS11 - Retenção de 5 anos', () => {
  const anosAtras = (anos: number, meses = 0) => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - anos);
    d.setMonth(d.getMonth() - meses);
    return d;
  };
  const criados: number[] = [];
  let cidadaoRetencao: number;

  beforeAll(async () => {
    cidadaoRetencao = (await prisma.cidadao.create({ data: { usuario_id: BASE_ID + 50 } })).id_cidadao;
  });

  afterAll(async () => {
    await prisma.denuncia.deleteMany({ where: { id_denuncia: { in: criados } } });
    await prisma.cidadao.delete({ where: { id_cidadao: cidadaoRetencao } });
  });

  async function criar(status: StatusDenuncia, dataConclusao: Date | null) {
    const d = await umaDenuncia(cidadaoRetencao, { status, data_conclusao: dataConclusao });
    criados.push(d.id_denuncia);
    return d.id_denuncia;
  }

  it('remove denúncia resolvida há mais de 5 anos, com fotos e histórico', async () => {
    const id = await criar('RESOLVIDA', anosAtras(5, 1));
    await prisma.imagem.create({ data: { caminho_file: 'data:image/jpeg;base64,ZZZ', denuncia_id: id } });

    const { removidas } = await executarRetencao();

    expect(removidas).toBeGreaterThanOrEqual(1);
    expect(await prisma.denuncia.findUnique({ where: { id_denuncia: id } })).toBeNull();
    expect(await prisma.imagem.count({ where: { denuncia_id: id } })).toBe(0);
  });

  it('mantém denúncia resolvida há menos de 5 anos', async () => {
    const id = await criar('RESOLVIDA', anosAtras(4, 11));

    await executarRetencao();

    expect(await prisma.denuncia.findUnique({ where: { id_denuncia: id } })).not.toBeNull();
  });

  it('nunca remove denúncia que ainda não foi resolvida, por mais antiga que seja', async () => {
    const id = await criar('EM_ANALISE', null);
    await prisma.denuncia.update({ where: { id_denuncia: id }, data: { data_registro: anosAtras(8) } });

    await executarRetencao();

    expect(await prisma.denuncia.findUnique({ where: { id_denuncia: id } })).not.toBeNull();
  });

  it('o prazo de 5 anos é contado a partir da conclusão, não do registro', async () => {
    const id = await criar('RESOLVIDA', anosAtras(1));
    await prisma.denuncia.update({ where: { id_denuncia: id }, data: { data_registro: anosAtras(9) } });

    await executarRetencao();

    expect(await prisma.denuncia.findUnique({ where: { id_denuncia: id } })).not.toBeNull();
  });

  it('preenche a data de conclusão das denúncias resolvidas antes desta rotina existir', async () => {
    const id = await criar('RESOLVIDA', null);

    await executarRetencao();

    const denuncia = await prisma.denuncia.findUnique({ where: { id_denuncia: id } });
    expect(denuncia?.data_conclusao).toBeInstanceOf(Date);
  });

  it('respeita o prazo configurado', async () => {
    const id = await criar('RESOLVIDA', anosAtras(2));

    await executarRetencao(new Date(), 3);
    expect(await prisma.denuncia.findUnique({ where: { id_denuncia: id } })).not.toBeNull();

    await executarRetencao(new Date(), 1);
    expect(await prisma.denuncia.findUnique({ where: { id_denuncia: id } })).toBeNull();
  });
});
