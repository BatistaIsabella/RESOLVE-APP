import { describe, it, expect } from 'vitest';
import { parsePagination, buildPaginatedResult } from '../../utils/pagination';

// ─── O QUE É ISSO? ────────────────────────────────────────────────────────────
// Teste unitário: testa uma função isolada, sem banco de dados, sem servidor,
// sem nenhuma dependência externa. Só entra dado → a função processa → sai dado.
//
// describe() agrupa testes que testam a mesma coisa.
// it()       descreve um cenário específico (o "quando X, espero Y").
// expect()   faz a asserção — verifica se o resultado bate com o esperado.
// ─────────────────────────────────────────────────────────────────────────────

describe('parsePagination', () => {

  it('retorna page=1, limit=20 e skip=0 quando nenhum parâmetro é informado', () => {
    const resultado = parsePagination({});

    // toEqual compara objeto por objeto (deep equality)
    expect(resultado).toEqual({ page: 1, limit: 20, skip: 0 });
  });

  it('converte strings numéricas corretamente', () => {
    const resultado = parsePagination({ page: '3', limit: '10' });

    expect(resultado).toEqual({ page: 3, limit: 10, skip: 20 });
  });

  it('garante page mínima de 1 para page=0', () => {
    const resultado = parsePagination({ page: '0' });

    expect(resultado.page).toBe(1);
  });

  it('garante page mínima de 1 para page negativo', () => {
    const resultado = parsePagination({ page: '-5' });

    expect(resultado.page).toBe(1);
  });

  it('garante page mínima de 1 para page não-numérico', () => {
    const resultado = parsePagination({ page: 'abc' });

    expect(resultado.page).toBe(1);
  });

  it('garante limit máximo de 100 para valores acima do permitido', () => {
    const resultado = parsePagination({ limit: '999' });

    expect(resultado.limit).toBe(100);
  });

  it('trata limit=0 como não informado e usa o default de 20', () => {
    // 0 é falsy em JS: `Number('0') || 20` resulta em 20 (default), não em 1.
    // Comportamento intencional: 0 é inválido como limite de paginação.
    const resultado = parsePagination({ limit: '0' });

    expect(resultado.limit).toBe(20);
  });

  it('calcula skip corretamente: (page - 1) * limit', () => {
    // page=4, limit=5 → skip = (4-1) * 5 = 15
    const resultado = parsePagination({ page: '4', limit: '5' });

    expect(resultado.skip).toBe(15);
  });

  it('skip é 0 na primeira página', () => {
    const resultado = parsePagination({ page: '1', limit: '20' });

    expect(resultado.skip).toBe(0);
  });
});

describe('buildPaginatedResult', () => {

  it('monta o envelope de resposta com data e pagination corretos', () => {
    const dados = ['demanda-1', 'demanda-2'];
    const params = { page: 2, limit: 2, skip: 2 };

    const resultado = buildPaginatedResult(dados, 10, params);

    expect(resultado).toEqual({
      data: ['demanda-1', 'demanda-2'],
      pagination: {
        page: 2,
        limit: 2,
        total: 10,
        totalPages: 5,
      },
    });
  });

  it('arredonda totalPages para cima quando a divisão não é exata', () => {
    // 11 itens com limit 5 → 2.2 páginas → deve arredondar para 3
    const resultado = buildPaginatedResult([], 11, { page: 1, limit: 5, skip: 0 });

    expect(resultado.pagination.totalPages).toBe(3);
  });

  it('retorna totalPages=1 quando total é 0 (evita mostrar "0 páginas")', () => {
    const resultado = buildPaginatedResult([], 0, { page: 1, limit: 20, skip: 0 });

    expect(resultado.pagination.totalPages).toBe(1);
  });

  it('preserva o array de data exatamente como recebido', () => {
    const dados = [{ id: 1 }, { id: 2 }];
    const resultado = buildPaginatedResult(dados, 2, { page: 1, limit: 20, skip: 0 });

    expect(resultado.data).toBe(dados); // toBe verifica referência (mesmo objeto na memória)
  });
});
