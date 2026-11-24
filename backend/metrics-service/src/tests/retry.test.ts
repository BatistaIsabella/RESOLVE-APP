import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { withRetry } from '../utils/retry';

// withRetry protege a agregação de métricas (metricsService) e a renovação do
// cache disparada pelo eventWorker contra falhas momentâneas do banco/Redis.
// Timers simulados permitem verificar os intervalos sem esperar de verdade.

describe('withRetry (metrics-service)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('respeita o limite de tentativas configurado', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('falha'));

    const promessa = withRetry(fn, 5, 10);
    const verificacao = expect(promessa).rejects.toThrow('falha');
    await vi.runAllTimersAsync();

    await verificacao;
    expect(fn).toHaveBeenCalledTimes(5);
  });

  it('usa 3 tentativas quando o limite não é informado', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('falha'));

    const promessa = withRetry(fn);
    const verificacao = expect(promessa).rejects.toThrow('falha');
    await vi.runAllTimersAsync();

    await verificacao;
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('interrompe as tentativas após o primeiro sucesso', async () => {
    const kpis = { total: 10, resolvidas: 4 };
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('connection refused'))
      .mockResolvedValueOnce(kpis)
      .mockResolvedValue({ total: -1 });

    const promessa = withRetry(fn, 5, 10);
    await vi.runAllTimersAsync();

    await expect(promessa).resolves.toBe(kpis);
    expect(fn).toHaveBeenCalledTimes(2);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('não agenda novas tentativas quando a primeira chamada dá certo', async () => {
    const fn = vi.fn().mockResolvedValue('ok');

    await expect(withRetry(fn, 4, 1000)).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('rejeita após falhas persistentes em todas as tentativas', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('banco fora do ar'));

    const promessa = withRetry(fn, 3, 200);
    const verificacao = expect(promessa).rejects.toThrow('banco fora do ar');
    await vi.runAllTimersAsync();

    await verificacao;
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('aplica intervalos progressivos de delayMs * tentativa', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('falha'));
    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');

    const promessa = withRetry(fn, 4, 100);
    const verificacao = expect(promessa).rejects.toThrow('falha');
    await vi.runAllTimersAsync();
    await verificacao;

    const intervalos = setTimeoutSpy.mock.calls.map(([, ms]) => ms);
    expect(intervalos).toEqual([100, 200, 300]);
    setTimeoutSpy.mockRestore();
  });

  it('só executa a próxima tentativa depois do intervalo completo', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('falha'));

    const promessa = withRetry(fn, 3, 250);
    const verificacao = expect(promessa).rejects.toThrow('falha');

    await vi.advanceTimersByTimeAsync(249);
    expect(fn).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(fn).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(499);
    expect(fn).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1);
    expect(fn).toHaveBeenCalledTimes(3);

    await verificacao;
  });

  it('preserva a instância do erro original da última tentativa', async () => {
    const erroFinal = Object.assign(new Error('timeout'), { code: 'ETIMEDOUT' });
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('primeira falha'))
      .mockRejectedValueOnce(new Error('segunda falha'))
      .mockRejectedValueOnce(erroFinal);

    const promessa = withRetry(fn, 3, 10);
    const verificacao = expect(promessa).rejects.toBe(erroFinal);
    await vi.runAllTimersAsync();

    await verificacao;
    await expect(promessa).rejects.toMatchObject({ code: 'ETIMEDOUT' });
  });
});
