// Notificação tocada: abre a denúncia. O backend manda `data.denunciaId`.
export function rotaDaNotificacao(data: unknown): string | null {
  const denunciaId = (data as { denunciaId?: unknown } | null | undefined)?.denunciaId;
  if (typeof denunciaId === 'number' || (typeof denunciaId === 'string' && /^\d+$/.test(denunciaId))) {
    return `/denuncias/${denunciaId}`;
  }
  return null;
}
