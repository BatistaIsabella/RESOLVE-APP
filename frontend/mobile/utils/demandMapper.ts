import type {
  Demand,
  DemandCategory,
  DemandPriority,
  DemandRegion,
  DemandStatus,
  DemandUpdateInput,
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
    category: mapCategoryFromApi(denuncia.categoria),
    region: mapRegionFromApi(denuncia.regiao),
    status: mapStatusFromApi(denuncia.status),
    priority: PRIORIDADE_FROM_API[denuncia.prioridade] ?? 'Media',
    description: denuncia.descricao,
    createdAt: formatDataRegistro(denuncia.data_registro),
    fotoUrl: denuncia.imagens?.[0]?.caminho_file ?? '',
    imagens: denuncia.imagens?.map((img) => img.caminho_file).filter(Boolean) ?? [],
    endereco: denuncia.endereco,
    solicitante: denuncia.email_solicitante ?? solicitante,
    dataRegistro: formatDataRegistro(denuncia.data_registro),
    dataRegistroISO: denuncia.data_registro,
  };
}

export function mapDenunciasFromApi(denuncias: ApiDenuncia[], solicitante = ''): Demand[] {
  return denuncias.map((denuncia) => mapDenunciaFromApi(denuncia, solicitante));
}

export function mapCategoryFromApi(value: string): DemandCategory {
  return CATEGORIA_FROM_API[value] ?? 'Outros Empecilhos';
}

export function mapRegionFromApi(value: string): DemandRegion {
  return REGIAO_FROM_API[value] ?? 'Outra';
}

export function mapStatusFromApi(value: string): DemandStatus {
  return STATUS_FROM_API[value] ?? 'Aberta';
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

/** Só os campos informados vão no PATCH; os enums seguem o formato da API. */
export function buildUpdatePayload(input: DemandUpdateInput) {
  return {
    ...(input.titulo !== undefined ? { titulo: input.titulo.slice(0, 50) } : {}),
    ...(input.descricao !== undefined ? { descricao: input.descricao } : {}),
    ...(input.categoria ? { categoria: mapCategoryToApi(input.categoria) } : {}),
    ...(input.regiao ? { regiao: mapRegionToApi(input.regiao) } : {}),
    ...(input.endereco !== undefined ? { endereco: input.endereco } : {}),
  };
}

// "(-8.05000, -34.88000)" que o GPS anexa ao fim do endereço.
const COORDENADAS_NO_FIM = /\s*\([^)]*\)\s*$/;
// "Lat: -8.05000, Lng: -34.88000": GPS sem endereço reverso.
const SO_COORDENADAS = /^\s*Lat:/i;

export const BAIRRO_SO_GPS = 'Localização por GPS';

/**
 * Bairro para o card, a partir do endereço livre. Formatos conhecidos:
 * - "Rua, nº - Bairro, Cidade - CEP: ..." (traço com espaços em volta);
 * - GPS: "Rua, nº, Bairro, Cidade, UF (-8.05, -34.88)" → antepenúltimo item;
 * - GPS sem endereço: "Lat: ..., Lng: ...".
 * O sinal de menos das coordenadas e hífens em nomes ("Rua João-Pessoa")
 * não contam como separador.
 */
export function extractBairro(endereco: string): string {
  if (SO_COORDENADAS.test(endereco)) return BAIRRO_SO_GPS;

  const semCoordenadas = endereco.replace(COORDENADAS_NO_FIM, '').trim();

  const blocos = semCoordenadas.split(' - ');
  if (blocos.length >= 2) return blocos[1].split(',')[0].trim();

  const partes = semCoordenadas
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
  const candidato = partes.length >= 4 ? partes[partes.length - 3] : undefined;
  // Número da casa não é bairro (GPS que devolveu rua e número mas não o bairro).
  if (candidato && !/^\d/.test(candidato)) return candidato;
  return partes[0] ?? semCoordenadas;
}
