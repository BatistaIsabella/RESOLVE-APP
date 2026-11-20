import { CATEGORIAS, REGIOES, STATUS } from '@/constants/demanda';

// Os tipos saem das listas de constants/demanda: a lista que alimenta os
// selects e o tipo que o compilador checa não podem divergir.
export type DemandStatus = (typeof STATUS)[number];
export type DemandCategory = (typeof CATEGORIAS)[number];
export type DemandRegion = (typeof REGIOES)[number];
/** Valor de domínio. O rótulo com acento ("Média") é de exibição: ver formatPriorityLabel. */
export type DemandPriority = 'Alta' | 'Media' | 'Baixa';

export interface Demand {
  id: string;
  titulo: string;
  category: DemandCategory;
  status: DemandStatus;
  priority: DemandPriority;
  region: DemandRegion;
  description: string;
  imagens: string[];
  endereco: string;
  solicitante: string;
  /** Data já formatada em pt-BR, para exibir. */
  dataRegistro: string;
  /** Data crua em ISO. `dataRegistro` já vem formatada e não serve para agregar por dia. */
  dataRegistroISO: string;
}

/** O que a tela de nova denúncia entrega ao store/service. */
export interface NewDemandInput {
  titulo: string;
  categoria: DemandCategory;
  regiao: DemandRegion;
  descricao: string;
  endereco: string;
  prioridade?: DemandPriority;
  /** URI local da foto. A conversão para base64 acontece no service, não na tela. */
  imagemUri?: string | null;
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
