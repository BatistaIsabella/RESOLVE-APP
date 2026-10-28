import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { PrismaClient, Categorias, Regioes } from '@prisma/client';
import app from '../app';
import { getJwtSecret, validarConfiguracao } from '../config/env';
import { migrarEmailsSolicitante } from '../services/migracaoEmailService';
import { emailEstaProtegido, protegerEmail, revelarEmail } from '../utils/emailProtegido';

const prisma = new PrismaClient();
const SECRET = getJwtSecret();

const BASE_ID = 900000 + (Date.now() % 90000);
const idCidadao = BASE_ID;
const idGestor = BASE_ID + 1;
const EMAIL = `ts12.${BASE_ID}@test.com`;

const token = (userId: number, papel: 'cidadao' | 'gestor', email: string) =>
  jwt.sign({ userId, papel, email }, SECRET);
const bearer = (t: string) => ({ Authorization: `Bearer ${t}` });

const demanda = {
  titulo: 'TS12 e-mail cifrado',
  categoria: 'MANUTENCAO_DE_VIAS',
  regiao: 'AGRESTE',
  descricao: 'Criada para o teste do e-mail cifrado.',
  prioridade: 'ALTA',
  numero: '10',
  cep: '55000-000',
  bairro: 'Centro',
  cidade: 'Caruaru',
  rua: 'Rua 15 de Novembro',
};

let idCidadaoTabela: number;
const denunciasCriadas: number[] = [];

beforeAll(async () => {
  idCidadaoTabela = (await prisma.cidadao.create({ data: { usuario_id: idCidadao } })).id_cidadao;
  await prisma.gestor.create({ data: { usuario_id: idGestor } });
});

afterAll(async () => {
  await prisma.denuncia.deleteMany({ where: { cidadao_id: idCidadaoTabela } });
  await prisma.cidadao.deleteMany({ where: { id_cidadao: idCidadaoTabela } });
  await prisma.gestor.deleteMany({ where: { usuario_id: idGestor } });
  await prisma.$disconnect();
});

async function criarPelaApi() {
  const res = await request(app).post('/demandas').set(bearer(token(idCidadao, 'cidadao', EMAIL))).send(demanda);
  expect(res.status).toBe(201);
  denunciasCriadas.push(res.body.id_denuncia);
  return res.body.id_denuncia as number;
}

