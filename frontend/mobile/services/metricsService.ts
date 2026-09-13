import { api } from '@/lib/api';
import { MetricsKpis } from '@/types/demand';

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
  REGIAO_METROPOLITANA_DO_RECIFE: 'RMR',
  ZONA_DA_MATA: 'Zona da Mata',
  AGRESTE: 'Agreste',
  SERTAO: 'Sertão',
  OUTRA: 'Outra',
};

const STATUS_LABELS: Record<string, string> = {
  ABERTA: 'Aberta',
  EM_ANALISE: 'Em análise',
  RESOLVIDA: 'Resolvida',
};

function mapLabels(data: Record<string, number>, labels: Record<string, string>): Record<string, number> {
  const result: Record<string, number> = {};
  for (const [key, value] of Object.entries(data)) {
    result[labels[key] ?? key] = value;
  }
  return result;
}

export const metricsService = {
  async getKpis(): Promise<MetricsKpis> {
    const { data } = await api.get<MetricsKpis>('/metrics');
    return {
      ...data,
      byCategory: mapLabels(data.byCategory, CATEGORY_LABELS),
      byRegion: mapLabels(data.byRegion, REGION_LABELS),
      byStatus: mapLabels(data.byStatus, STATUS_LABELS),
    };
  },
};
