import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';

// Redis e banco substituídos por versões em memória: o objetivo é verificar a lógica de escopo e cache.
const cache = new Map<string, string>();
const redisFalso = {
  get: vi.fn(async (chave: string) => cache.get(chave) ?? null),
  setEx: vi.fn(async (chave: string, _ttl: number, valor: string) => void cache.set(chave, valor)),
  del: vi.fn(async (chave: string) => (cache.delete(chave) ? 1 : 0)),
  ping: vi.fn(async () => 'PONG'),
  scanIterator: async function* (opcoes: { MATCH: string }) {
    const prefixo = opcoes.MATCH.replace('*', '');
    for (const chave of [...cache.keys()]) if (chave.startsWith(prefixo)) yield chave;
  },
};

vi.mock('../config/redis', () => ({
  METRICS_CACHE_KEY: 'smartcity:metrics:kpis',
  getRedisClient: async () => redisFalso,
}));

const contagens = vi.fn();
vi.mock('../lib/prisma', () => ({
  prisma: {
    denuncia: { count: (args: { where: Record<string, unknown> }) => contagens(args) },
    $queryRaw: vi.fn(),
  },
}));

import app from '../app';
import { aggregateMetrics, getMetrics, renovarCacheAposMudanca } from '../services/metricsService';
import { getJwtSecret } from '../config/env';

const token = (claims: Record<string, unknown>) => jwt.sign({ userId: 1, ...claims }, getJwtSecret());
const tokenGeral = token({ papel: 'gestor', orgao: 'GERAL' });
const tokenLuz = token({ papel: 'gestor', orgao: 'ILUMINACAO', categorias: ['ILUMINACAO_PUBLICA'] });
const tokenCidadao = token({ papel: 'cidadao' });

beforeEach(() => {
  cache.clear();
  vi.clearAllMocks();
  // Simula uma base com 10 denúncias no total, 4 delas de iluminação.
  contagens.mockImplementation(async ({ where }: { where: Record<string, unknown> }) => {
    const categoria = where.categoria as string | { in: string[] } | undefined;
    if (categoria === undefined) return 10;
    if (typeof categoria === 'string') return categoria === 'ILUMINACAO_PUBLICA' ? 4 : 1;
    return categoria.in.includes('ILUMINACAO_PUBLICA') ? 4 : 0;
  });
});

describe('Métricas por escopo de órgão', () => {
  it('gestão geral conta todas as categorias, sem filtro de escopo', async () => {
    const kpis = await aggregateMetrics();

    expect(kpis.total).toBe(10);
    expect(Object.keys(kpis.byCategory)).toHaveLength(8);
    expect(contagens).toHaveBeenCalledWith({ where: {} });
  });

  it('gestor de um órgão conta só as suas categorias e só elas aparecem no resultado', async () => {
    const kpis = await aggregateMetrics(['ILUMINACAO_PUBLICA']);

    expect(kpis.total).toBe(4);
    expect(Object.keys(kpis.byCategory)).toEqual(['ILUMINACAO_PUBLICA']);
    for (const [args] of contagens.mock.calls) {
      expect(args.where.categoria).toBeDefined();
    }
  });

  it('cada escopo tem seu próprio cache, e um não serve o outro', async () => {
    await getMetrics();
    await getMetrics(['ILUMINACAO_PUBLICA']);

    expect([...cache.keys()].sort()).toEqual([
      'smartcity:metrics:kpis:GERAL',
      'smartcity:metrics:kpis:ILUMINACAO_PUBLICA',
    ]);
    expect(JSON.parse(cache.get('smartcity:metrics:kpis:GERAL')!).total).toBe(10);
    expect(JSON.parse(cache.get('smartcity:metrics:kpis:ILUMINACAO_PUBLICA')!).total).toBe(4);
  });

  it('a chave do cache não depende da ordem das categorias', async () => {
    await getMetrics(['SANEAMENTO', 'MANUTENCAO_DE_VIAS']);
    contagens.mockClear();

    await getMetrics(['MANUTENCAO_DE_VIAS', 'SANEAMENTO']);

    expect(contagens).not.toHaveBeenCalled();
  });

  it('usa o cache quando existe, sem consultar o banco', async () => {
    await getMetrics();
    contagens.mockClear();

    await getMetrics();

    expect(contagens).not.toHaveBeenCalled();
  });

  it('após uma mudança, renova a gestão geral e descarta o cache dos órgãos', async () => {
    await getMetrics();
    await getMetrics(['ILUMINACAO_PUBLICA']);

    await renovarCacheAposMudanca();

    expect([...cache.keys()]).toEqual(['smartcity:metrics:kpis:GERAL']);
  });
});

describe('GET /metrics', () => {
  const consultar = (t?: string) => {
    const req = request(app).get('/metrics');
    return t ? req.set('Authorization', `Bearer ${t}`) : req;
  };

  it('exige autenticação', async () => {
    expect((await consultar()).status).toBe(401);
  });

  it('cidadão não acessa', async () => {
    expect((await consultar(tokenCidadao)).status).toBe(403);
  });

  it('gestor de órgão recebe só os números do seu órgão', async () => {
    const res = await consultar(tokenLuz);

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(4);
    expect(Object.keys(res.body.byCategory)).toEqual(['ILUMINACAO_PUBLICA']);
  });

  it('gestão geral recebe o total completo', async () => {
    const res = await consultar(tokenGeral);

    expect(res.body.total).toBe(10);
  });

  it('o resultado não traz nenhum dado pessoal', async () => {
    const res = await consultar(tokenGeral);

    expect(Object.keys(res.body).sort()).toEqual(['byCategory', 'byRegion', 'byStatus', 'total', 'updatedAt']);
  });

  it('recusa token de sessão encerrada (versão menor que a vigente no Redis)', async () => {
    cache.set('auth:sv:1', '2');
    const antigo = token({ papel: 'gestor', sv: 1 });

    expect((await consultar(antigo)).status).toBe(401);
    expect((await consultar(token({ papel: 'gestor', sv: 2 }))).status).toBe(200);
  });

  it('sem Redis, o token continua valendo', async () => {
    redisFalso.get.mockRejectedValueOnce(new Error('Redis fora do ar'));

    expect((await consultar(token({ papel: 'gestor', sv: 3 }))).status).toBe(200);
  });

  it('não libera CORS para origens não configuradas', async () => {
    const res = await request(app).get('/metrics').set('Origin', 'https://qualquer.com');

    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });
});
