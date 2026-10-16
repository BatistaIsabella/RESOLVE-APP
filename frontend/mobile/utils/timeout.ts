/** Rejeita se a promise não resolver em `ms` milissegundos. */
export function comTempoLimite<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const limite = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('Tempo limite esgotado')), ms);
  });
  return Promise.race([promise, limite]).finally(() => clearTimeout(timer));
}
