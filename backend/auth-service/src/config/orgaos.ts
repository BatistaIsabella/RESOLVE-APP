// Catálogo de órgãos. Cada órgão enxerga apenas as categorias listadas.
// `null` significa acesso a todas as categorias (gestão geral).
export const ORGAOS: Record<string, string[] | null> = {
  GERAL: null,
  ILUMINACAO: ['ILUMINACAO_PUBLICA'],
  OBRAS_E_SANEAMENTO: ['MANUTENCAO_DE_VIAS', 'SANEAMENTO'],
  LIMPEZA_URBANA: ['COLETA_DE_LIXO'],
  TRANSITO: ['SINALIZACAO_DE_TRANSITO'],
  FISCALIZACAO_E_SEGURANCA: ['FISCALIZACAO', 'SEGURANCA'],
};

export const ORGAO_PADRAO = 'GERAL';

export function categoriasDoOrgao(orgao: string | null | undefined): string[] | null {
  const chave = orgao ?? ORGAO_PADRAO;
  return chave in ORGAOS ? ORGAOS[chave] : [];
}
