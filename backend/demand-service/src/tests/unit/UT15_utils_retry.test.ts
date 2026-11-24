import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { withRetry } from '../../utils/retry';

// withRetry() reexecuta uma operação assíncrona que falhou (ex.: uma consulta
// ao banco ou ao Redis durante uma instabilidade). Entre as tentativas espera
// delayMs * númeroDaTentativa — 500ms, 1000ms, ... — e, se todas falharem,
// relança o último erro recebido.
//
// Os timers são simulados (vi.useFakeTimers) para testar os intervalos sem
// deixar a suíte lenta.

describe('withRetry', () => {

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('retorna o resultado na primeira tentativa sem aguardar', async () => {
    const fn = vi.fn().mockResolvedValue('ok');

    await expect(withRetry(fn)).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('recupera após uma falha temporária', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('ECONNRESET'))
      .mockResolvedValueOnce('recuperado');

    const promessa = withRetry(fn, 3, 100);
    await vi.advanceTimersByTimeAsync(100);

    await expect(promessa).resolves.toBe('recuperado');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('interrompe as tentativas assim que uma delas dá certo', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('falha 1'))
      .mockRejectedValueOnce(new Error('falha 2'))
      .mockResolvedValue('ok');

    const promessa = withRetry(fn, 5, 10);
    await vi.runAllTimersAsync();

    await expect(promessa).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('esgota as tentativas e rejeita quando a operação sempre falha', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('indisponível'));

    const promessa = withRetry(fn, 3, 50);
    // Registra a asserção antes de avançar o relógio para não gerar
    // "unhandled rejection" enquanto os timers rodam.
    const verificacao = expect(promessa).rejects.toThrow('indisponível');
    await vi.runAllTimersAsync();

    await verificacao;
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('propaga exatamente o erro original da última tentativa', async () => {
    const primeiro = new Error('primeiro');
    const ultimo = Object.assign(new Error('último'), { status: 503 });
    const fn = vi.fn()
      .mockRejectedValueOnce(primeiro)
      .mockRejectedValueOnce(ultimo);

    const promessa = withRetry(fn, 2, 10);
    const verificacao = expect(promessa).rejects.toBe(ultimo);
    await vi.runAllTimersAsync();

    await verificacao;
  });

  it('propaga valores rejeitados que não são instâncias de Error', async () => {
    const fn = vi.fn().mockRejectedValue('timeout');

    const promessa = withRetry(fn, 2, 10);
    const verificacao = expect(promessa).rejects.toBe('timeout');
    await vi.runAllTimersAsync();

    await verificacao;
  });

  it('aguarda intervalos crescentes (delayMs * tentativa) entre as tentativas', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('falha'));

    const promessa = withRetry(fn, 3, 500);
    const verificacao = expect(promessa).rejects.toThrow('falha');

    // 1ª tentativa é imediata.
    await vi.advanceTimersByTimeAsync(0);
    expect(fn).toHaveBeenCalledTimes(1);

    // 2ª tentativa só depois de 500ms.
    await vi.advanceTimersByTimeAsync(499);
    expect(fn).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(fn).toHaveBeenCalledTimes(2);

    // 3ª tentativa só depois de mais 1000ms.
    await vi.advanceTimersByTimeAsync(999);
    expect(fn).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1);
    expect(fn).toHaveBeenCalledTimes(3);

    await verificacao;
  });

  it('não aguarda depois da última tentativa', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('falha'));

    const promessa = withRetry(fn, 1, 1000);

    await expect(promessa).rejects.toThrow('falha');
    expect(fn).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('usa 3 tentativas e 500ms como padrão', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('falha'));

    const promessa = withRetry(fn);
    const verificacao = expect(promessa).rejects.toThrow('falha');

    await vi.advanceTimersByTimeAsync(500 + 1000);
    await verificacao;
    expect(fn).toHaveBeenCalledTimes(3);
  });
});
