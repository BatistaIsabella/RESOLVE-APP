import { describe, it, expect, beforeAll, beforeEach, afterAll, afterEach, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import app from '../app';
import { hashDoEmail } from '../utils/emailProtegido';
import { hashIdentificador } from '../services/auditoriaService';
import { limparRedisFalso } from './helpers/redisFalso';
import { SENHA_FORTE, TERMOS } from './helpers/dados';

const prisma = new PrismaClient();
const sufixo = Date.now();
const NOVA_SENHA = 'Verde#Camelo2027?';

let contador = 0;
const emailsCriados: string[] = [];

async function criarEUsuarioLogado() {
  const email = `ts12.${contador++}.${sufixo}@test.com`;
  emailsCriados.push(email);
  await request(app)
    .post('/auth/register')
    .send({ nome: 'Pessoa Conta', email, senha: SENHA_FORTE, papel: 'cidadao', ...TERMOS });
  const login = await request(app).post('/auth/login').send({ email, senha: SENHA_FORTE });
  return { email, token: login.body.token as string, id: login.body.userId as number };
}

const comToken = (token: string) => ({ Authorization: `Bearer ${token}` });

beforeAll(() => {
  process.env.DEMAND_SERVICE_URL = 'http://demand.teste:3002';
});

beforeEach(() => limparRedisFalso());

afterEach(() => vi.unstubAllGlobals());

afterAll(async () => {
  await prisma.usuario.deleteMany({ where: { email_hash: { in: emailsCriados.map(hashDoEmail) } } });
  await prisma.$disconnect();
});

describe('TS12 - Conta do usuário e sessões', () => {
  describe('GET /auth/me', () => {
    it('exige autenticação', async () => {
      const res = await request(app).get('/auth/me');

      expect(res.status).toBe(401);
    });

    it('devolve os dados da conta sem a senha', async () => {
      const { token, email } = await criarEUsuarioLogado();

      const res = await request(app).get('/auth/me').set(comToken(token));

      expect(res.status).toBe(200);
      expect(res.body.email).toBe(email);
      expect(res.body.papel).toBe('cidadao');
      expect(res.body.termosPendentes).toBe(false);
      expect(res.body.senha).toBeUndefined();
    });
  });

  describe('PATCH /auth/me (correção de dados)', () => {
    it('atualiza o nome', async () => {
      const { token } = await criarEUsuarioLogado();

      const res = await request(app).patch('/auth/me').set(comToken(token)).send({ nome: '  Nome Corrigido  ' });

      expect(res.status).toBe(200);
      expect(res.body.conta.nome).toBe('Nome Corrigido');
    });

    it('troca o e-mail e devolve um token com o e-mail novo', async () => {
      const { token, email } = await criarEUsuarioLogado();
      const novoEmail = `novo.${email}`;
      emailsCriados.push(novoEmail);

      const res = await request(app).patch('/auth/me').set(comToken(token)).send({ email: novoEmail.toUpperCase() });

      expect(res.status).toBe(200);
      expect(res.body.conta.email).toBe(novoEmail);
      expect((jwt.decode(res.body.token) as { email: string }).email).toBe(novoEmail);

      const login = await request(app).post('/auth/login').send({ email: novoEmail, senha: SENHA_FORTE });
      expect(login.status).toBe(200);
    });

    it('recusa e-mail que já pertence a outra conta', async () => {
      const a = await criarEUsuarioLogado();
      const b = await criarEUsuarioLogado();

      const res = await request(app).patch('/auth/me').set(comToken(b.token)).send({ email: a.email });

      expect(res.status).toBe(409);
    });

    it('recusa e-mail inválido e corpo vazio', async () => {
      const { token } = await criarEUsuarioLogado();

      const invalido = await request(app).patch('/auth/me').set(comToken(token)).send({ email: 'nao-e-email' });
      const vazio = await request(app).patch('/auth/me').set(comToken(token)).send({});

      expect(invalido.status).toBe(400);
      expect(vazio.status).toBe(400);
    });
  });

  describe('POST /auth/me/senha (troca de senha)', () => {
    it('exige a senha atual correta', async () => {
      const { token } = await criarEUsuarioLogado();

      const res = await request(app)
        .post('/auth/me/senha')
        .set(comToken(token))
        .send({ senhaAtual: 'Errada#Senha123', novaSenha: NOVA_SENHA });

      expect(res.status).toBe(403);
    });

    it('recusa nova senha igual à atual ou fora da política', async () => {
      const { token } = await criarEUsuarioLogado();

      const igual = await request(app)
        .post('/auth/me/senha')
        .set(comToken(token))
        .send({ senhaAtual: SENHA_FORTE, novaSenha: SENHA_FORTE });
      const fraca = await request(app)
        .post('/auth/me/senha')
        .set(comToken(token))
        .send({ senhaAtual: SENHA_FORTE, novaSenha: 'fraca123' });

      expect(igual.status).toBe(400);
      expect(fraca.status).toBe(400);
      expect(fraca.body.detalhes.length).toBeGreaterThan(0);
    });

    it('troca a senha, encerra as sessões antigas e mantém a atual logada', async () => {
      const { token: tokenAntigo, email } = await criarEUsuarioLogado();
      const outraSessao = (await request(app).post('/auth/login').send({ email, senha: SENHA_FORTE })).body.token;

      const res = await request(app)
        .post('/auth/me/senha')
        .set(comToken(tokenAntigo))
        .send({ senhaAtual: SENHA_FORTE, novaSenha: NOVA_SENHA });
      expect(res.status).toBe(200);

      const antigo = await request(app).get('/auth/me').set(comToken(tokenAntigo));
      const outra = await request(app).get('/auth/me').set(comToken(outraSessao));
      const novo = await request(app).get('/auth/me').set(comToken(res.body.token));

      expect(antigo.status).toBe(401);
      expect(outra.status).toBe(401);
      expect(novo.status).toBe(200);

      const login = await request(app).post('/auth/login').send({ email, senha: NOVA_SENHA });
      expect(login.status).toBe(200);
    });

    it('sem o Redis, as sessões antigas seguem valendo e o login continua funcionando', async () => {
      const { token, email } = await criarEUsuarioLogado();
      const redis = await import('./helpers/redisFalso');
      const original = redis.redisFalso.get;
      redis.redisFalso.get = async () => {
        throw new Error('Redis fora do ar');
      };

      try {
        const res = await request(app).get('/auth/me').set(comToken(token));
        const login = await request(app).post('/auth/login').send({ email, senha: SENHA_FORTE });

        expect(res.status).toBe(200);
        expect(login.status).toBe(200);
      } finally {
        redis.redisFalso.get = original;
      }
    });
  });

  describe('Aceite dos termos', () => {
    it('sinaliza termos pendentes no login e na conta quando não há aceite vigente', async () => {
      const { email, id, token } = await criarEUsuarioLogado();
      await prisma.usuario.update({ where: { id }, data: { aceite_termos_em: null, versao_termos: null } });

      const login = await request(app).post('/auth/login').send({ email, senha: SENHA_FORTE });
      const conta = await request(app).get('/auth/me').set(comToken(token));

      expect(login.body.termosPendentes).toBe(true);
      expect(conta.body.termosPendentes).toBe(true);
    });

    it('registra o aceite da versão vigente e recusa versão diferente', async () => {
      const { id, token } = await criarEUsuarioLogado();
      await prisma.usuario.update({ where: { id }, data: { aceite_termos_em: null, versao_termos: null } });

      const errada = await request(app).post('/auth/aceite-termos').set(comToken(token)).send({ versao: '9.9' });
      const certa = await request(app).post('/auth/aceite-termos').set(comToken(token)).send({ versao: '1.0' });

      expect(errada.status).toBe(400);
      expect(certa.status).toBe(200);
      expect(certa.body.termosPendentes).toBe(false);
    });

    it('nova versão dos termos volta a pedir o aceite', async () => {
      const { token } = await criarEUsuarioLogado();
      process.env.TERMOS_VERSAO = '2.0';

      try {
        const conta = await request(app).get('/auth/me').set(comToken(token));
        expect(conta.body.termosPendentes).toBe(true);
      } finally {
        delete process.env.TERMOS_VERSAO;
      }
    });
  });

  describe('DELETE /auth/me (exclusão da conta)', () => {
    it('exige a senha da conta', async () => {
      const { token } = await criarEUsuarioLogado();
      const fetchFalso = vi.fn();
      vi.stubGlobal('fetch', fetchFalso);

      const res = await request(app).delete('/auth/me').set(comToken(token)).send({ senha: 'Errada#Senha123' });

      expect(res.status).toBe(403);
      expect(fetchFalso).not.toHaveBeenCalled();
    });

    it('anonimiza as ocorrências no demand-service antes de remover a conta', async () => {
      const { token, email, id } = await criarEUsuarioLogado();
      const fetchFalso = vi.fn().mockResolvedValue({ ok: true });
      vi.stubGlobal('fetch', fetchFalso);

      const res = await request(app).delete('/auth/me').set(comToken(token)).send({ senha: SENHA_FORTE });

      expect(res.status).toBe(204);
      const [url, opcoes] = fetchFalso.mock.calls[0];
      expect(url).toBe('http://demand.teste:3002/demandas/me');
      expect(opcoes.method).toBe('DELETE');
      expect(opcoes.headers.Authorization).toBe(`Bearer ${token}`);

      expect(await prisma.usuario.findUnique({ where: { id } })).toBeNull();
      const login = await request(app).post('/auth/login').send({ email, senha: SENHA_FORTE });
      expect(login.status).toBe(401);
    });

    it('se o demand-service falhar, a conta NÃO é removida', async () => {
      const { token, id } = await criarEUsuarioLogado();
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }));

      const res = await request(app).delete('/auth/me').set(comToken(token)).send({ senha: SENHA_FORTE });

      expect(res.status).toBe(502);
      expect(await prisma.usuario.findUnique({ where: { id } })).not.toBeNull();
    });

    it('se o demand-service estiver fora do ar, a conta NÃO é removida', async () => {
      const { token, id } = await criarEUsuarioLogado();
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNREFUSED')));

      const res = await request(app).delete('/auth/me').set(comToken(token)).send({ senha: SENHA_FORTE });

      expect(res.status).toBe(502);
      expect(await prisma.usuario.findUnique({ where: { id } })).not.toBeNull();
    });

    it('apaga dos registros de segurança tudo o que liga os eventos à pessoa (usuário, IP, aparelho, hash do e-mail)', async () => {
      const { token, email, id } = await criarEUsuarioLogado();
      await request(app).post('/auth/login').set('User-Agent', 'RESOLVE-App/1.0').send({ email, senha: 'Errada#Senha123' });
      const antes = await prisma.eventoAuth.count({ where: { usuario_id: id } });
      expect(antes).toBeGreaterThan(1);

      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
      await request(app).delete('/auth/me').set(comToken(token)).send({ senha: SENHA_FORTE });

      expect(await prisma.eventoAuth.count({ where: { usuario_id: id } })).toBe(0);
      const porHash = await prisma.eventoAuth.count({ where: { identificador: hashIdentificador(email) } });
      expect(porHash).toBe(0);

      const exclusao = await prisma.eventoAuth.findFirst({ where: { tipo: 'CONTA_EXCLUIDA' }, orderBy: { id: 'desc' } });
      expect(exclusao).toMatchObject({ usuario_id: null, ip: null, user_agent: null, identificador: null });
    });

    it('o token da conta excluída deixa de funcionar', async () => {
      const { token } = await criarEUsuarioLogado();
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
      await request(app).delete('/auth/me').set(comToken(token)).send({ senha: SENHA_FORTE });

      const res = await request(app).get('/auth/me').set(comToken(token));

      expect(res.status).toBe(401);
    });
  });
});
