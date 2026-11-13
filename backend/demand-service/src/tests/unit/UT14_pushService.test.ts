import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../lib/prisma', () => ({
  prisma: {
    cidadao: { findUnique: vi.fn() },
    dispositivoPush: {
      upsert: vi.fn(),
      findMany: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

import { prisma } from '../../lib/prisma';
import {
  notificarMudancaStatus,
  registrarDispositivo,
  removerDispositivo,
  validarTokenPush,
} from '../../services/pushService';

const db = prisma as any;
const TOKEN = 'ExponentPushToken[abcdefghijklmnopqrstuv]';
const MUDANCA = { cidadaoId: 10, denunciaId: 7, titulo: 'Buraco na pista', statusNovo: 'RESOLVIDA' as const };

const respostaExpo = (corpo: unknown, ok = true, status = 200) =>
  ({ ok, status, json: async () => corpo }) as Response;

describe('validarTokenPush', () => {
  it('aceita tokens no formato do Expo', () => {
    expect(validarTokenPush(TOKEN)).toBe(TOKEN);
    expect(validarTokenPush('ExpoPushToken[abcdefghijklmnopqrstuv]')).toBe('ExpoPushToken[abcdefghijklmnopqrstuv]');
  });

  it.each([undefined, null, 42, '', 'abc', 'ExponentPushToken[]', 'ExponentPushToken[curto]', '<script>'])(
    'recusa %j',
    (valor) => {
      expect(() => validarTokenPush(valor)).toThrow('token de notificação inválido');
    }
  );
});

describe('registro de aparelhos', () => {
  beforeEach(() => vi.clearAllMocks());

  it('registra o token para a conta, movendo-o se era de outra', async () => {
    await registrarDispositivo(5, TOKEN);

    expect(db.dispositivoPush.upsert).toHaveBeenCalledWith({
      where: { token: TOKEN },
      update: { usuario_id: 5 },
      create: { usuario_id: 5, token: TOKEN },
    });
  });

  it('só remove o token se ele for da própria conta', async () => {
    await removerDispositivo(5, TOKEN);

    expect(db.dispositivoPush.deleteMany).toHaveBeenCalledWith({ where: { token: TOKEN, usuario_id: 5 } });
  });
});

describe('notificarMudancaStatus', () => {
  const fetchFalso = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', fetchFalso);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    db.cidadao.findUnique.mockResolvedValue({ id_cidadao: 10, usuario_id: 5 });
    db.dispositivoPush.findMany.mockResolvedValue([{ token: TOKEN }]);
    fetchFalso.mockResolvedValue(respostaExpo({ data: [{ status: 'ok' }] }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('envia uma mensagem por aparelho, com o status em português e o id da denúncia', async () => {
    await notificarMudancaStatus(MUDANCA);

    expect(fetchFalso).toHaveBeenCalledOnce();
    const [, opcoes] = fetchFalso.mock.calls[0];
    expect(JSON.parse(opcoes.body)).toEqual([
      {
        to: TOKEN,
        sound: 'default',
        title: 'Sua denúncia foi atualizada',
        body: '"Buraco na pista" agora está resolvida.',
        data: { denunciaId: 7, status: 'RESOLVIDA' },
      },
    ]);
  });

  it('busca os aparelhos da conta do cidadão dono da denúncia', async () => {
    await notificarMudancaStatus(MUDANCA);

    expect(db.dispositivoPush.findMany).toHaveBeenCalledWith({ where: { usuario_id: 5 } });
  });

  it('não envia nada quando a conta não tem aparelho registrado', async () => {
    db.dispositivoPush.findMany.mockResolvedValue([]);

    await notificarMudancaStatus(MUDANCA);

    expect(fetchFalso).not.toHaveBeenCalled();
  });

  it('não envia para titular que pediu a eliminação dos dados', async () => {
    db.cidadao.findUnique.mockResolvedValue({ id_cidadao: 10, usuario_id: -10 });

    await notificarMudancaStatus(MUDANCA);

    expect(db.dispositivoPush.findMany).not.toHaveBeenCalled();
    expect(fetchFalso).not.toHaveBeenCalled();
  });

  it('descarta o token que o Expo diz não estar mais registrado', async () => {
    fetchFalso.mockResolvedValue(
      respostaExpo({ data: [{ status: 'error', details: { error: 'DeviceNotRegistered' } }] })
    );

    await notificarMudancaStatus(MUDANCA);

    expect(db.dispositivoPush.deleteMany).toHaveBeenCalledWith({ where: { token: { in: [TOKEN] } } });
  });

  it('não lança quando o Expo está fora do ar', async () => {
    fetchFalso.mockRejectedValue(new Error('rede'));

    await expect(notificarMudancaStatus(MUDANCA)).resolves.toBeUndefined();
  });

  it('não lança quando o Expo responde erro HTTP', async () => {
    fetchFalso.mockResolvedValue(respostaExpo({}, false, 503));

    await expect(notificarMudancaStatus(MUDANCA)).resolves.toBeUndefined();
    expect(db.dispositivoPush.deleteMany).not.toHaveBeenCalled();
  });

  it('não lança quando o banco falha', async () => {
    db.cidadao.findUnique.mockRejectedValue(new Error('banco'));

    await expect(notificarMudancaStatus(MUDANCA)).resolves.toBeUndefined();
  });
});