describe('TS12 - E-mail do solicitante cifrado em repouso', () => {
  it('grava o e-mail cifrado no banco ao criar a denúncia', async () => {
    const id = await criarPelaApi();

    const linha = await prisma.denuncia.findUnique({ where: { id_denuncia: id } });

    expect(linha!.email_solicitante_cifrado).not.toBeNull();
    expect(linha!.email_solicitante_cifrado).not.toContain(EMAIL);
    expect(linha!.email_solicitante_cifrado).not.toContain('@');
    expect(emailEstaProtegido(linha!.email_solicitante_cifrado!)).toBe(true);
    expect(revelarEmail(linha!.email_solicitante_cifrado!)).toBe(EMAIL);
  });

  it('não deixa o e-mail legível em consulta direta na coluna', async () => {
    await criarPelaApi();

    const linhas = await prisma.$queryRaw<{ id_denuncia: number }[]>`
      SELECT id_denuncia FROM demand.denuncias WHERE email_solicitante = ${EMAIL}`;

    expect(linhas).toHaveLength(0);
  });

  it('o dono continua vendo o próprio e-mail em texto', async () => {
    const id = await criarPelaApi();

    const res = await request(app).get(`/demandas/${id}`).set(bearer(token(idCidadao, 'cidadao', EMAIL)));

    expect(res.status).toBe(200);
    expect(res.body.email_solicitante).toBe(EMAIL);
  });

  it('o gestor vê o e-mail do solicitante em texto, para contato', async () => {
    const id = await criarPelaApi();

    const res = await request(app).get(`/demandas/gestor/${id}`).set(bearer(token(idGestor, 'gestor', 'gestor@test.com')));

    expect(res.status).toBe(200);
    expect(res.body.email_solicitante).toBe(EMAIL);
  });

  it('cifra de forma diferente a cada gravação (IV aleatório)', () => {
    expect(protegerEmail(EMAIL)).not.toBe(protegerEmail(EMAIL));
  });

  describe('ocorrências anteriores à criptografia', () => {
    it('migra o e-mail em texto para o formato cifrado e a API continua mostrando o e-mail', async () => {
      const id = await criarPelaApi();
      await prisma.denuncia.update({ where: { id_denuncia: id }, data: { email_solicitante_cifrado: EMAIL } });

      const migrados = await migrarEmailsSolicitante();

      expect(migrados).toBeGreaterThanOrEqual(1);
      const linha = await prisma.denuncia.findUnique({ where: { id_denuncia: id } });
      expect(emailEstaProtegido(linha!.email_solicitante_cifrado!)).toBe(true);
      expect(linha!.email_solicitante_cifrado).not.toContain('@');

      const res = await request(app).get(`/demandas/${id}`).set(bearer(token(idCidadao, 'cidadao', EMAIL)));
      expect(res.body.email_solicitante).toBe(EMAIL);
    });

    it('lê o e-mail em texto enquanto a migração não rodou', async () => {
      const id = await criarPelaApi();
      await prisma.denuncia.update({ where: { id_denuncia: id }, data: { email_solicitante_cifrado: EMAIL } });

      const res = await request(app).get(`/demandas/${id}`).set(bearer(token(idCidadao, 'cidadao', EMAIL)));

      expect(res.body.email_solicitante).toBe(EMAIL);
    });

    it('não altera o que já está cifrado', async () => {
      const id = await criarPelaApi();
      const antes = (await prisma.denuncia.findUnique({ where: { id_denuncia: id } }))!.email_solicitante_cifrado;

      await migrarEmailsSolicitante();

      const depois = (await prisma.denuncia.findUnique({ where: { id_denuncia: id } }))!.email_solicitante_cifrado;
      expect(depois).toBe(antes);
    });
  });

  describe('denúncia sem e-mail', () => {
    it('guarda null e devolve null', async () => {
      const semEmail = await prisma.denuncia.create({
        data: {
          titulo: 'TS12 sem e-mail',
          categoria: Categorias.SANEAMENTO,
          regiao: Regioes.AGRESTE,
          descricao: 'Sem e-mail do solicitante',
          endereco: 'Rua do Teste, 1',
          cidadao_id: idCidadaoTabela,
        },
      });

      const res = await request(app).get(`/demandas/${semEmail.id_denuncia}`).set(bearer(token(idCidadao, 'cidadao', EMAIL)));

      expect(res.status).toBe(200);
      expect(res.body.email_solicitante ?? null).toBeNull();
    });
  });

  describe('chaves', () => {
    const original = { ...process.env };

    afterEach(() => {
      process.env = { ...original };
    });

    it('rejeita chave de tamanho errado', () => {
      process.env.DADOS_ENCRYPTION_KEY = Buffer.alloc(16).toString('base64');

      expect(() => protegerEmail(EMAIL)).toThrow('DADOS_ENCRYPTION_KEY');
    });

    it('não decifra com outra chave', () => {
      const cifrado = protegerEmail(EMAIL);

      process.env.DADOS_ENCRYPTION_KEY = Buffer.alloc(32, 9).toString('base64');

      expect(() => revelarEmail(cifrado)).toThrow();
    });

    it('em produção, o serviço não sobe sem a chave', () => {
      process.env.NODE_ENV = 'production';
      process.env.JWT_SECRET = 'segredo-de-producao-do-teste';
      delete process.env.DADOS_ENCRYPTION_KEY;

      expect(() => validarConfiguracao()).toThrow('DADOS_ENCRYPTION_KEY');

      process.env.DADOS_ENCRYPTION_KEY = Buffer.alloc(32, 1).toString('base64');
      expect(() => validarConfiguracao()).not.toThrow();
    });
  });
});
