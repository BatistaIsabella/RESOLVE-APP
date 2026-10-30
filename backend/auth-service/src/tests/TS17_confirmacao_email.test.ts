import { describe, it, expect, beforeEach, afterEach, afterAll, vi } from 'vitest';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import app from '../app';
import { enviarEmailConfirmacao, enviarEmailContaExistente } from '../services/emailService';
import { removerContasNaoConfirmadas } from '../services/confirmacaoEmailService';
import { hashDoEmail } from '../utils/emailProtegido';
import { limparRedisFalso } from './helpers/redisFalso';
import { SENHA_FORTE, TERMOS } from './helpers/dados';

vi.mock('../services/emailService', () => ({
  enviarEmailRedefinicao: vi.fn().mockResolvedValue(undefined),
  enviarEmailConfirmacao: vi.fn().mockResolvedValue(undefined),
  enviarEmailContaExistente: vi.fn().mockResolvedValue(undefined),
}));

const prisma = new PrismaClient();
const confirmacaoEnviada = vi.mocked(enviarEmailConfirmacao);
const avisoEnviado = vi.mocked(enviarEmailContaExistente);
const sufixo = Date.now();
const SENHA_NOVA = 'Laranja#Verde2027?';

let contador = 0;
const emailsCriados: string[] = [];

function novoEmail() {
  const email = `ts17.${contador++}.${sufixo}@test.com`;
  emailsCriados.push(email);
  return email;
}

const cadastrar = (email: string, senha = SENHA_FORTE) =>
  request(app).post('/auth/register').send({ nome: 'Pessoa Confirmada', email, senha, papel: 'cidadao', ...TERMOS });
const entrar = (email: string, senha = SENHA_FORTE) => request(app).post('/auth/login').send({ email, senha });
const confirmar = (token: string) => request(app).post('/auth/confirmar-email').send({ token });
const reenviar = (email: string) => request(app).post('/auth/reenviar-confirmacao').send({ email });
const noBanco = (email: string) => prisma.usuario.findUnique({ where: { email_hash: hashDoEmail(email) } });

// O código só existe no e-mail, então os testes o leem da chamada ao serviço de e-mail.
function ultimoCodigo(email: string): string {
  const chamadas = confirmacaoEnviada.mock.calls.filter(([destino]) => destino === email);
  expect(chamadas.length).toBeGreaterThan(0);
  return chamadas[chamadas.length - 1][1];
}

beforeEach(() => {
  limparRedisFalso();
  confirmacaoEnviada.mockClear();
  avisoEnviado.mockClear();
  process.env.CONFIRMACAO_EMAIL_HABILITADA = 'true';
});

afterEach(() => {
  delete process.env.CONFIRMACAO_EMAIL_HABILITADA;
});

afterAll(async () => {
  await prisma.usuario.deleteMany({ where: { email_hash: { in: emailsCriados.map(hashDoEmail) } } });
  await prisma.$disconnect();
});

