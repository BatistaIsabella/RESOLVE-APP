import {
  Categorias,
  Regioes,
  StatusDenuncia,
  NivelPrioridade,
  Prisma,
} from '@prisma/client';
import { prisma } from '../lib/prisma';
import { protegerEmail } from '../utils/emailProtegido';
import { validarImagens } from '../utils/imagem';
import { httpError } from '../utils/httpError';
import { buildPaginatedResult, PaginatedResult, PaginationParams } from '../utils/pagination';
import { getRedisPublisher, publishDenunciaStatusEvent } from '../config/redis';
import { generalizarEndereco } from '../utils/endereco';
import { limparCacheMetricas } from '../utils/metricsCache';

export interface CreateDenunciaInput {
  titulo: string;
  categoria: Categorias;
  regiao: Regioes;
  descricao: string;
  endereco: string;
  prioridade?: NivelPrioridade;
  imagens?: string[];
}

export type UpdateDenunciaInput = Partial<
  Pick<CreateDenunciaInput, 'titulo' | 'descricao' | 'categoria' | 'regiao' | 'endereco'>
>;

export interface DenunciaListFilters {
  q?: string;
  categoria?: Categorias;
  status?: StatusDenuncia;
  regiao?: Regioes;
  prioridade?: NivelPrioridade;
}

const CAMPOS_EDITAVEIS = ['titulo', 'descricao', 'categoria', 'regiao', 'endereco'] as const;
const TAMANHO_MAXIMO_BUSCA = 100;

const CATEGORIAS_VALIDAS = new Set<string>(Object.values(Categorias));
const REGIOES_VALIDAS = new Set<string>(Object.values(Regioes));
const STATUS_VALIDOS = new Set<string>(Object.values(StatusDenuncia));
const PRIORIDADES_VALIDAS = new Set<string>(Object.values(NivelPrioridade));


// Categorias que o gestor pode ver, vindas do token (órgão). `undefined` = todas.
export type CategoriasPermitidas = readonly string[] | undefined;

function foraDoEscopo(categoria: string, permitidas: CategoriasPermitidas): boolean {
  return permitidas !== undefined && !permitidas.includes(categoria);
}

// Denúncia de outro órgão responde igual a uma que não existe, para não revelar sua existência.
function assegurarEscopo(denuncia: { categoria: string }, permitidas: CategoriasPermitidas) {
  if (foraDoEscopo(denuncia.categoria, permitidas)) {
    throw httpError('Denúncia não encontrada', 404);
  }
}

async function resolveCidadaoId(usuarioId: number): Promise<number> {
  const cidadao = await prisma.cidadao.upsert({
    where: { usuario_id: usuarioId },
    update: {},
    create: { usuario_id: usuarioId },
  });

  return cidadao.id_cidadao;
}

async function resolveGestorId(usuarioId: number): Promise<number> {
  const gestor = await prisma.gestor.upsert({
    where: { usuario_id: usuarioId },
    update: {},
    create: { usuario_id: usuarioId },
  });

  return gestor.id_gestor;
}

function assertTitulo(titulo: unknown): asserts titulo is string {
  if (typeof titulo !== 'string' || titulo.length > 50) {
    throw httpError('titulo deve ser uma string com no máximo 50 caracteres', 400);
  }
}

function assertCategoria(categoria: unknown): asserts categoria is Categorias {
  if (typeof categoria !== 'string' || !CATEGORIAS_VALIDAS.has(categoria)) {
    throw httpError('categoria inválida', 400);
  }
}

function assertRegiao(regiao: unknown): asserts regiao is Regioes {
  if (typeof regiao !== 'string' || !REGIOES_VALIDAS.has(regiao)) {
    throw httpError('regiao inválida', 400);
  }
}

function assertTexto(campo: string, valor: unknown): asserts valor is string {
  if (typeof valor !== 'string') {
    throw httpError(`${campo} deve ser uma string`, 400);
  }
}

