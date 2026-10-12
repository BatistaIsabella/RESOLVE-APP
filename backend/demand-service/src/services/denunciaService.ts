import {
  Categorias,
  Regioes,
  StatusDenuncia,
  NivelPrioridade,
} from '@prisma/client';
import { prisma } from '../lib/prisma';
import { httpError } from '../utils/httpError';
import { buildPaginatedResult, PaginatedResult, PaginationParams } from '../utils/pagination';
import { publishDenunciaStatusEvent } from '../config/redis';

export interface CreateDenunciaInput {
  titulo: string;
  categoria: Categorias;
  regiao: Regioes;
  descricao: string;
  endereco: string;
  prioridade?: NivelPrioridade;
  imagens?: string[];
}

const CATEGORIAS_VALIDAS = new Set<string>(Object.values(Categorias));
const REGIOES_VALIDAS = new Set<string>(Object.values(Regioes));
const STATUS_VALIDOS = new Set<string>(Object.values(StatusDenuncia));
const PRIORIDADES_VALIDAS = new Set<string>(Object.values(NivelPrioridade));

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

  if (typeof titulo !== 'string' || titulo.length > 50) {
    throw httpError('titulo deve ser uma string com no máximo 50 caracteres', 400);
  }

  if (typeof categoria !== 'string' || !CATEGORIAS_VALIDAS.has(categoria)) {
    throw httpError('categoria inválida', 400);
  }

  if (typeof regiao !== 'string' || !REGIOES_VALIDAS.has(regiao)) {
    throw httpError('regiao inválida', 400);
  }

  if (typeof descricao !== 'string') {
    throw httpError('descricao deve ser uma string', 400);
  }

  if (typeof endereco !== 'string') {
    throw httpError('endereco deve ser uma string', 400);
  }

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
    imagens: Array.isArray(imagens) ? (imagens as string[]) : undefined,
  };
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
      email_solicitante: emailSolicitante ?? null,
      imagens: imagensData,
    },
    include: {
      imagens: true,
    },
  });
}

export async function listDenunciasByCidadao(
  usuarioId: number,
  pagination: PaginationParams
): Promise<PaginatedResult<Awaited<ReturnType<typeof prisma.denuncia.findMany>>[number]>> {
  const cidadaoId = await resolveCidadaoId(usuarioId);

  const where = { cidadao_id: cidadaoId };

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

export async function updateDenunciaStatus(
  usuarioId: number,
  denunciaId: number,
  novoStatus: StatusDenuncia
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

  if (denunciaExistente.status === novoStatus) {
    throw httpError('A denúncia já possui este status', 400);
  }

  const resultado = await prisma.$transaction(async (tx) => {
    const denunciaAtualizada = await tx.denuncia.update({
      where: { id_denuncia: denunciaId },
      data: { status: novoStatus },
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

export async function listAllDenuncias(pagination: PaginationParams) {
  const [total, data] = await Promise.all([
    prisma.denuncia.count(),
    prisma.denuncia.findMany({
      orderBy: { data_registro: 'desc' },
      skip: pagination.skip,
      take: pagination.limit,
      include: { imagens: true },
    }),
  ]);

  return buildPaginatedResult(data, total, pagination);
}

export async function getDenunciaByIdForGestor(denunciaId: number) {
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
  novaPrioridade: NivelPrioridade
) {
  console.log("=== INICIANDO UPDATE DE PRIORIDADE ===");
  console.log("-> ID do Usuário Recebido:", usuarioId);
  console.log("-> ID da Denúncia Recebido:", denunciaId);
  console.log("-> Nova Prioridade Recebida:", novaPrioridade);

  const gestorId = await resolveGestorId(usuarioId);
  console.log("-> ID do Gestor Resolvido no Banco:", gestorId);

  const denunciaExistente = await prisma.denuncia.findUnique({
    where: { id_denuncia: denunciaId },
  });

  console.log("-> Denúncia encontrada no banco?:", denunciaExistente ? "SIM" : "NÃO");
  
  if (denunciaExistente) {
    console.log("-> Prioridade ATUAL no banco:", denunciaExistente.prioridade);
  }

  if (!denunciaExistente) {
    throw httpError('Denúncia não encontrada', 404);
  }

  if (denunciaExistente.prioridade === novaPrioridade) {
    console.log("⚠️ Parando: A prioridade já é igual à nova!");
    throw httpError('A denúncia já possui este nível de prioridade', 400);
  }

  try {
    console.log("-> Tentando abrir a transação com o Supabase...");
    const resultado = await prisma.$transaction(async (tx) => {
      const denunciaAtualizada = await tx.denuncia.update({
        where: { id_denuncia: denunciaId },
        data: { prioridade: novaPrioridade },
      });

      console.log("-> [Prisma] Tabela denuncia atualizada com sucesso!");

      const historico = await tx.historico.create({
        data: {
          status: denunciaAtualizada.status,
          prioridade: novaPrioridade,
          denuncia_id: denunciaId,
          gestor_id: gestorId,
        },
      });

      console.log("-> [Prisma] Tabela historico criada com sucesso!");

      return { denuncia: denunciaAtualizada, historico };
    });

    console.log("=== UPDATE CONCLUÍDO COM SUCESSO COMFIRMADO PELO BANCO ===");
    return resultado;

  } catch (error: any) {
    console.error("❌ ERRO CAPTURADO DENTRO DA TRANSAÇÃO:", error);
    throw error;
  }
}