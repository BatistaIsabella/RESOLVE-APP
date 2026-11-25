/**
 * Formatação da data da última sincronização exibida no OfflineBanner.
 * Função pura para poder ser testada sem React Native.
 */

/** Tolerância para relógios levemente adiantados entre o servidor e o aparelho. */
const TOLERANCIA_FUTURO_MS = 5 * 60 * 1000;

/**
 * Converte o ISO salvo no cache em "dd/mm às hh:mm".
 * Devolve null quando o valor não é uma data válida ou está no futuro
 * (relógio do aparelho alterado ou cache corrompido); nesses casos quem
 * chama mostra uma mensagem sem data em vez de "Invalid Date".
 */
export function formatarDataSincronizacao(
  iso: string | null | undefined,
  agora: number = Date.now()
): string | null {
  if (typeof iso !== 'string' || iso.trim() === '') return null;

  const data = new Date(iso);
  const timestamp = data.getTime();
  if (!Number.isFinite(timestamp)) return null;
  if (timestamp > agora + TOLERANCIA_FUTURO_MS) return null;

  const dia = data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  const hora = data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return `${dia} às ${hora}`;
}
