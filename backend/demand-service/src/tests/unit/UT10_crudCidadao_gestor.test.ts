import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../lib/prisma', () => ({
  prisma: {
    cidadao: { upsert: vi.fn() },
    denuncia: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

const redisDel = vi.fn();

vi.mock('../../config/redis', () => ({
  publishDenunciaStatusEvent: vi.fn(),
  getRedisPublisher: vi.fn(async () => ({
    del: redisDel,
    // O cache do metrics-service é um por órgão; a invalidação varre as chaves com o prefixo.
    scanIterator: async function* () {
      yield 'smartcity:metrics:kpis:GERAL';
      yield 'smartcity:metrics:kpis:ILUMINACAO';
    },
  })),
}));

import { prisma } from '../../lib/prisma';
import { getRedisPublisher } from '../../config/redis';
import {
  updateDenunciaCidadao,
  deleteDenunciaCidadao,
  deleteDenunciaGestor,
  listDenunciasByCidadao,
  listAllDenuncias,
} from '../../services/denunciaService';

const db = prisma as any;

const USUARIO_ID = 42;
const CIDADAO_ID = 7;
const DENUNCIA_ID = 15;

const mockCidadao = { id_cidadao: CIDADAO_ID, usuario_id: USUARIO_ID };

const denunciaAberta = {
  id_denuncia: DENUNCIA_ID,
  titulo: 'Buraco',
  status: 'ABERTA',
  cidadao_id: CIDADAO_ID,
};

async function capturarErro(promessa: Promise<unknown>) {
  try {
    await promessa;
  } catch (err) {
    return err as Error & { status: number };
  }
  throw new Error('a promessa deveria ter rejeitado');
}

beforeEach(() => {
  vi.clearAllMocks();
  db.cidadao.upsert.mockResolvedValue(mockCidadao);
  db.denuncia.findFirst.mockResolvedValue(denunciaAberta);
  db.denuncia.findUnique.mockResolvedValue(denunciaAberta);
  db.denuncia.update.mockImplementation(async ({ data }: any) => ({ ...denunciaAberta, ...data, imagens: [] }));
  db.denuncia.delete.mockResolvedValue(denunciaAberta);
  redisDel.mockResolvedValue(1);
});

describe('updateDenunciaCidadao', () => {

  it('procura a denúncia filtrando pelo cidadão dono', async () => {
    await updateDenunciaCidadao(USUARIO_ID, DENUNCIA_ID, { titulo: 'Novo' });

    expect(db.denuncia.findFirst).toHaveBeenCalledWith({
      where: { id_denuncia: DENUNCIA_ID, cidadao_id: CIDADAO_ID },
    });
  });

  it('atualiza só os campos recebidos e devolve a denúncia com imagens', async () => {
    const resultado = await updateDenunciaCidadao(USUARIO_ID, DENUNCIA_ID, { titulo: 'Novo' });

    expect(db.denuncia.update).toHaveBeenCalledWith({
      where: { id_denuncia: DENUNCIA_ID },
      data: { titulo: 'Novo' },
      include: { imagens: true },
    });
    expect(resultado.titulo).toBe('Novo');
  });

  it('responde 404 quando a denúncia não existe ou é de outro cidadão', async () => {
    db.denuncia.findFirst.mockResolvedValue(null);

    const err = await capturarErro(updateDenunciaCidadao(USUARIO_ID, DENUNCIA_ID, { titulo: 'X' }));

    expect(err.status).toBe(404);
    expect(db.denuncia.update).not.toHaveBeenCalled();
  });

  it.each(['EM_ANALISE', 'RESOLVIDA'])('responde 409 quando o status é %s', async (status) => {
    db.denuncia.findFirst.mockResolvedValue({ ...denunciaAberta, status });

    const err = await capturarErro(updateDenunciaCidadao(USUARIO_ID, DENUNCIA_ID, { titulo: 'X' }));

    expect(err.status).toBe(409);
    expect(err.message).toContain('editar');
    expect(db.denuncia.update).not.toHaveBeenCalled();
  });

  it('invalida o cache de KPIs do metrics-service', async () => {
    await updateDenunciaCidadao(USUARIO_ID, DENUNCIA_ID, { categoria: 'SANEAMENTO' });

    expect(redisDel).toHaveBeenCalledWith('smartcity:metrics:kpis:GERAL');
    expect(redisDel).toHaveBeenCalledWith('smartcity:metrics:kpis:ILUMINACAO');
  });

  it('não falha se o Redis estiver fora do ar', async () => {
    vi.mocked(getRedisPublisher).mockRejectedValueOnce(new Error('ECONNREFUSED'));

    await expect(
      updateDenunciaCidadao(USUARIO_ID, DENUNCIA_ID, { titulo: 'Novo' })
    ).resolves.toBeDefined();
  });
});

describe('deleteDenunciaCidadao', () => {

  it('exclui a própria denúncia ABERTA', async () => {
    await deleteDenunciaCidadao(USUARIO_ID, DENUNCIA_ID);

    expect(db.denuncia.delete).toHaveBeenCalledWith({ where: { id_denuncia: DENUNCIA_ID } });
    expect(redisDel).toHaveBeenCalledWith('smartcity:metrics:kpis:GERAL');
  });

  it('responde 404 para denúncia de outro cidadão', async () => {
    db.denuncia.findFirst.mockResolvedValue(null);

    const err = await capturarErro(deleteDenunciaCidadao(USUARIO_ID, DENUNCIA_ID));

    expect(err.status).toBe(404);
    expect(db.denuncia.delete).not.toHaveBeenCalled();
  });

  it('responde 409 quando a denúncia já saiu de ABERTA', async () => {
    db.denuncia.findFirst.mockResolvedValue({ ...denunciaAberta, status: 'EM_ANALISE' });

    const err = await capturarErro(deleteDenunciaCidadao(USUARIO_ID, DENUNCIA_ID));

    expect(err.status).toBe(409);
    expect(err.message).toContain('excluir');
    expect(db.denuncia.delete).not.toHaveBeenCalled();
  });
});

describe('deleteDenunciaGestor', () => {

  it('exclui denúncia de qualquer status', async () => {
    db.denuncia.findUnique.mockResolvedValue({ ...denunciaAberta, status: 'RESOLVIDA' });

    await deleteDenunciaGestor(DENUNCIA_ID);

    expect(db.denuncia.delete).toHaveBeenCalledWith({ where: { id_denuncia: DENUNCIA_ID } });
    expect(db.cidadao.upsert).not.toHaveBeenCalled();
  });

  it('responde 404 quando a denúncia não existe', async () => {
    db.denuncia.findUnique.mockResolvedValue(null);

    const err = await capturarErro(deleteDenunciaGestor(DENUNCIA_ID));

    expect(err.status).toBe(404);
    expect(db.denuncia.delete).not.toHaveBeenCalled();
  });
});

describe('busca e filtros nas listagens', () => {

  const paginacao = { page: 1, limit: 20, skip: 0 };

  beforeEach(() => {
    db.denuncia.count.mockResolvedValue(1);
    db.denuncia.findMany.mockResolvedValue([denunciaAberta]);
  });

  it('listDenunciasByCidadao combina q com o filtro do dono (dono não pode ser sobrescrito)', async () => {
    await listDenunciasByCidadao(USUARIO_ID, paginacao, { q: 'buraco', status: 'ABERTA' });

    const esperado = {
      OR: [
        { titulo: { contains: 'buraco', mode: 'insensitive' } },
        { descricao: { contains: 'buraco', mode: 'insensitive' } },
      ],
      status: 'ABERTA',
      cidadao_id: CIDADAO_ID,
    };
    expect(db.denuncia.count).toHaveBeenCalledWith({ where: esperado });
    expect(db.denuncia.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: esperado }));
  });

  it('listAllDenuncias aplica o mesmo where no count e no findMany', async () => {
    await listAllDenuncias(paginacao, { categoria: 'SANEAMENTO' });

    expect(db.denuncia.count).toHaveBeenCalledWith({ where: { categoria: 'SANEAMENTO' } });
    expect(db.denuncia.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { categoria: 'SANEAMENTO' }, skip: 0, take: 20 })
    );
  });

  it('listAllDenuncias sem filtros mantém o comportamento antigo (where vazio)', async () => {
    await listAllDenuncias(paginacao);

    expect(db.denuncia.count).toHaveBeenCalledWith({ where: {} });
  });
});
