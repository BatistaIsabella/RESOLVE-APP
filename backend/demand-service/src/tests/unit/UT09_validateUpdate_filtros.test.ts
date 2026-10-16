import { describe, it, expect, vi } from 'vitest';

// Validações puras da edição pelo cidadão e dos filtros de listagem (?q=, enums).
// Nenhuma delas toca no banco, mas o módulo importa prisma e redis no topo.

vi.mock('../../lib/prisma', () => ({
  prisma: {},
}));

vi.mock('../../config/redis', () => ({
  publishDenunciaStatusEvent: vi.fn(),
  getRedisPublisher: vi.fn(),
}));

import {
  validateUpdateDenunciaInput,
  parseListFilters,
  buildListWhere,
} from '../../services/denunciaService';

// ─── validateUpdateDenunciaInput ─────────────────────────────────────────────

describe('validateUpdateDenunciaInput', () => {

  it('aceita a edição de um único campo', () => {
    expect(validateUpdateDenunciaInput({ titulo: 'Novo título' })).toEqual({ titulo: 'Novo título' });
  });

  it('aceita todos os campos editáveis juntos', () => {
    const body = {
      titulo: 'Poste apagado',
      descricao: 'Desde ontem',
      categoria: 'ILUMINACAO_PUBLICA',
      regiao: 'AGRESTE',
      endereco: 'Rua A, 10',
    };
    expect(validateUpdateDenunciaInput(body)).toEqual(body);
  });

  it('rejeita body sem nenhum campo', () => {
    expect(() => validateUpdateDenunciaInput({})).toThrow('Informe ao menos um campo');
  });

  it.each(['status', 'prioridade', 'imagens', 'cidadao_id'])(
    'rejeita o campo não editável "%s"',
    (campo) => {
      expect(() => validateUpdateDenunciaInput({ titulo: 'Ok', [campo]: 'X' })).toThrow(
        /Campos não editáveis/
      );
    }
  );

  it('responde 400 nos erros de validação', () => {
    try {
      validateUpdateDenunciaInput({ status: 'RESOLVIDA' });
      expect.unreachable();
    } catch (err) {
      expect((err as { status: number }).status).toBe(400);
    }
  });

  it.each([
    ['titulo', ''],
    ['descricao', '   '],
    ['endereco', null],
  ])('rejeita %s vazio', (campo, valor) => {
    expect(() => validateUpdateDenunciaInput({ [campo]: valor })).toThrow(`${campo} não pode ser vazio`);
  });

  it('reaproveita a regra de tamanho do título da criação', () => {
    expect(() => validateUpdateDenunciaInput({ titulo: 'a'.repeat(51) })).toThrow(
      'titulo deve ser uma string com no máximo 50 caracteres'
    );
  });

  it('rejeita categoria fora do enum', () => {
    expect(() => validateUpdateDenunciaInput({ categoria: 'BURACO' })).toThrow('categoria inválida');
  });

  it('rejeita regiao fora do enum', () => {
    expect(() => validateUpdateDenunciaInput({ regiao: 'NORTE' })).toThrow('regiao inválida');
  });

  it('rejeita descricao que não é string', () => {
    expect(() => validateUpdateDenunciaInput({ descricao: 123 })).toThrow('descricao deve ser uma string');
  });
});

// ─── parseListFilters ────────────────────────────────────────────────────────

describe('parseListFilters', () => {

  it('retorna objeto vazio sem query', () => {
    expect(parseListFilters({})).toEqual({});
  });

  it('ignora page e limit (são da paginação)', () => {
    expect(parseListFilters({ page: '2', limit: '10' })).toEqual({});
  });

  it('apara espaços do q', () => {
    expect(parseListFilters({ q: '  poste  ' })).toEqual({ q: 'poste' });
  });

  it('ignora q vazio ou só com espaços', () => {
    expect(parseListFilters({ q: '   ' })).toEqual({});
  });

  it('rejeita q repetido (array)', () => {
    expect(() => parseListFilters({ q: ['a', 'b'] })).toThrow('q deve ser um texto');
  });

  it('rejeita q com mais de 100 caracteres', () => {
    expect(() => parseListFilters({ q: 'x'.repeat(101) })).toThrow('no máximo 100');
  });

  it('aceita os quatro enums e normaliza para maiúsculas', () => {
    expect(
      parseListFilters({
        categoria: 'saneamento',
        status: 'ABERTA',
        regiao: 'sertao',
        prioridade: 'Alta',
      })
    ).toEqual({ categoria: 'SANEAMENTO', status: 'ABERTA', regiao: 'SERTAO', prioridade: 'ALTA' });
  });

  it.each([
    ['categoria', 'BURACO'],
    ['status', 'FECHADA'],
    ['regiao', 'NORTE'],
    ['prioridade', 'URGENTE'],
  ])('rejeita %s inválido com 400', (campo, valor) => {
    try {
      parseListFilters({ [campo]: valor });
      expect.unreachable();
    } catch (err) {
      expect((err as Error).message).toContain(`${campo} inválido`);
      expect((err as { status: number }).status).toBe(400);
    }
  });

  it('ignora enum vazio (select "todos" no app)', () => {
    expect(parseListFilters({ status: '' })).toEqual({});
  });
});

// ─── buildListWhere ──────────────────────────────────────────────────────────

describe('buildListWhere', () => {

  it('sem filtros devolve where vazio', () => {
    expect(buildListWhere({})).toEqual({});
  });

  it('busca o q no título OU na descrição, sem diferenciar maiúsculas', () => {
    expect(buildListWhere({ q: 'poste' })).toEqual({
      OR: [
        { titulo: { contains: 'poste', mode: 'insensitive' } },
        { descricao: { contains: 'poste', mode: 'insensitive' } },
      ],
    });
  });

  it('combina q com os enums', () => {
    expect(buildListWhere({ q: 'lixo', status: 'ABERTA', regiao: 'AGRESTE' })).toEqual({
      OR: expect.any(Array),
      status: 'ABERTA',
      regiao: 'AGRESTE',
    });
  });
});
