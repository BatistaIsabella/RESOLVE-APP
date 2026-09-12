import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../app';

const usuario = {
  nome: 'Usuario Teste TS09',
  email: `ts09.ratelimit.${Date.now()}@test.com`,
  senha: 'senha123',
  papel: 'cidadao',
};

const outroUsuario = {
  nome: 'Outro Usuario TS09',
  email: `ts09.outro.${Date.now()}@test.com`,
  senha: 'senha456',
  papel: 'cidadao',
};

beforeAll(async () => {
  await request(app).post('/auth/register').send(usuario);
  await request(app).post('/auth/register').send(outroUsuario);
});

describe('TS09 - Rate limit de tentativas de login (HU02)', () => {
  it('bloqueia com 429 após exceder o limite de tentativas erradas na mesma conta', async () => {
    const MAX_ATTEMPTS = 5;

    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      const res = await request(app)
        .post('/auth/login')
        .send({ email: usuario.email, senha: 'senha-errada' });

      expect(res.status).toBe(401);
    }

    // A tentativa seguinte deveria ser bloqueada mesmo com a senha correta,
    // já que o limite conta tentativas falhas, não credenciais.
    const bloqueado = await request(app)
      .post('/auth/login')
      .send({ email: usuario.email, senha: usuario.senha });

    expect(bloqueado.status).toBe(429);
    expect(bloqueado.body.error).toMatch(/muitas tentativas/i);
  });

  it('não bloqueia outra conta mesmo com a primeira já limitada', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: outroUsuario.email, senha: outroUsuario.senha });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });
});
