
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
  numero: '45',
  cep: '50000-000',
  bairro: 'Boa Viagem',
  cidade: 'Recife',
  rua: 'Av. Boa Viagem',
};

const idsParaLimpar: number[] = [];

beforeAll(async () => {
  // demand-service não tem o model Usuario — SQL direto para satisfazer a FK no ambiente local
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

  describe('Autenticação', () => {
    it('rejeita requisição sem token', async () => {
      const res = await request(app).post('/demandas').send(demandaValida);
      expect(res.status).toBe(401);
    });

    it('rejeita gestor tentando criar demanda', async () => {
      const res = await request(app)
        .post('/demandas')
        .set('Authorization', `Bearer ${tokenGestor}`)
        .send(demandaValida);
      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Acesso restrito a cidadãos');
    });
  });

  describe('Validação de campos', () => {
    it('rejeita body vazio', async () => {
      const res = await request(app)
        .post('/demandas')
        .set('Authorization', `Bearer ${token}`)
        .send({});
      expect(res.status).toBe(400);
    });

    it('rejeita categoria inválida', async () => {
      const res = await request(app)
        .post('/demandas')
        .set('Authorization', `Bearer ${token}`)
        .send({ ...demandaValida, categoria: 'CATEGORIA_INEXISTENTE' });
      expect(res.status).toBe(400);
    });

    it('rejeita região inválida', async () => {
      const res = await request(app)
        .post('/demandas')
        .set('Authorization', `Bearer ${token}`)
        .send({ ...demandaValida, regiao: 'REGIAO_INEXISTENTE' });
      expect(res.status).toBe(400);
    });
  });

  describe('Persistência no banco', () => {
    it('persiste a demanda e retorna 201 com os dados corretos', async () => {
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

    it('aplica status ABERTA por padrão', async () => {
      const res = await request(app)
        .post('/demandas')
        .set('Authorization', `Bearer ${token}`)
        .send(demandaValida);

      expect(res.body.status).toBe('ABERTA');
      idsParaLimpar.push(res.body.id_denuncia);
    });

    it('aplica prioridade MEDIA quando não informada', async () => {
      const { prioridade, ...semPrioridade } = demandaValida;
      const res = await request(app)
        .post('/demandas')
        .set('Authorization', `Bearer ${token}`)
        .send(semPrioridade);

      expect(res.status).toBe(201);
      expect(res.body.prioridade).toBe('MEDIA');
      idsParaLimpar.push(res.body.id_denuncia);
    });

    // Concorrência: Promise.all dispara dois POSTs ao mesmo tempo —
    // valida que o upsert não cria cidadão duplicado sob carga paralela.
    it('lida com duas criações simultâneas do mesmo cidadão sem duplicar o registro', async () => {
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
