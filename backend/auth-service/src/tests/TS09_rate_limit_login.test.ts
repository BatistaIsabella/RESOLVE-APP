import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import app from '../app';
import { hashDoEmail } from '../utils/emailProtegido';
import { chaveDoEmail } from '../services/tentativasLoginService';
import { SENHA_FORTE, TERMOS } from './helpers/dados';

const prisma = new PrismaClient();
const sufixo = Date.now();

const usuario = {
  nome: 'Usuario Bloqueio',
  email: `ts09.bloqueio.${sufixo}@test.com`,
  senha: SENHA_FORTE,
  papel: 'cidadao',
  ...TERMOS,
};
const outroUsuario = { ...usuario, nome: 'Outro Usuario', email: `ts09.outro.${sufixo}@test.com` };
const usuarioRecuperavel = { ...usuario, nome: 'Usuario Janela', email: `ts09.janela.${sufixo}@test.com` };

const errar = (email: string) => request(app).post('/auth/login').send({ email, senha: 'Errada#Senha123' });
const entrar = (email: string, senha = SENHA_FORTE) => request(app).post('/auth/login').send({ email, senha });

beforeAll(async () => {
  for (const u of [usuario, outroUsuario, usuarioRecuperavel]) {
    await request(app).post('/auth/register').send(u);
  }
});

afterAll(async () => {
  const emails = [usuario.email, outroUsuario.email, usuarioRecuperavel.email, `ts09.fantasma.${sufixo}@test.com`];
  await prisma.tentativaLogin.deleteMany({ where: { chave: { in: emails.map(chaveDoEmail) } } });
  await prisma.usuario.deleteMany({ where: { email_hash: { in: emails.map(hashDoEmail) } } });
  await prisma.$disconnect();
});

describe('TS09 - Bloqueio temporário após falhas de login', () => {
  it('bloqueia com 429 após 3 falhas seguidas, mesmo com a senha correta', async () => {
    for (let i = 0; i < 3; i++) {
      const res = await errar(usuario.email);
      expect(res.status).toBe(401);
    }

    const bloqueado = await entrar(usuario.email);

    expect(bloqueado.status).toBe(429);
    expect(bloqueado.body.error).toMatch(/muitas tentativas/i);
    expect(Number(bloqueado.headers['retry-after'])).toBeGreaterThan(0);
  });

  it('não bloqueia outra conta', async () => {
    const res = await entrar(outroUsuario.email);

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });

  it('e-mail que não existe é bloqueado com a mesma resposta (não revela contas cadastradas)', async () => {
    const email = `ts09.fantasma.${sufixo}@test.com`;
    const respostas = [];
    for (let i = 0; i < 3; i++) respostas.push(await errar(email));

    expect(respostas.every((r) => r.status === 401)).toBe(true);
    expect(respostas[0].body).toEqual({ error: 'Credenciais inválidas' });

    const bloqueado = await entrar(email);
    expect(bloqueado.status).toBe(429);
    expect(bloqueado.body.error).toMatch(/muitas tentativas/i);
  });

  it('um login com sucesso zera a contagem de falhas', async () => {
    await errar(outroUsuario.email);
    await errar(outroUsuario.email);
    expect((await entrar(outroUsuario.email)).status).toBe(200);

    await errar(outroUsuario.email);
    await errar(outroUsuario.email);

    expect((await entrar(outroUsuario.email)).status).toBe(200);
  });

  it('libera o acesso quando o tempo de bloqueio termina', async () => {
    await prisma.tentativaLogin.update({
      where: { chave: chaveDoEmail(usuario.email) },
      data: { bloqueado_ate: new Date(Date.now() - 1000) },
    });

    const res = await entrar(usuario.email);

    expect(res.status).toBe(200);
  });

  it('falhas antigas, fora da janela, não contam como consecutivas', async () => {
    await errar(usuarioRecuperavel.email);
    await errar(usuarioRecuperavel.email);

    await prisma.$executeRaw`
      UPDATE "auth"."tentativas_login"
      SET atualizado_em = now() - interval '2 hours'
      WHERE chave = ${chaveDoEmail(usuarioRecuperavel.email)}
    `;

    const terceira = await errar(usuarioRecuperavel.email);
    expect(terceira.status).toBe(401);

    const seguinte = await entrar(usuarioRecuperavel.email);
    expect(seguinte.status).toBe(200);
  });

  it('o e-mail é tratado sem diferenciar maiúsculas e espaços ao contar as falhas', async () => {
    const email = outroUsuario.email;
    await errar(` ${email.toUpperCase()} `);
    await errar(email);
    await errar(email.toUpperCase());

    const res = await entrar(email);

    expect(res.status).toBe(429);
  });
});
