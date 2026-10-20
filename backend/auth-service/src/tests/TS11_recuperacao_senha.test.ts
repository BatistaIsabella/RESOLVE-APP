import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from 'vitest';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import app from '../app';
import { enviarEmailRedefinicao } from '../services/emailService';
import { limparRedisFalso } from './helpers/redisFalso';
import { SENHA_FORTE, TERMOS } from './helpers/dados';

vi.mock('../services/emailService', () => ({ enviarEmailRedefinicao: vi.fn().mockResolvedValue(undefined) }));

const prisma = new PrismaClient();
const emailEnviado = vi.mocked(enviarEmailRedefinicao);
const sufixo = Date.now();

const NOVA_SENHA = 'Laranja#Verde2027?';
const usuario = {
  nome: 'Pessoa Recuperacao',
  email: `ts11.recuperacao.${sufixo}@test.com`,
  senha: SENHA_FORTE,
  papel: 'cidadao',
  ...TERMOS,
};

const pedir = (email: string) => request(app).post('/auth/forgot-password').send({ email });
const redefinir = (token: string, novaSenha: string) =>
  request(app).post('/auth/reset-password').send({ token, novaSenha });

// O token só existe no e-mail, então os testes o leem da chamada ao serviço de e-mail.
function ultimoTokenEnviado(): string {
  const chamadas = emailEnviado.mock.calls;
  return chamadas[chamadas.length - 1][1];
}

async function limparTokens() {
  const dono = await prisma.usuario.findUnique({ where: { email: usuario.email } });
  if (dono) await prisma.tokenRedefinicao.deleteMany({ where: { usuario_id: dono.id } });
}

beforeAll(async () => {
  await request(app).post('/auth/register').send(usuario);
});

beforeEach(async () => {
  emailEnviado.mockClear();
  limparRedisFalso();
  await limparTokens();
});

afterAll(async () => {
  await prisma.usuario.deleteMany({ where: { email: usuario.email } });
  await prisma.$disconnect();
});

describe('TS11 - Recuperação de senha', () => {
  describe('pedido de redefinição', () => {
    it('envia o token por e-mail para a conta cadastrada', async () => {
      const res = await pedir(usuario.email);

      expect(res.status).toBe(200);
      expect(emailEnviado).toHaveBeenCalledOnce();
      expect(emailEnviado.mock.calls[0][0]).toBe(usuario.email);
      expect(ultimoTokenEnviado().length).toBeGreaterThanOrEqual(30);
    });

    it('responde igual para e-mail inexistente e não envia nada', async () => {
      const existente = await pedir(usuario.email);
      emailEnviado.mockClear();
      const inexistente = await pedir(`ninguem.${sufixo}@test.com`);

      expect(inexistente.status).toBe(200);
      expect(inexistente.body).toEqual(existente.body);
      expect(emailEnviado).not.toHaveBeenCalled();
    });

    it('guarda apenas o hash do token, nunca o valor enviado por e-mail', async () => {
      await pedir(usuario.email);
      const token = ultimoTokenEnviado();
      const dono = await prisma.usuario.findUnique({ where: { email: usuario.email } });
      const registros = await prisma.tokenRedefinicao.findMany({ where: { usuario_id: dono!.id } });

      expect(registros).toHaveLength(1);
      expect(registros[0].token_hash).not.toContain(token);
      expect(registros[0].token_hash).toHaveLength(64);
    });

    it('não gera um segundo token se o primeiro foi criado há menos de 1 minuto', async () => {
      await pedir(usuario.email);
      await pedir(usuario.email);

      expect(emailEnviado).toHaveBeenCalledOnce();
    });

    it('exige o campo email', async () => {
      const res = await request(app).post('/auth/forgot-password').send({});

      expect(res.status).toBe(400);
    });
  });

  describe('redefinição com o token', () => {
    it('troca a senha: a nova funciona e a antiga deixa de funcionar', async () => {
      await pedir(usuario.email);

      const res = await redefinir(ultimoTokenEnviado(), NOVA_SENHA);
      expect(res.status).toBe(200);

      const antiga = await request(app).post('/auth/login').send({ email: usuario.email, senha: SENHA_FORTE });
      const nova = await request(app).post('/auth/login').send({ email: usuario.email, senha: NOVA_SENHA });

      expect(antiga.status).toBe(401);
      expect(nova.status).toBe(200);
    });

    it('o token só pode ser usado uma vez', async () => {
      await pedir(usuario.email);
      const token = ultimoTokenEnviado();

      const primeira = await redefinir(token, 'Primeira#Troca2027!');
      const segunda = await redefinir(token, 'Segunda#Troca2027!');

      expect(primeira.status).toBe(200);
      expect(segunda.status).toBe(400);
      expect(segunda.body.error).toMatch(/inválido ou expirado/i);
    });

    it('recusa token expirado', async () => {
      await pedir(usuario.email);
      const token = ultimoTokenEnviado();
      await prisma.tokenRedefinicao.updateMany({ data: { expira_em: new Date(Date.now() - 1000) } });

      const res = await redefinir(token, NOVA_SENHA);

      expect(res.status).toBe(400);
    });

    it('recusa token inventado', async () => {
      const res = await redefinir('token-que-nao-existe', NOVA_SENHA);

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/inválido ou expirado/i);
    });

    it('aplica a política de senha na nova senha e mantém o token válido para nova tentativa', async () => {
      await pedir(usuario.email);
      const token = ultimoTokenEnviado();

      const fraca = await redefinir(token, 'senha123');
      expect(fraca.status).toBe(400);
      expect(fraca.body.detalhes.length).toBeGreaterThan(0);

      const forte = await redefinir(token, NOVA_SENHA);
      expect(forte.status).toBe(200);
    });

    it('dois pedidos simultâneos com o mesmo token: só um funciona', async () => {
      await pedir(usuario.email);
      const token = ultimoTokenEnviado();

      const [a, b] = await Promise.all([redefinir(token, 'Paralela#Um2027!'), redefinir(token, 'Paralela#Dois2027!')]);

      expect([a.status, b.status].sort()).toEqual([200, 400]);
    });

    it('encerra as sessões abertas antes da troca', async () => {
      const login = await request(app).post('/auth/login').send({ email: usuario.email, senha: SENHA_FORTE });
      const tokenAntigo = login.body.token;

      await pedir(usuario.email);
      await redefinir(ultimoTokenEnviado(), NOVA_SENHA);

      const res = await request(app).get('/auth/me').set('Authorization', `Bearer ${tokenAntigo}`);

      expect(res.status).toBe(401);
    });

    it('desbloqueia a conta que estava bloqueada por falhas de login', async () => {
      for (let i = 0; i < 3; i++) {
        await request(app).post('/auth/login').send({ email: usuario.email, senha: 'Errada#Senha123' });
      }
      const bloqueada = await request(app).post('/auth/login').send({ email: usuario.email, senha: SENHA_FORTE });
      expect(bloqueada.status).toBe(429);

      await pedir(usuario.email);
      await redefinir(ultimoTokenEnviado(), NOVA_SENHA);

      const res = await request(app).post('/auth/login').send({ email: usuario.email, senha: NOVA_SENHA });
      expect(res.status).toBe(200);
    });
  });
});
