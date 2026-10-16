const STEP_BASES = [1, 2, 5];
const MAX_SEGMENTS = 4;

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

export function fitLabel(label: string, slotWidth: number): string {
  const maxChars = Math.max(3, Math.floor(slotWidth / 5.5));
  return label.length > maxChars ? `${label.slice(0, maxChars - 1)}…` : label;
}

export function axisPadding(max: number): number {
  return Math.max(28, String(max).length * 6 + 14);
}
