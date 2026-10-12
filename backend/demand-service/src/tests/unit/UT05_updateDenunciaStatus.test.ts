import { describe, it, expect, vi, beforeEach } from 'vitest';

// updateDenunciaStatus é a função mais complexa do serviço.
// Ela encadeia: resolveGestorId → findUnique → $transaction → publishRedis.
// Cada etapa pode falhar de formas diferentes — e o teste unitário nos permite
// simular cada cenário de falha sem depender de infraestrutura real.

vi.mock('../../lib/prisma', () => ({
  prisma: {
    gestor:   { upsert: vi.fn() },
    denuncia: { findUnique: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock('../../config/redis', () => ({
  publishDenunciaStatusEvent: vi.fn(),
}));

import { prisma } from '../../lib/prisma';
import { publishDenunciaStatusEvent } from '../../config/redis';
import { updateDenunciaStatus } from '../../services/denunciaService';

const db = prisma as any;

// ─── DADOS COMPARTILHADOS ─────────────────────────────────────────────────────

const USUARIO_ID = 88;
const GESTOR_ID  = 5;
const DENUNCIA_ID = 1;

const mockGestor = { id_gestor: GESTOR_ID, usuario_id: USUARIO_ID };

const denunciaAberta = {
  id_denuncia: DENUNCIA_ID,
  titulo: 'Buraco na pista',
  status: 'ABERTA' as const,
  prioridade: 'MEDIA',
  cidadao_id: 10,
};

const denunciaEmAnalise = { ...denunciaAberta, status: 'EM_ANALISE' as const };

const mockHistorico = {
  id_historico: 99,
  status: 'EM_ANALISE',
  prioridade: 'MEDIA',
  denuncia_id: DENUNCIA_ID,
  gestor_id: GESTOR_ID,
  data_abertura: new Date(),
  data_alteracao: new Date(),
};

// ─── HELPER: configura o mock de $transaction ─────────────────────────────────
//
// $transaction recebe um callback: (tx) => Promise<T>.
// Para testá-lo, passamos um tx falso com os métodos que o callback usa.
// O mock executa o callback com esse tx e retorna o resultado.
//
function setupTransactionMock(denunciaRetornada = denunciaEmAnalise) {
  const txFake = {
    denuncia: { update:  vi.fn().mockResolvedValue(denunciaRetornada) },
    historico: { create: vi.fn().mockResolvedValue(mockHistorico) },
  };

  db.$transaction.mockImplementation(async (fn: any) => fn(txFake));

  return txFake;
}

// ─── TESTES ───────────────────────────────────────────────────────────────────

describe('updateDenunciaStatus', () => {

  beforeEach(() => {
    vi.clearAllMocks();
    // Setup padrão para o caminho feliz: gestor existe, denúncia está ABERTA
    db.gestor.upsert.mockResolvedValue(mockGestor);
    db.denuncia.findUnique.mockResolvedValue(denunciaAberta);
    vi.mocked(publishDenunciaStatusEvent).mockResolvedValue(undefined);
  });

  // ── Caminho feliz ──────────────────────────────────────────────────────────

  it('retorna { denuncia, historico } no caminho feliz', async () => {
    setupTransactionMock();

    const resultado = await updateDenunciaStatus(USUARIO_ID, DENUNCIA_ID, 'EM_ANALISE');

    expect(resultado).toEqual({
      denuncia: denunciaEmAnalise,
      historico: mockHistorico,
    });
  });

  it('executa a atualização dentro de uma transação', async () => {
    setupTransactionMock();

    await updateDenunciaStatus(USUARIO_ID, DENUNCIA_ID, 'EM_ANALISE');

    // Confirma que $transaction foi chamado — isso garante que a escrita
    // é atômica (denuncia.update + historico.create como unidade)
    expect(db.$transaction).toHaveBeenCalledOnce();
  });

  it('atualiza a denúncia com o novo status dentro do tx', async () => {
    const txFake = setupTransactionMock();

    await updateDenunciaStatus(USUARIO_ID, DENUNCIA_ID, 'EM_ANALISE');

    expect(txFake.denuncia.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id_denuncia: DENUNCIA_ID },
        data:  { status: 'EM_ANALISE' },
      })
    );
  });

  it('cria o registro de histórico com o gestor correto dentro do tx', async () => {
    const txFake = setupTransactionMock();

    await updateDenunciaStatus(USUARIO_ID, DENUNCIA_ID, 'EM_ANALISE');

    expect(txFake.historico.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'EM_ANALISE',
          denuncia_id: DENUNCIA_ID,
          gestor_id: GESTOR_ID,
        }),
      })
    );
  });

  it('publica o evento no Redis após o commit da transação', async () => {
    setupTransactionMock();

    await updateDenunciaStatus(USUARIO_ID, DENUNCIA_ID, 'EM_ANALISE');

    expect(publishDenunciaStatusEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        denunciaId:    DENUNCIA_ID,
        statusAnterior: 'ABERTA',
        statusNovo:    'EM_ANALISE',
        gestorId:      GESTOR_ID,
      })
    );
  });

  // ── Erros de validação (sem bater no banco) ────────────────────────────────

  it('lança erro 400 para status inválido antes de consultar o banco', async () => {
    await expect(
      updateDenunciaStatus(USUARIO_ID, DENUNCIA_ID, 'STATUS_FAKE' as any)
    ).rejects.toThrowError(expect.objectContaining({ status: 400 }));

    // O banco não deve ser consultado se o status já é inválido
    expect(db.denuncia.findUnique).not.toHaveBeenCalled();
  });

  // ── Denúncia não encontrada ────────────────────────────────────────────────

  it('lança erro 404 quando a denúncia não existe no banco', async () => {
    db.denuncia.findUnique.mockResolvedValue(null);

    await expect(
      updateDenunciaStatus(USUARIO_ID, DENUNCIA_ID, 'EM_ANALISE')
    ).rejects.toThrowError(expect.objectContaining({ status: 404 }));
  });

  it('não abre transação quando a denúncia não existe', async () => {
    db.denuncia.findUnique.mockResolvedValue(null);

    await expect(updateDenunciaStatus(USUARIO_ID, DENUNCIA_ID, 'EM_ANALISE')).rejects.toThrow();

    expect(db.$transaction).not.toHaveBeenCalled();
  });

  // ── Status já igual ao atual ───────────────────────────────────────────────

  it('lança erro 400 quando o novo status é igual ao atual', async () => {
    // A denúncia já está ABERTA — tentar definir ABERTA novamente é inválido
    await expect(
      updateDenunciaStatus(USUARIO_ID, DENUNCIA_ID, 'ABERTA')
    ).rejects.toThrowError(expect.objectContaining({ status: 400 }));
  });

  it('não abre transação quando o status é o mesmo', async () => {
    await expect(
      updateDenunciaStatus(USUARIO_ID, DENUNCIA_ID, 'ABERTA')
    ).rejects.toThrow();

    expect(db.$transaction).not.toHaveBeenCalled();
  });

  // ── Resiliência: Redis offline não quebra a resposta ─────────────────────
  //
  // O código usa Promise.race com timeout de 3s.
  // Se o Redis falhar, o erro é logado mas a função RESOLVE normalmente —
  // a resposta HTTP já foi entregue antes do publish.

  it('resolve normalmente quando o Redis falha (fire-and-forget)', async () => {
    setupTransactionMock();

    // mockRejectedValue simula uma promise que rejeita — Redis offline
    vi.mocked(publishDenunciaStatusEvent).mockRejectedValue(
      new Error('Redis connection refused')
    );

    // A função deve resolver, não rejeitar
    await expect(
      updateDenunciaStatus(USUARIO_ID, DENUNCIA_ID, 'EM_ANALISE')
    ).resolves.toBeDefined();
  });

  it('a transação já foi commitada mesmo com Redis offline', async () => {
    const txFake = setupTransactionMock();

    vi.mocked(publishDenunciaStatusEvent).mockRejectedValue(new Error('Redis offline'));

    await updateDenunciaStatus(USUARIO_ID, DENUNCIA_ID, 'EM_ANALISE');

    // O commit (denuncia.update dentro do tx) aconteceu antes do Redis
    expect(txFake.denuncia.update).toHaveBeenCalled();
  });

  it('resolve normalmente quando o Redis estoura o timeout de 3s', async () => {
    setupTransactionMock();

    // Simula uma promise que nunca resolve (timeout seria acionado em produção)
    vi.mocked(publishDenunciaStatusEvent).mockImplementation(
      () => new Promise(() => {}) // never resolves
    );

    // Em teste o timeout do Promise.race ainda vai disparar depois de 3s —
    // usamos um timeout generoso para o it não travar
    await expect(
      updateDenunciaStatus(USUARIO_ID, DENUNCIA_ID, 'EM_ANALISE')
    ).resolves.toBeDefined();
  }, 5000); // 5s de timeout para o it (maior que o setTimeout de 3s do código)
});
