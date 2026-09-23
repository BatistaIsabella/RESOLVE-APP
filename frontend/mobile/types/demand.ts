export type DemandStatus = 'Aberta' | 'Em análise' | 'Resolvida';
export type DemandCategory =
  | 'Iluminação Pública'
  | 'Manutenção de vias'
  | 'Saneamento'
  | 'Coleta de lixo'
  | 'Fiscalização'
  | 'Segurança'
  | 'Sinalização de Trânsito'
  | 'Outros Empecilhos';
export type DemandPriority = 'Alta' | 'Media' | 'Baixa';
export type DemandRegion =
  | 'Região Metropolitana do Recife'
  | 'Zona da Mata'
  | 'Agreste'
  | 'Sertão'
  | 'Outra';

export interface Demand {
  id: string;
  titulo: string;
  location: string;
  category: DemandCategory;
  status: DemandStatus;
  priority: DemandPriority;
  region: DemandRegion;
  description: string;
  createdAt: string;
  fotoUrl?: string;
  imagens: string[];
  endereco: string;
  solicitante: string;
  dataRegistro: string;
  /** Data crua em ISO. `dataRegistro`/`createdAt` já vêm formatados em pt-BR e
   *  não servem para agregar por dia. */
  dataRegistroISO: string;
}

export interface DemandFilters {
  status: DemandStatus | '';
  category: DemandCategory | '';
  region: DemandRegion | '';
  priority: DemandPriority | '';
}

export interface MetricsKpis {
  total: number;
  byCategory: Record<string, number>;
  byRegion: Record<string, number>;
  byStatus: Record<string, number>;
  updatedAt: string;
}
