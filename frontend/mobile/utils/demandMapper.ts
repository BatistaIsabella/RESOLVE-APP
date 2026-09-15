import {
  Demand,
  DemandCategory,
  DemandPriority,
  DemandRegion,
  DemandStatus,
} from '@/types/demand';

export interface ApiDenuncia {
  id_denuncia: number;
  titulo: string;
  categoria: string;
  regiao: string;
  descricao: string;
  status: string;
  prioridade: string;
  data_registro: string;
  endereco: string;
  email_solicitante?: string | null;
  imagens?: Array<{ caminho_file: string }>;
}

const CATEGORIA_TO_API: Record<DemandCategory, string> = {
  'Iluminação Pública': 'ILUMINACAO_PUBLICA',
  'Manutenção de vias': 'MANUTENCAO_DE_VIAS',
  Saneamento: 'SANEAMENTO',
  'Coleta de lixo': 'COLETA_DE_LIXO',
  Fiscalização: 'FISCALIZACAO',
  Segurança: 'SEGURANCA',
  'Sinalização de Trânsito': 'SINALIZACAO_DE_TRANSITO',
  'Outros Empecilhos': 'OUTROS_EMPECILHOS',
};

const CATEGORIA_FROM_API: Record<string, DemandCategory> = Object.fromEntries(
  Object.entries(CATEGORIA_TO_API).map(([label, value]) => [value, label as DemandCategory])
) as Record<string, DemandCategory>;

const REGIAO_TO_API: Record<DemandRegion, string> = {
  'Região Metropolitana do Recife': 'REGIAO_METROPOLITANA_DO_RECIFE',
  'Zona da Mata': 'ZONA_DA_MATA',
  Agreste: 'AGRESTE',
  Sertão: 'SERTAO',
  Outra: 'OUTRA',
};

const REGIAO_FROM_API: Record<string, DemandRegion> = Object.fromEntries(
  Object.entries(REGIAO_TO_API).map(([label, value]) => [value, label as DemandRegion])
) as Record<string, DemandRegion>;

const STATUS_TO_API: Record<DemandStatus, string> = {
  Aberta: 'ABERTA',
  'Em análise': 'EM_ANALISE',
  Resolvida: 'RESOLVIDA',
};

const STATUS_FROM_API: Record<string, DemandStatus> = {
  ABERTA: 'Aberta',
  EM_ANALISE: 'Em análise',
  RESOLVIDA: 'Resolvida',
};

const PRIORIDADE_TO_API: Record<DemandPriority, string> = {
  Alta: 'ALTA',
  Media: 'MEDIA',
  Baixa: 'BAIXA',
};

const PRIORIDADE_FROM_API: Record<string, DemandPriority> = {
  ALTA: 'Alta',
  MEDIA: 'Media',
  BAIXA: 'Baixa',
};

function formatDataRegistro(data: string): string {
  return new Date(data).toLocaleString('pt-BR');
}

export function mapDenunciaFromApi(denuncia: ApiDenuncia, solicitante = ''): Demand {
  return {
    id: String(denuncia.id_denuncia),
    titulo: denuncia.titulo,
    location: denuncia.endereco,
    category: CATEGORIA_FROM_API[denuncia.categoria] ?? 'Outros Empecilhos',
    region: REGIAO_FROM_API[denuncia.regiao] ?? 'Outra',
    status: STATUS_FROM_API[denuncia.status] ?? 'Aberta',
    priority: PRIORIDADE_FROM_API[denuncia.prioridade] ?? 'Media',
    description: denuncia.descricao,
    createdAt: formatDataRegistro(denuncia.data_registro),
    fotoUrl: denuncia.imagens?.[0]?.caminho_file ?? '',
    imagens: denuncia.imagens?.map((img) => img.caminho_file).filter(Boolean) ?? [],
    endereco: denuncia.endereco,
    solicitante: denuncia.email_solicitante ?? solicitante,
    dataRegistro: formatDataRegistro(denuncia.data_registro),
  };
}

export function mapDenunciasFromApi(denuncias: ApiDenuncia[], solicitante = ''): Demand[] {
  return denuncias.map((denuncia) => mapDenunciaFromApi(denuncia, solicitante));
}

export function mapCategoryToApi(category: DemandCategory): string {
  return CATEGORIA_TO_API[category];
}

export function mapRegionToApi(region: DemandRegion): string {
  return REGIAO_TO_API[region];
}

export function mapStatusToApi(status: DemandStatus): string {
  return STATUS_TO_API[status];
}

export function mapPriorityToApi(priority: DemandPriority): string {
  return PRIORIDADE_TO_API[priority];
}

export function formatPriorityLabel(priority: DemandPriority): string {
  return priority === 'Media' ? 'Média' : priority;
}

export function buildCreatePayload(input: {
  titulo: string;
  categoria: DemandCategory;
  regiao: DemandRegion;
  descricao: string;
  endereco: string;
  prioridade?: DemandPriority;
  imagens?: string[];
}) {
  return {
    titulo: input.titulo.slice(0, 50),
    categoria: mapCategoryToApi(input.categoria),
    regiao: mapRegionToApi(input.regiao),
    descricao: input.descricao,
    endereco: input.endereco,
    ...(input.prioridade ? { prioridade: mapPriorityToApi(input.prioridade) } : {}),
    ...(input.imagens ? { imagens: input.imagens } : {}),
  };
}

export function extractBairro(endereco: string): string {
  const parts = endereco.split('-').map((p) => p.trim());
  if (parts.length >= 2) return parts[1];
  return endereco.split(',')[0]?.trim() ?? endereco;
}