export function validateCreateDenunciaInput(body: Record<string, unknown>): CreateDenunciaInput {
  const {
    titulo,
    categoria,
    regiao,
    descricao,
    endereco: enderecoField,
    rua,
    numero,
    bairro,
    cidade,
    cep,
    prioridade,
    imagens,
  } = body;

  const endereco = enderecoField
    || ([rua, numero, bairro, cidade, cep].filter(Boolean).join(', ') || undefined);

  const camposObrigatorios = { titulo, categoria, regiao, descricao, endereco };
  const faltando = Object.entries(camposObrigatorios)
    .filter(([, valor]) => valor === undefined || valor === null || valor === '')
    .map(([campo]) => campo);

  if (faltando.length > 0) {
    throw httpError(`Campos obrigatórios: ${faltando.join(', ')}`, 400);
  }

  assertTitulo(titulo);
  assertCategoria(categoria);
  assertRegiao(regiao);
  assertTexto('descricao', descricao);
  assertTexto('endereco', endereco);

  if (prioridade !== undefined) {
    if (typeof prioridade !== 'string' || !PRIORIDADES_VALIDAS.has(prioridade)) {
      throw httpError('prioridade inválida', 400);
    }
  }

  return {
    titulo,
    categoria: categoria as Categorias,
    regiao: regiao as Regioes,
    descricao,
    endereco,
    prioridade: prioridade as NivelPrioridade | undefined,
    imagens: validarImagens(imagens),
  };
}

export function validateUpdateDenunciaInput(body: Record<string, unknown>): UpdateDenunciaInput {
  const naoEditaveis = Object.keys(body).filter(
    (campo) => !(CAMPOS_EDITAVEIS as readonly string[]).includes(campo)
  );
  if (naoEditaveis.length > 0) {
    throw httpError(
      `Campos não editáveis: ${naoEditaveis.join(', ')}. Editáveis: ${CAMPOS_EDITAVEIS.join(', ')}`,
      400
    );
  }

  const input: UpdateDenunciaInput = {};

  for (const campo of CAMPOS_EDITAVEIS) {
    const valor = body[campo];
    if (valor === undefined) continue;

    if (valor === null || (typeof valor === 'string' && valor.trim() === '')) {
      throw httpError(`${campo} não pode ser vazio`, 400);
    }

    switch (campo) {
      case 'titulo':
        assertTitulo(valor);
        input.titulo = valor;
        break;
      case 'categoria':
        assertCategoria(valor);
        input.categoria = valor;
        break;
      case 'regiao':
        assertRegiao(valor);
        input.regiao = valor;
        break;
      case 'descricao':
      case 'endereco':
        assertTexto(campo, valor);
        input[campo] = valor;
        break;
    }
  }

  if (Object.keys(input).length === 0) {
    throw httpError(`Informe ao menos um campo para atualizar: ${CAMPOS_EDITAVEIS.join(', ')}`, 400);
  }

  return input;
}

function parseEnumFilter<T extends string>(
  nome: string,
  valor: unknown,
  validos: Set<string>
): T | undefined {
  if (valor === undefined || valor === '') return undefined;

  if (typeof valor !== 'string' || !validos.has(valor.toUpperCase())) {
    throw httpError(`${nome} inválido. Valores aceitos: ${[...validos].join(', ')}`, 400);
  }

  return valor.toUpperCase() as T;
}

export function parseListFilters(query: Record<string, unknown>): DenunciaListFilters {
  const filtros: DenunciaListFilters = {};

  if (query.q !== undefined) {
    if (typeof query.q !== 'string') {
      throw httpError('q deve ser um texto', 400);
    }
    const q = query.q.trim();
    if (q.length > TAMANHO_MAXIMO_BUSCA) {
      throw httpError(`q deve ter no máximo ${TAMANHO_MAXIMO_BUSCA} caracteres`, 400);
    }
    if (q) filtros.q = q;
  }

  const categoria = parseEnumFilter<Categorias>('categoria', query.categoria, CATEGORIAS_VALIDAS);
  const status = parseEnumFilter<StatusDenuncia>('status', query.status, STATUS_VALIDOS);
  const regiao = parseEnumFilter<Regioes>('regiao', query.regiao, REGIOES_VALIDAS);
  const prioridade = parseEnumFilter<NivelPrioridade>('prioridade', query.prioridade, PRIORIDADES_VALIDAS);

  if (categoria) filtros.categoria = categoria;
  if (status) filtros.status = status;
  if (regiao) filtros.regiao = regiao;
  if (prioridade) filtros.prioridade = prioridade;

  return filtros;
}

