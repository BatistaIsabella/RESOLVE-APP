import { describe, it, expect, vi } from 'vitest';

// ─── POR QUE MOCKAR? ─────────────────────────────────────────────────────────
// denunciaService.ts importa `prisma` (PrismaClient) e `redis` no topo do
// arquivo. Mesmo que as funções que vamos testar não usem banco de dados,
// o simples fato de importar o módulo faria o Node tentar instanciar o cliente
// do Postgres — o que quebraria em ambiente sem banco.
//
// vi.mock() substitui um módulo inteiro por um objeto falso controlado por nós.
// O Vitest "eleva" (hoists) essas chamadas automaticamente para o topo do
// arquivo, antes de qualquer import — por isso elas ficam antes dos imports
// reais, mas funcionam corretamente.
// ─────────────────────────────────────────────────────────────────────────────

vi.mock('../../lib/prisma', () => ({
  prisma: {},
}));

vi.mock('../../config/redis', () => ({
  publishDenunciaStatusEvent: vi.fn(),
}));

import {
  parseDenunciaId,
  validateStatusInput,
  validatePrioridadeInput,
  validateCreateDenunciaInput,
} from '../../services/denunciaService';

// ─── parseDenunciaId ─────────────────────────────────────────────────────────

describe('parseDenunciaId', () => {

  it('converte uma string numérica válida para número inteiro', () => {
    expect(parseDenunciaId('42')).toBe(42);
  });

  it('aceita ID igual a 1 (menor válido)', () => {
    expect(parseDenunciaId('1')).toBe(1);
  });

  it('lança erro 400 para ID zero', () => {
    // expect(...).toThrow verifica que a função lança uma exceção.
    // Usamos uma arrow function para que o expect possa capturá-la.
    expect(() => parseDenunciaId('0')).toThrow();
    expect(() => parseDenunciaId('0')).toThrowError(
      expect.objectContaining({ status: 400 })
    );
  });

  it('lança erro 400 para ID negativo', () => {
    expect(() => parseDenunciaId('-1')).toThrowError(
      expect.objectContaining({ status: 400 })
    );
  });

  it('lança erro 400 para string não-numérica', () => {
    expect(() => parseDenunciaId('abc')).toThrowError(
      expect.objectContaining({ status: 400 })
    );
  });

  it('lança erro 400 para decimal (não é inteiro)', () => {
    expect(() => parseDenunciaId('1.5')).toThrowError(
      expect.objectContaining({ status: 400 })
    );
  });
});

// ─── validateStatusInput ─────────────────────────────────────────────────────

describe('validateStatusInput', () => {

  it('retorna "ABERTA" quando o status é válido', () => {
    expect(validateStatusInput('ABERTA')).toBe('ABERTA');
  });

  it('retorna "EM_ANALISE" quando o status é válido', () => {
    expect(validateStatusInput('EM_ANALISE')).toBe('EM_ANALISE');
  });

  it('retorna "RESOLVIDA" quando o status é válido', () => {
    expect(validateStatusInput('RESOLVIDA')).toBe('RESOLVIDA');
  });

  it('lança erro 400 para status inexistente', () => {
    expect(() => validateStatusInput('CANCELADA')).toThrowError(
      expect.objectContaining({ status: 400 })
    );
  });

  it('lança erro 400 para status em minúsculas (enum é case-sensitive)', () => {
    expect(() => validateStatusInput('aberta')).toThrowError(
      expect.objectContaining({ status: 400 })
    );
  });

  it('lança erro 400 para número', () => {
    expect(() => validateStatusInput(1)).toThrowError(
      expect.objectContaining({ status: 400 })
    );
  });

  it('lança erro 400 para null', () => {
    expect(() => validateStatusInput(null)).toThrowError(
      expect.objectContaining({ status: 400 })
    );
  });
});

// ─── validatePrioridadeInput ──────────────────────────────────────────────────

describe('validatePrioridadeInput', () => {

  it('retorna "ALTA" para a string exata', () => {
    expect(validatePrioridadeInput('ALTA')).toBe('ALTA');
  });

  it('retorna "MEDIA" para a string exata', () => {
    expect(validatePrioridadeInput('MEDIA')).toBe('MEDIA');
  });

  it('retorna "BAIXA" para a string exata', () => {
    expect(validatePrioridadeInput('BAIXA')).toBe('BAIXA');
  });

  it('aceita "Alta" em mixed case (normaliza internamente)', () => {
    expect(validatePrioridadeInput('Alta')).toBe('ALTA');
  });

  it('aceita "Média" com acento (normaliza e remove acento)', () => {
    expect(validatePrioridadeInput('Média')).toBe('MEDIA');
  });

  it('aceita "baixa" em minúsculas', () => {
    expect(validatePrioridadeInput('baixa')).toBe('BAIXA');
  });

  it('lança erro 400 para string inválida', () => {
    expect(() => validatePrioridadeInput('CRITICA')).toThrowError(
      expect.objectContaining({ status: 400 })
    );
  });

  it('lança erro 400 para número (tipo errado)', () => {
    expect(() => validatePrioridadeInput(3)).toThrowError(
      expect.objectContaining({ status: 400 })
    );
  });
});

