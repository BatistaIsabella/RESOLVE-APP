import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import app from '../app';
import { getJwtSecret } from '../config/env';

const prisma = new PrismaClient();
const SECRET = getJwtSecret();

const BASE_ID = 950000 + (Date.now() % 40000);
const idCidadao = BASE_ID;

const token = jwt.sign({ userId: idCidadao, papel: 'cidadao', email: `ts13.${BASE_ID}@test.com` }, SECRET);
const bearer = { Authorization: `Bearer ${token}` };

const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
const fotoValida = `data:image/jpeg;base64,${JPEG.toString('base64')}`;

const demanda = {
  titulo: 'TS13 fotos',
  categoria: 'MANUTENCAO_DE_VIAS',
  regiao: 'AGRESTE',
  descricao: 'Criada para o teste de validação das fotos.',
  prioridade: 'ALTA',
  numero: '10',
  cep: '55000-000',
  bairro: 'Centro',
  cidade: 'Caruaru',
  rua: 'Rua 15 de Novembro',
};

let idCidadaoTabela: number | undefined;

const criar = (imagens?: unknown) => request(app).post('/demandas').set(bearer).send({ ...demanda, imagens });
const contarDenuncias = async () =>
  idCidadaoTabela ? prisma.denuncia.count({ where: { cidadao_id: idCidadaoTabela } }) : 0;

beforeAll(async () => {
  idCidadaoTabela = (await prisma.cidadao.create({ data: { usuario_id: idCidadao } })).id_cidadao;
});

afterAll(async () => {
  await prisma.denuncia.deleteMany({ where: { cidadao_id: idCidadaoTabela } });
  await prisma.cidadao.deleteMany({ where: { id_cidadao: idCidadaoTabela } });
  await prisma.$disconnect();
});

describe('TS13 - Validação das fotos na criação da denúncia', () => {
  it('cria a denúncia com uma foto válida e grava a foto', async () => {
    const res = await criar([fotoValida]);

    expect(res.status).toBe(201);
    expect(res.body.imagens).toHaveLength(1);
    expect(res.body.imagens[0].caminho_file).toBe(fotoValida);
  });

  it('continua criando a denúncia sem fotos', async () => {
    expect((await criar()).status).toBe(201);
    expect((await criar([])).status).toBe(201);
  });

  it.each([
    ['texto qualquer', ['qualquer coisa']],
    ['nome de arquivo', ['foto.jpg']],
    ['html disfarçado', [`data:image/png;base64,${Buffer.from('<script>x()</script>').toString('base64')}`]],
    ['svg', [`data:image/svg+xml;base64,${Buffer.from('<svg/>').toString('base64')}`]],
    ['conteúdo que não é do tipo declarado', [`data:image/png;base64,${JPEG.toString('base64')}`]],
    ['imagens que não é lista', 'foto'],
  ])('recusa com 400 e não cria a denúncia: %s', async (_nome, imagens) => {
    const antes = await contarDenuncias();

    const res = await criar(imagens);

    expect(res.status).toBe(400);
    expect(await contarDenuncias()).toBe(antes);
  });

  it('recusa mais fotos do que o limite (5)', async () => {
    const antes = await contarDenuncias();

    const res = await criar(new Array(6).fill(fotoValida));

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('no máximo 5');
    expect(await contarDenuncias()).toBe(antes);
  });

  it('recusa foto maior que 2 MB com 413', async () => {
    const grande = `data:image/jpeg;base64,${Buffer.concat([JPEG, Buffer.alloc(2 * 1024 * 1024 + 10, 1)]).toString('base64')}`;
    const antes = await contarDenuncias();

    const res = await criar([grande]);

    expect(res.status).toBe(413);
    expect(await contarDenuncias()).toBe(antes);
  });
});