export function buildListWhere(filtros: DenunciaListFilters): Prisma.DenunciaWhereInput {
  const where: Prisma.DenunciaWhereInput = {};

  if (filtros.q) {
    where.OR = [
      { titulo: { contains: filtros.q, mode: 'insensitive' } },
      { descricao: { contains: filtros.q, mode: 'insensitive' } },
    ];
  }
  if (filtros.categoria) where.categoria = filtros.categoria;
  if (filtros.status) where.status = filtros.status;
  if (filtros.regiao) where.regiao = filtros.regiao;
  if (filtros.prioridade) where.prioridade = filtros.prioridade;

  return where;
}

export async function createDenuncia(usuarioId: number, input: CreateDenunciaInput, emailSolicitante?: string) {
  const cidadaoId = await resolveCidadaoId(usuarioId);

  const imagensData = input.imagens && input.imagens.length > 0
    ? {
        create: input.imagens.map((strFoto) => ({
          caminho_file: strFoto,
        }))
      }
    : undefined;

  return prisma.denuncia.create({
    data: {
      titulo: input.titulo,
      categoria: input.categoria,
      regiao: input.regiao,
      descricao: input.descricao,
      endereco: input.endereco,
      prioridade: input.prioridade ?? NivelPrioridade.MEDIA,
      status: StatusDenuncia.ABERTA,
      cidadao_id: cidadaoId,
      email_solicitante_cifrado: emailSolicitante ? protegerEmail(emailSolicitante) : null,
      imagens: imagensData,
    },
    include: {
      imagens: true,
    },
  });
}

export async function listDenunciasByCidadao(
  usuarioId: number,
  pagination: PaginationParams,
  filtros: DenunciaListFilters = {}
): Promise<PaginatedResult<Awaited<ReturnType<typeof prisma.denuncia.findMany>>[number]>> {
  const cidadaoId = await resolveCidadaoId(usuarioId);

  const where = { ...buildListWhere(filtros), cidadao_id: cidadaoId };

  const [total, data] = await Promise.all([
    prisma.denuncia.count({ where }),
    prisma.denuncia.findMany({
      where,
      orderBy: { data_registro: 'desc' },
      skip: pagination.skip,
      take: pagination.limit,
      include: { imagens: true },
    }),
  ]);

  return buildPaginatedResult(data, total, pagination);
}

export async function getDenunciaById(usuarioId: number, denunciaId: number) {
  const cidadaoId = await resolveCidadaoId(usuarioId);

  const denuncia = await prisma.denuncia.findFirst({
    where: {
      id_denuncia: denunciaId,
      cidadao_id: cidadaoId,
    },
    include: {
      imagens: true,
      historicos: {
        orderBy: { data_alteracao: 'desc' },
      },
    },
  });

  if (!denuncia) {
    throw httpError('Denúncia não encontrada', 404);
  }

  return denuncia;
}

async function invalidarCacheMetricas() {
  try {
    await Promise.race([
      getRedisPublisher().then((redis) => limparCacheMetricas(redis)),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Redis timeout')), 3000)
      ),
    ]);
  } catch (err) {
    console.error('[demand] Falha ao invalidar cache de métricas:', err);
  }
}