// ─── validateCreateDenunciaInput ─────────────────────────────────────────────

// Input completo e válido reutilizado nos testes
const inputValido = {
  titulo: 'Poste sem luz',
  categoria: 'ILUMINACAO_PUBLICA',
  regiao: 'REGIAO_METROPOLITANA_DO_RECIFE',
  descricao: 'Poste apagado há 3 dias.',
  endereco: 'Av. Boa Viagem, 45 - Recife',
};

describe('validateCreateDenunciaInput', () => {

  it('retorna o input quando todos os campos obrigatórios estão presentes', () => {
    const resultado = validateCreateDenunciaInput(inputValido);

    expect(resultado.titulo).toBe('Poste sem luz');
    expect(resultado.categoria).toBe('ILUMINACAO_PUBLICA');
    expect(resultado.regiao).toBe('REGIAO_METROPOLITANA_DO_RECIFE');
  });

  it('aplica prioridade undefined quando não informada', () => {
    const resultado = validateCreateDenunciaInput(inputValido);

    expect(resultado.prioridade).toBeUndefined();
  });

  it('aceita prioridade válida quando informada', () => {
    const resultado = validateCreateDenunciaInput({ ...inputValido, prioridade: 'ALTA' });

    expect(resultado.prioridade).toBe('ALTA');
  });

  it('aceita imagens válidas em base64', () => {
    const fotos = [
      `data:image/jpeg;base64,${Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0x10]).toString('base64')}`,
      `data:image/png;base64,${Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).toString('base64')}`,
    ];

    const resultado = validateCreateDenunciaInput({ ...inputValido, imagens: fotos });

    expect(resultado.imagens).toEqual(fotos);
  });

  it('recusa imagens que não são data URI de imagem', () => {
    expect(() => validateCreateDenunciaInput({ ...inputValido, imagens: ['foto1.jpg'] })).toThrowError(
      expect.objectContaining({ status: 400 })
    );
  });

  it('lança erro 400 quando titulo está ausente', () => {
    const { titulo, ...semTitulo } = inputValido;
    expect(() => validateCreateDenunciaInput(semTitulo)).toThrowError(
      expect.objectContaining({ status: 400 })
    );
  });

  it('lança erro 400 quando categoria está ausente', () => {
    const { categoria, ...semCategoria } = inputValido;
    expect(() => validateCreateDenunciaInput(semCategoria)).toThrowError(
      expect.objectContaining({ status: 400 })
    );
  });

  it('lança erro 400 quando regiao está ausente', () => {
    const { regiao, ...semRegiao } = inputValido;
    expect(() => validateCreateDenunciaInput(semRegiao)).toThrowError(
      expect.objectContaining({ status: 400 })
    );
  });

  it('lança erro 400 quando descricao está ausente', () => {
    const { descricao, ...semDescricao } = inputValido;
    expect(() => validateCreateDenunciaInput(semDescricao)).toThrowError(
      expect.objectContaining({ status: 400 })
    );
  });

  it('lança erro 400 quando endereco está ausente', () => {
    const { endereco, ...semEndereco } = inputValido;
    expect(() => validateCreateDenunciaInput(semEndereco)).toThrowError(
      expect.objectContaining({ status: 400 })
    );
  });

  it('lança erro 400 quando titulo ultrapassa 50 caracteres', () => {
    const tituloLongo = 'A'.repeat(51);
    expect(() =>
      validateCreateDenunciaInput({ ...inputValido, titulo: tituloLongo })
    ).toThrowError(expect.objectContaining({ status: 400 }));
  });

  it('aceita titulo com exatamente 50 caracteres (limite)', () => {
    const tituloNolimite = 'A'.repeat(50);
    expect(() =>
      validateCreateDenunciaInput({ ...inputValido, titulo: tituloNolimite })
    ).not.toThrow();
  });

  it('lança erro 400 para categoria inválida', () => {
    expect(() =>
      validateCreateDenunciaInput({ ...inputValido, categoria: 'CATEGORIA_INEXISTENTE' })
    ).toThrowError(expect.objectContaining({ status: 400 }));
  });

  it('lança erro 400 para regiao inválida', () => {
    expect(() =>
      validateCreateDenunciaInput({ ...inputValido, regiao: 'REGIAO_INVALIDA' })
    ).toThrowError(expect.objectContaining({ status: 400 }));
  });

  it('lança erro 400 para prioridade inválida quando informada', () => {
    expect(() =>
      validateCreateDenunciaInput({ ...inputValido, prioridade: 'URGENTE' })
    ).toThrowError(expect.objectContaining({ status: 400 }));
  });
});
