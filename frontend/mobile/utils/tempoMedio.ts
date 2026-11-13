// Formata o tempo médio de atendimento (em horas) para o painel do gestor.
// Até 48 h fica em horas; acima disso, em dias, que é como a gestão costuma falar de prazo.
export function formatTempoMedio(horas: number | null | undefined): string {
  if (horas === null || horas === undefined || !Number.isFinite(horas) || horas < 0) return '—';

  if (horas < 1) return 'menos de 1 h';
  if (horas < 48) return `${Math.round(horas)} h`;

  const dias = Math.round((horas / 24) * 10) / 10;
  return `${String(dias).replace('.', ',')} dias`;
}