async function findDenunciaDoCidadaoEmAberto(usuarioId: number, denunciaId: number, acao: string) {
  const cidadaoId = await resolveCidadaoId(usuarioId);

  const denuncia = await prisma.denuncia.findFirst({
    where: { id_denuncia: denunciaId, cidadao_id: cidadaoId },
  });

  if (!denuncia) {
    throw httpError('Denúncia não encontrada', 404);
  }

  if (denuncia.status !== StatusDenuncia.ABERTA) {
    throw httpError(
      `Só é possível ${acao} denúncias com status ABERTA (status atual: ${denuncia.status})`,
      409
    );
  }

  return denuncia;
}

export async function updateDenunciaCidadao(
  usuarioId: number,
  denunciaId: number,
  input: UpdateDenunciaInput
) {
  await findDenunciaDoCidadaoEmAberto(usuarioId, denunciaId, 'editar');

  const denuncia = await prisma.denuncia.update({
    where: { id_denuncia: denunciaId },
    data: input,
    include: { imagens: true },
  });

  await invalidarCacheMetricas();

  return denuncia;
}

export async function deleteDenunciaCidadao(usuarioId: number, denunciaId: number) {
  await findDenunciaDoCidadaoEmAberto(usuarioId, denunciaId, 'excluir');

  await prisma.denuncia.delete({ where: { id_denuncia: denunciaId } });

  await invalidarCacheMetricas();
}

export async function deleteDenunciaGestor(denunciaId: number, permitidas?: CategoriasPermitidas) {
  const denuncia = await prisma.denuncia.findUnique({
    where: { id_denuncia: denunciaId },
  });

  if (!denuncia) {
    throw httpError('Denúncia não encontrada', 404);
  }
  assegurarEscopo(denuncia, permitidas);

  await prisma.denuncia.delete({ where: { id_denuncia: denunciaId } });

  await invalidarCacheMetricas();
}

