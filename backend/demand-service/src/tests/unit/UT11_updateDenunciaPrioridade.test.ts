import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../lib/prisma', () => ({
  prisma: {
    gestor:   { upsert: vi.fn() },
    denuncia: { findUnique: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock('../../config/redis', () => ({
  publishDenunciaStatusEvent: vi.fn(),
  getRedisPublisher: vi.fn(),
}));

import { prisma } from '../../lib/prisma';
import { updateDenunciaPrioridade } from '../../services/denunciaService';

const db = prisma as any;

const USUARIO_ID = 88;
const GESTOR_ID = 5;
const DENUNCIA_ID = 1;

const denunciaMedia = {
  id_denuncia: DENUNCIA_ID,
  status: 'EM_ANALISE',
  prioridade: 'MEDIA',
  imagens: [{ caminho_file: 'data:image/png;base64,AAAA' }],
};

function setupTransactionMock() {
  const txFake = {
    denuncia: { update: vi.fn().mockResolvedValue({ ...denunciaMedia, prioridade: 'ALTA' }) },
    historico: { create: vi.fn().mockResolvedValue({ id_historico: 1 }) },
  };
  db.$transaction.mockImplementation(async (fn: any) => fn(txFake));
  return txFake;
}

async function capturarErro(promessa: Promise<unknown>) {
  try {
    await promessa;
  } catch (err) {
    return err as Error & { status: number };
  }
  throw new Error('a promessa deveria ter rejeitado');
}

describe('updateDenunciaPrioridade', () => {

  beforeEach(() => {
    vi.clearAllMocks();
    db.gestor.upsert.mockResolvedValue({ id_gestor: GESTOR_ID, usuario_id: USUARIO_ID });
    db.denuncia.findUnique.mockResolvedValue(denunciaMedia);
  });

  it('atualiza a prioridade devolvendo a denúncia com imagens', async () => {
    const txFake = setupTransactionMock();

    const resultado = await updateDenunciaPrioridade(USUARIO_ID, DENUNCIA_ID, 'ALTA');

    expect(txFake.denuncia.update).toHaveBeenCalledWith({
      where: { id_denuncia: DENUNCIA_ID },
      data: { prioridade: 'ALTA' },
      include: { imagens: true },
    });
    expect(resultado.denuncia.imagens).toHaveLength(1);
  });

  it('registra o histórico com o status atual e o gestor', async () => {
    const txFake = setupTransactionMock();

    await updateDenunciaPrioridade(USUARIO_ID, DENUNCIA_ID, 'ALTA');

    expect(txFake.historico.create).toHaveBeenCalledWith({
      data: {
        status: 'EM_ANALISE',
        prioridade: 'ALTA',
        denuncia_id: DENUNCIA_ID,
        gestor_id: GESTOR_ID,
      },
    });
  });

  it('responde 404 quando a denúncia não existe', async () => {
    db.denuncia.findUnique.mockResolvedValue(null);

    const err = await capturarErro(updateDenunciaPrioridade(USUARIO_ID, DENUNCIA_ID, 'ALTA'));

    expect(err.status).toBe(404);
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it('responde 400 quando a prioridade já é a mesma', async () => {
    const err = await capturarErro(updateDenunciaPrioridade(USUARIO_ID, DENUNCIA_ID, 'MEDIA'));

    expect(err.status).toBe(400);
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it('não escreve logs no console', async () => {
    setupTransactionMock();
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});

    await updateDenunciaPrioridade(USUARIO_ID, DENUNCIA_ID, 'ALTA');

    expect(log).not.toHaveBeenCalled();
    log.mockRestore();
  });
});
