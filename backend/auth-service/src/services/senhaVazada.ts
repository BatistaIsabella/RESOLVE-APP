import { createHash } from 'crypto';

const TEMPO_LIMITE_MS = 2500;

// Consulta a base Have I Been Pwned usando k-anonymity: só os 5 primeiros
// caracteres do SHA-1 saem do servidor, nunca a senha nem o hash completo.
// Se o serviço estiver fora do ar a senha não é bloqueada, e a política local continua valendo.
export async function senhaVazada(senha: string): Promise<boolean> {
  if (process.env.HIBP_ENABLED === 'false') return false;

  const hash = createHash('sha1').update(senha).digest('hex').toUpperCase();
  const prefixo = hash.slice(0, 5);
  const sufixo = hash.slice(5);

  try {
    const resposta = await fetch(`https://api.pwnedpasswords.com/range/${prefixo}`, {
      headers: { 'Add-Padding': 'true' },
      signal: AbortSignal.timeout(TEMPO_LIMITE_MS),
    });
    if (!resposta.ok) return false;

    const corpo = await resposta.text();
    return corpo.split('\n').some((linha) => {
      const [candidato, ocorrencias] = linha.trim().split(':');
      return candidato === sufixo && Number(ocorrencias) > 0;
    });
  } catch {
    return false;
  }
}
