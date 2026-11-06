import { apiFetch, METRICS_API_URL } from '@/lib/api';

export interface MetricsKpis {
  total: number;
  byCategory: Record<string, number>;
  byRegion: Record<string, number>;
  byStatus: Record<string, number>;
  updatedAt: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  ILUMINACAO_PUBLICA: 'Iluminação Pública',
  MANUTENCAO_DE_VIAS: 'Manutenção de vias',
  SANEAMENTO: 'Saneamento',
  COLETA_DE_LIXO: 'Coleta de lixo',
  FISCALIZACAO: 'Fiscalização',
  SEGURANCA: 'Segurança',
  SINALIZACAO_DE_TRANSITO: 'Sinalização de Trânsito',
  OUTROS_EMPECILHOS: 'Outros Empecilhos',
};

const REGION_LABELS: Record<string, string> = {
  REGIAO_METROPOLITANA_DO_RECIFE: 'Região Metropolitana do Recife',
  ZONA_DA_MATA: 'Zona da Mata',
  AGRESTE: 'Agreste',
  SERTAO: 'Sertão',
  OUTRA: 'Outra',
};

function mapLabels(
  data: Record<string, number>,
  labels: Record<string, string>
): Record<string, number> {
  const result: Record<string, number> = {};
  for (const [key, value] of Object.entries(data)) {
    result[labels[key] ?? key] = value;
  }
  return result;
}

export const metricsService = {
  async getKpis(): Promise<{
    total: number;
    byCategory: Record<string, number>;
    byRegion: Record<string, number>;
  }> {
    const raw = await apiFetch<MetricsKpis>(METRICS_API_URL, '');
    return {
      total: raw.total,
      byCategory: mapLabels(raw.byCategory, CATEGORY_LABELS),
      byRegion: mapLabels(raw.byRegion, REGION_LABELS),
    };
  },
};