export async function updateDenunciaStatus(
  usuarioId: number,
  denunciaId: number,
  novoStatus: StatusDenuncia,
  permitidas?: CategoriasPermitidas
) {
  if (!STATUS_VALIDOS.has(novoStatus)) {
    throw httpError('status inválido', 400);
  }

  const gestorId = await resolveGestorId(usuarioId);

  const denunciaExistente = await prisma.denuncia.findUnique({
    where: { id_denuncia: denunciaId },
  });

  if (!denunciaExistente) {
    throw httpError('Denúncia não encontrada', 404);
  }
  assegurarEscopo(denunciaExistente, permitidas);

  if (denunciaExistente.status === novoStatus) {
    throw httpError('A denúncia já possui este status', 400);
  }

  const resultado = await prisma.$transaction(async (tx) => {
    const denunciaAtualizada = await tx.denuncia.update({
      where: { id_denuncia: denunciaId },
      data: {
        status: novoStatus,
        data_conclusao: novoStatus === StatusDenuncia.RESOLVIDA ? new Date() : null,
      },
      include: { imagens: true },
    });

    const historico = await tx.historico.create({
      data: {
        status: novoStatus,
        prioridade: denunciaAtualizada.prioridade,
        denuncia_id: denunciaId,
        gestor_id: gestorId,
      },
    });

    return { denuncia: denunciaAtualizada, historico };
  });

  try {
    await Promise.race([
      publishDenunciaStatusEvent({
        denunciaId,
        statusAnterior: denunciaExistente.status,
        statusNovo: novoStatus,
        gestorId,
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Redis timeout')), 3000)
      ),
    ]);
  } catch (err) {
    console.error('[demand] Falha ao publicação de evento:', err);
  }

  return resultado;
}

export function validateStatusInput(status: unknown): StatusDenuncia {
  if (typeof status !== 'string' || !STATUS_VALIDOS.has(status)) {
    throw httpError(
      `status inválido. Valores aceitos: ${Object.values(StatusDenuncia).join(', ')}`,
      400
    );
  }

  return status as StatusDenuncia;
}

export async function listAllDenuncias(
  pagination: PaginationParams,
  filtros: DenunciaListFilters = {},
  permitidas?: CategoriasPermitidas
) {
  const where = buildListWhere(filtros);
  if (permitidas !== undefined) {
    where.AND = [{ categoria: { in: permitidas as Categorias[] } }];
  }

  const [total, data] = await Promise.all([
    prisma.denuncia.count({ where }),
    prisma.denuncia.findMany({
      where,
      orderBy: { data_registro: 'desc' },
      skip: pagination.skip,
      take: pagination.limit,
      include: { imagens: true },
    }),
  ]);

  return buildPaginatedResult(data, total, pagination);
}

export async function getDenunciaByIdForGestor(denunciaId: number, permitidas?: CategoriasPermitidas) {
  const denuncia = await prisma.denuncia.findUnique({
    where: { id_denuncia: denunciaId },
    include: {
      imagens: true,
      historicos: {
        orderBy: { data_alteracao: 'desc' },
      },
    },
  });

  if (!denuncia) {
    throw httpError('Denúncia não encontrada', 404);
  }
  assegurarEscopo(denuncia, permitidas);

  return denuncia;
}

export function parseDenunciaId(idParam: string): number {
  const id = Number(idParam);

  if (!Number.isInteger(id) || id <= 0) {
    throw httpError('ID da denúncia inválido', 400);
  }

  return id;
}

export function validatePrioridadeInput(prioridade: unknown): NivelPrioridade {
  if (typeof prioridade !== 'string') {
    throw httpError('A prioridade deve ser um texto (string).', 400);
  }
  const prioridadeTratada = prioridade
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();

  if (!PRIORIDADES_VALIDAS.has(prioridadeTratada)) {
    throw httpError(
      `Prioridade inválida. Valores aceitos (independente de maiúsculas/acentos): Alta, Média, Baixa`,
      400
    );
  }

  return prioridadeTratada as NivelPrioridade;
}

export async function updateDenunciaPrioridade(
  usuarioId: number,
  denunciaId: number,
  novaPrioridade: NivelPrioridade,
  permitidas?: CategoriasPermitidas
) {
  const gestorId = await resolveGestorId(usuarioId);

  const denunciaExistente = await prisma.denuncia.findUnique({
    where: { id_denuncia: denunciaId },
  });

  if (!denunciaExistente) {
    throw httpError('Denúncia não encontrada', 404);
  }
  assegurarEscopo(denunciaExistente, permitidas);

  if (denunciaExistente.prioridade === novaPrioridade) {
    throw httpError('A denúncia já possui este nível de prioridade', 400);
  }

  return prisma.$transaction(async (tx) => {
    const denunciaAtualizada = await tx.denuncia.update({
      where: { id_denuncia: denunciaId },
      data: { prioridade: novaPrioridade },
      include: { imagens: true },
    });

    const historico = await tx.historico.create({
      data: {
        status: denunciaAtualizada.status,
        prioridade: novaPrioridade,
        denuncia_id: denunciaId,
        gestor_id: gestorId,
      },
    });

    return { denuncia: denunciaAtualizada, historico };
  });
}

// Feed visto por cidadãos: mostra o problema e o andamento, sem dados de quem registrou
// (e-mail e identificador do solicitante) e com coordenadas menos precisas.
export async function listFeedPublico(pagination: PaginationParams, filtros: DenunciaListFilters = {}) {
  const where = buildListWhere(filtros);

  const [total, data] = await Promise.all([
    prisma.denuncia.count({ where }),
    prisma.denuncia.findMany({
      where,
      orderBy: { data_registro: 'desc' },
      skip: pagination.skip,
      take: pagination.limit,
      select: {
        id_denuncia: true,
        titulo: true,
        categoria: true,
        regiao: true,
        descricao: true,
        status: true,
        prioridade: true,
        data_registro: true,
        endereco: true,
        imagens: true,
      },
    }),
  ]);

  const publicos = data.map((denuncia) => ({ ...denuncia, endereco: generalizarEndereco(denuncia.endereco) }));

  return buildPaginatedResult(publicos, total, pagination);
}
