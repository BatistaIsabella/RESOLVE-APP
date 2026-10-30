import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generalizarEndereco } from '../../utils/endereco';
import { limparCacheMetricas } from '../../utils/metricsCache';

const redisFalso = {
  on: vi.fn(),
  connect: vi.fn().mockResolvedValue(undefined),
  lPush: vi.fn().mockResolvedValue(1),
  expire: vi.fn().mockResolvedValue(true),
  publish: vi.fn().mockResolvedValue(1),
};

vi.mock('redis', () => ({ createClient: vi.fn(() => redisFalso) }));

describe('generalizarEndereco', () => {
  it('reduz coordenadas para 3 casas decimais', () => {
    expect(generalizarEndereco('Rua X, Recife, PE (-8.05012, -34.88123)')).toBe('Rua X, Recife, PE (-8.050, -34.881)');
  });

  it('reduz coordenadas no formato "Lat/Lng"', () => {
    expect(generalizarEndereco('Lat: -8.05012, Lng: -34.88199')).toBe('Lat: -8.050, Lng: -34.882');
  });

  it('não altera endereço sem coordenadas nem números de rua', () => {
    expect(generalizarEndereco('Av. Boa Viagem, 1200, Recife')).toBe('Av. Boa Viagem, 1200, Recife');
  });
});

describe('limparCacheMetricas', () => {
  it('apaga todas as chaves do cache de KPIs, uma por órgão', async () => {
    const del = vi.fn().mockResolvedValue(1);
    const redis = {
      del,
      scanIterator: async function* (opcoes: { MATCH: string }) {
        expect(opcoes.MATCH).toBe('smartcity:metrics:kpis*');
        yield 'smartcity:metrics:kpis:GERAL';
        yield 'smartcity:metrics:kpis:TRANSITO';
      },
    };

    await limparCacheMetricas(redis as never);

    expect(del).toHaveBeenCalledTimes(2);
    expect(del).toHaveBeenCalledWith('smartcity:metrics:kpis:TRANSITO');
  });
});

describe('publishDenunciaStatusEvent', () => {
  beforeEach(() => vi.clearAllMocks());

  it('coloca na fila, define validade de 1 hora e publica no canal', async () => {
    const { publishDenunciaStatusEvent, REDIS_QUEUE, REDIS_CHANNEL } = await import('../../config/redis');

    await publishDenunciaStatusEvent({ denunciaId: 1, statusAnterior: 'ABERTA', statusNovo: 'RESOLVIDA', gestorId: 2 });

    expect(redisFalso.lPush).toHaveBeenCalledWith(REDIS_QUEUE, expect.stringContaining('DENUNCIA_STATUS_ALTERADO'));
    expect(redisFalso.expire).toHaveBeenCalledWith(REDIS_QUEUE, 3600);
    expect(redisFalso.publish).toHaveBeenCalledWith(REDIS_CHANNEL, expect.any(String));
  });

  it('a mensagem do evento carrega só ids e status, sem dados pessoais', async () => {
    const { publishDenunciaStatusEvent } = await import('../../config/redis');

    await publishDenunciaStatusEvent({ denunciaId: 1, statusAnterior: 'ABERTA', statusNovo: 'EM_ANALISE', gestorId: 2 });

    const mensagem = JSON.parse(redisFalso.lPush.mock.calls[0][1]);
    expect(Object.keys(mensagem).sort()).toEqual(
      ['denunciaId', 'gestorId', 'statusAnterior', 'statusNovo', 'timestamp', 'type'].sort()
    );
  });
});
