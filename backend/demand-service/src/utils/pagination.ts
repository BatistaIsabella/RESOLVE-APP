export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

// Converte o valor da query para inteiro. Decimais são truncados (o Prisma só
// aceita inteiros em skip/take); NaN, Infinity e 0 caem no valor padrão.
function toInteger(value: unknown, fallback: number): number {
  const parsed = Math.trunc(Number(value));
  return Number.isFinite(parsed) && parsed !== 0 ? parsed : fallback;
}

export function parsePagination(query: Record<string, unknown>): PaginationParams {
  const limit = Math.min(MAX_LIMIT, Math.max(1, toInteger(query.limit, DEFAULT_LIMIT)));
  // Limita a página para que o offset continue sendo um inteiro seguro.
  const maxPage = Math.floor(Number.MAX_SAFE_INTEGER / limit);
  const page = Math.min(maxPage, Math.max(1, toInteger(query.page, DEFAULT_PAGE)));
  return { page, limit, skip: (page - 1) * limit };
}

export function buildPaginatedResult<T>(
  data: T[],
  total: number,
  params: PaginationParams
): PaginatedResult<T> {
  return {
    data,
    pagination: {
      page: params.page,
      limit: params.limit,
      total,
      totalPages: Math.ceil(total / params.limit) || 1,
    },
  };
}