describe('TS17 - Confirmação de e-mail no cadastro', () => {
  describe('cadastro', () => {
    it('responde 202 sem criar sessão e sem devolver dados da conta', async () => {
      const res = await cadastrar(novoEmail());

      expect(res.status).toBe(202);
      expect(res.body.confirmacaoNecessaria).toBe(true);
      expect(res.body).not.toHaveProperty('id');
      expect(res.body).not.toHaveProperty('email');
      expect(res.body).not.toHaveProperty('token');
    });

    it('cria a conta como pendente e envia o código por e-mail', async () => {
      const email = novoEmail();
      await cadastrar(email);

      const conta = await noBanco(email);

      expect(conta!.email_pendente).toBe(true);
      expect(confirmacaoEnviada).toHaveBeenCalledTimes(1);
      expect(ultimoCodigo(email).length).toBeGreaterThan(20);
    });

    it('guarda só o hash do código no banco', async () => {
      const email = novoEmail();
      await cadastrar(email);
      const codigo = ultimoCodigo(email);

      const tokens = await prisma.tokenConfirmacaoEmail.findMany({ where: { usuario_id: (await noBanco(email))!.id } });

      expect(tokens).toHaveLength(1);
      expect(tokens[0].token_hash).not.toBe(codigo);
      expect(tokens[0].token_hash).toMatch(/^[0-9a-f]{64}$/);
    });

    it('ainda valida senha, termos e formato do e-mail antes de aceitar', async () => {
      expect((await cadastrar(novoEmail(), 'fraca')).status).toBe(400);
      expect((await cadastrar('sem-arroba')).status).toBe(400);
      const semAceite = await request(app)
        .post('/auth/register')
        .send({ nome: 'Pessoa', email: novoEmail(), senha: SENHA_FORTE, papel: 'cidadao' });
      expect(semAceite.status).toBe(400);
    });
  });

  describe('e-mail que já tem conta', () => {
    it('responde exatamente igual a um e-mail novo, sem revelar a conta', async () => {
      const existente = novoEmail();
      await cadastrar(existente);
      await confirmar(ultimoCodigo(existente));

      const novo = await cadastrar(novoEmail());
      const repetido = await cadastrar(existente);

      expect(repetido.status).toBe(novo.status);
      expect(repetido.body).toEqual(novo.body);
    });

    it('não cria outra conta nem troca a senha da conta existente', async () => {
      const email = novoEmail();
      await cadastrar(email);
      await confirmar(ultimoCodigo(email));
      const antes = await noBanco(email);

      await cadastrar(email, SENHA_NOVA);

      const depois = await noBanco(email);
      expect(depois!.id).toBe(antes!.id);
      expect(depois!.senha).toBe(antes!.senha);
      expect((await entrar(email)).status).toBe(200);
      expect((await entrar(email, SENHA_NOVA)).status).toBe(401);
    });

    it('avisa o dono do e-mail e não envia código', async () => {
      const email = novoEmail();
      await cadastrar(email);
      await confirmar(ultimoCodigo(email));
      confirmacaoEnviada.mockClear();

      await cadastrar(email);

      expect(avisoEnviado).toHaveBeenCalledWith(email);
      expect(confirmacaoEnviada).not.toHaveBeenCalled();
    });

    it('com um cadastro ainda não confirmado, vale o mais recente', async () => {
      const email = novoEmail();
      await cadastrar(email, SENHA_FORTE);
      const primeiro = await noBanco(email);

      await cadastrar(email, SENHA_NOVA);
      await confirmar(ultimoCodigo(email));

      expect((await noBanco(email))!.id).toBe(primeiro!.id);
      expect((await entrar(email, SENHA_FORTE)).status).toBe(401);
      expect((await entrar(email, SENHA_NOVA)).status).toBe(200);
    });
  });

  describe('login', () => {
    it('recusa conta não confirmada, com o código EMAIL_NAO_CONFIRMADO', async () => {
      const email = novoEmail();
      await cadastrar(email);

      const res = await entrar(email);

      expect(res.status).toBe(403);
      expect(res.body.codigo).toBe('EMAIL_NAO_CONFIRMADO');
      expect(res.body.token).toBeUndefined();
    });

    it('com senha errada continua respondendo "Credenciais inválidas", sem falar em confirmação', async () => {
      const email = novoEmail();
      await cadastrar(email);

      const res = await entrar(email, 'Errada#Senha123');

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Credenciais inválidas');
      expect(res.body.codigo).toBeUndefined();
    });

    it('entra depois de confirmar', async () => {
      const email = novoEmail();
      await cadastrar(email);
      await confirmar(ultimoCodigo(email));

      const res = await entrar(email);

      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.email).toBe(email);
    });

    it('contas anteriores à confirmação continuam entrando com o recurso ligado', async () => {
      delete process.env.CONFIRMACAO_EMAIL_HABILITADA;
      const email = novoEmail();
      const criada = await cadastrar(email);
      expect(criada.status).toBe(201);
      process.env.CONFIRMACAO_EMAIL_HABILITADA = 'true';

      expect((await noBanco(email))!.email_pendente).toBe(false);
      expect((await entrar(email)).status).toBe(200);
    });
  });

  describe('código de confirmação', () => {
    it('só vale uma vez', async () => {
      const email = novoEmail();
      await cadastrar(email);
      const codigo = ultimoCodigo(email);

      expect((await confirmar(codigo)).status).toBe(200);
      expect((await confirmar(codigo)).status).toBe(400);
    });

    it('recusa código inválido e vazio', async () => {
      expect((await confirmar('codigo-que-nao-existe')).status).toBe(400);
      expect((await request(app).post('/auth/confirmar-email').send({})).status).toBe(400);
    });

    it('recusa código vencido e a conta continua pendente', async () => {
      const email = novoEmail();
      await cadastrar(email);
      const codigo = ultimoCodigo(email);
      await prisma.tokenConfirmacaoEmail.updateMany({
        where: { usuario_id: (await noBanco(email))!.id },
        data: { expira_em: new Date(Date.now() - 1000) },
      });

      const res = await confirmar(codigo);

      expect(res.status).toBe(400);
      expect((await noBanco(email))!.email_pendente).toBe(true);
    });

    it('um código de redefinição de senha não confirma o e-mail', async () => {
      const email = novoEmail();
      await cadastrar(email);

      const res = await request(app).post('/auth/confirmar-email').send({ token: 'qualquer-coisa-de-outro-fluxo' });

      expect(res.status).toBe(400);
      expect((await noBanco(email))!.email_pendente).toBe(true);
    });
  });

  describe('reenvio', () => {
    it('gera um código novo, e o anterior deixa de valer', async () => {
      const email = novoEmail();
      await cadastrar(email);
      const antigo = ultimoCodigo(email);
      await prisma.tokenConfirmacaoEmail.updateMany({
        where: { usuario_id: (await noBanco(email))!.id },
        data: { criado_em: new Date(Date.now() - 5 * 60 * 1000) },
      });

      const res = await reenviar(email);

      expect(res.status).toBe(200);
      expect(confirmacaoEnviada).toHaveBeenCalledTimes(2);
      expect((await confirmar(antigo)).status).toBe(400);
      expect((await confirmar(ultimoCodigo(email))).status).toBe(200);
    });

    it('respeita o intervalo mínimo entre envios', async () => {
      const email = novoEmail();
      await cadastrar(email);

      await reenviar(email);

      expect(confirmacaoEnviada).toHaveBeenCalledTimes(1);
    });

    it('responde igual para e-mail inexistente e para conta já confirmada, sem enviar nada', async () => {
      const confirmado = novoEmail();
      await cadastrar(confirmado);
      await confirmar(ultimoCodigo(confirmado));
      confirmacaoEnviada.mockClear();

      const inexistente = await reenviar(`nao.existe.${sufixo}@test.com`);
      const jaConfirmado = await reenviar(confirmado);

      expect(jaConfirmado.status).toBe(inexistente.status);
      expect(jaConfirmado.body).toEqual(inexistente.body);
      expect(confirmacaoEnviada).not.toHaveBeenCalled();
    });
  });

  describe('outros caminhos', () => {
    it('redefinir a senha pelo código enviado ao e-mail também confirma a conta', async () => {
      const email = novoEmail();
      await cadastrar(email);
      const conta = await noBanco(email);
      const { createHash } = await import('crypto');
      const token = 'token-de-redefinicao-do-teste';
      await prisma.tokenRedefinicao.create({
        data: {
          usuario_id: conta!.id,
          token_hash: createHash('sha256').update(token).digest('hex'),
          expira_em: new Date(Date.now() + 60 * 1000),
        },
      });

      const res = await request(app).post('/auth/reset-password').send({ token, novaSenha: SENHA_NOVA });

      expect(res.status).toBe(200);
      expect((await noBanco(email))!.email_pendente).toBe(false);
      expect((await entrar(email, SENHA_NOVA)).status).toBe(200);
    });

    it('remove as contas que não foram confirmadas a tempo e mantém as outras', async () => {
      const abandonada = novoEmail();
      const recente = novoEmail();
      const confirmada = novoEmail();
      await cadastrar(abandonada);
      await cadastrar(recente);
      await cadastrar(confirmada);
      await confirmar(ultimoCodigo(confirmada));
      await prisma.usuario.updateMany({
        where: { email_hash: { in: [hashDoEmail(abandonada), hashDoEmail(confirmada)] } },
        data: { criado_em: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) },
      });

      const removidas = await removerContasNaoConfirmadas();

      expect(removidas).toBeGreaterThanOrEqual(1);
      expect(await noBanco(abandonada)).toBeNull();
      expect(await noBanco(recente)).not.toBeNull();
      expect(await noBanco(confirmada)).not.toBeNull();
    });

    it('com o recurso desligado, o cadastro continua como antes (201 e login direto)', async () => {
      delete process.env.CONFIRMACAO_EMAIL_HABILITADA;
      const email = novoEmail();

      const res = await cadastrar(email);

      expect(res.status).toBe(201);
      expect(res.body.email).toBe(email);
      expect((await entrar(email)).status).toBe(200);
      expect(confirmacaoEnviada).not.toHaveBeenCalled();
    });
  });
});
