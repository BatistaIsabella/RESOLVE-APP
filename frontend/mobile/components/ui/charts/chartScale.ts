const STEP_BASES = [1, 2, 5];
const MAX_SEGMENTS = 4;

/**
 * Escala "bonita" com ticks inteiros (passo 1, 2 ou 5 × 10^n), 0 na base e
 * máximo >= maior valor.
 */
export function niceScale(value: number): { max: number; ticks: number[] } {
  if (!Number.isFinite(value) || value <= 0) {
    return { max: 4, ticks: [0, 1, 2, 3, 4] };
  }

  const top = Math.ceil(value);
  let step = 1;
  for (let exp = 0; ; exp++) {
    const found = STEP_BASES.map((b) => b * Math.pow(10, exp)).find(
      (s) => Math.ceil(top / s) <= MAX_SEGMENTS
    );
    if (found) {
      step = found;
      break;
    }
  }

  const segments = Math.ceil(top / step);
  const ticks = Array.from({ length: segments + 1 }, (_, i) => i * step);
  return { max: ticks[ticks.length - 1], ticks };
}

/** Abrevia o rótulo com "…" para caber na largura disponível (fonte ~9px). */
export function fitLabel(label: string, slotWidth: number): string {
  const maxChars = Math.max(3, Math.floor(slotWidth / 5.5));
  return label.length > maxChars ? `${label.slice(0, maxChars - 1)}…` : label;
}

/** Largura do eixo Y conforme o maior rótulo. */
export function axisPadding(max: number): number {
  return Math.max(28, String(max).length * 6 + 14);
}
