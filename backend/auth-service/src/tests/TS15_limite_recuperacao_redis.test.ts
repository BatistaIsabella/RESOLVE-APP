import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { limiteRecuperacao } from '../middlewares/limiteRecuperacaoMiddleware';
import { limparRedisFalso, redisFalso } from './helpers/redisFalso';

// Só o middleware, sem banco: a rota de teste apenas responde 200.
const app = express();
app.set('trust proxy', true);
app.post('/teste', limiteRecuperacao, (_req, res) => res.sendStatus(200));

const chamar = (ip = '10.0.0.1') => request(app).post('/teste').set('X-Forwarded-For', ip);

describe('TS15 - Limite por IP na recuperação de senha, guardado no Redis', () => {
  beforeEach(() => {
    limparRedisFalso();
    process.env.RECUPERACAO_MAX_POR_JANELA = '3';
  });

  afterEach(() => {
    delete process.env.RECUPERACAO_MAX_POR_JANELA;
    vi.restoreAllMocks();
  });

  it('responde 429 depois do limite de chamadas na janela', async () => {
    for (let i = 0; i < 3; i++) expect((await chamar()).status).toBe(200);

    const res = await chamar();

    expect(res.status).toBe(429);
    expect(res.body.error).toBe('Muitas solicitações. Tente novamente em alguns minutos.');
  });

  it('conta cada IP separadamente', async () => {
    for (let i = 0; i < 3; i++) await chamar('10.0.0.1');

    expect((await chamar('10.0.0.1')).status).toBe(429);
    expect((await chamar('10.0.0.2')).status).toBe(200);
  });

  it('mantém a contagem no Redis, então ela não zera com a reinicialização do serviço', async () => {
    await chamar('10.0.0.3');
    await chamar('10.0.0.3');

    expect(await redisFalso.get('auth:rl:recuperacao:10.0.0.3')).toBe('2');
  });

  it('define a expiração da janela na primeira chamada', async () => {
    const expirar = vi.spyOn(redisFalso, 'expire');

    await chamar('10.0.0.4');
    await chamar('10.0.0.4');

    expect(expirar).toHaveBeenCalledTimes(1);
    expect(expirar).toHaveBeenCalledWith('auth:rl:recuperacao:10.0.0.4', 15 * 60);
  });

  it('continua atendendo se o Redis estiver fora do ar', async () => {
    vi.spyOn(redisFalso, 'incr').mockRejectedValue(new Error('Redis fora do ar'));

    const res = await chamar('10.0.0.5');

    expect(res.status).toBe(200);
  });
});
