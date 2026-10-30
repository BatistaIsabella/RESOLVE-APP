import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── NÍVEL 2: FUNÇÕES COM DEPENDÊNCIAS ────────────────────────────────────────
//
// O desafio aqui: as funções que vamos testar chamam o banco de dados (Prisma)
// internamente. Não queremos — e não podemos — conectar ao banco num teste
// unitário. A solução é o MOCK: substituímos o módulo inteiro do Prisma por
// um objeto com vi.fn() no lugar de cada método.
//
// vi.fn() cria uma função falsa que:
//   - Não faz nada por padrão (retorna undefined)
//   - Registra cada chamada (quem chamou, com quais argumentos)
//   - Aceita que você defina o que ela vai retornar em cada teste
//
// ─────────────────────────────────────────────────────────────────────────────

vi.mock('../../lib/prisma', () => ({
  prisma: {
    cidadao:  { upsert: vi.fn() },
    denuncia: {
      create:    vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      count:     vi.fn(),
      findMany:  vi.fn(),
    },
  },
}));

vi.mock('../../config/redis', () => ({
  publishDenunciaStatusEvent: vi.fn(),
}));

import { prisma } from '../../lib/prisma';
import {
  createDenuncia,
  getDenunciaById,
  getDenunciaByIdForGestor,
  listDenunciasByCidadao,
} from '../../services/denunciaService';

// Alias para chamar .mockResolvedValue() sem brigar com os tipos do Prisma.
// Em runtime esse objeto é o mock que definimos acima — o cast só serve
// para o TypeScript não reclamar.
const db = prisma as any;

// ─── DADOS COMPARTILHADOS ─────────────────────────────────────────────────────

const USUARIO_ID = 99;
const CIDADAO_ID = 10;

const mockCidadao = { id_cidadao: CIDADAO_ID, usuario_id: USUARIO_ID };

const mockDenuncia = {
  id_denuncia: 1,
  titulo: 'Poste sem luz',
  categoria: 'ILUMINACAO_PUBLICA',
  regiao: 'REGIAO_METROPOLITANA_DO_RECIFE',
  descricao: 'Poste apagado há 3 dias.',
  endereco: 'Av. Boa Viagem, 45',
  status: 'ABERTA',
  prioridade: 'MEDIA',
  data_registro: new Date('2026-01-01'),
  cidadao_id: CIDADAO_ID,
  email_solicitante: null,
  imagens: [],
  historicos: [],
};

const inputBase = {
  titulo: 'Poste sem luz',
  categoria: 'ILUMINACAO_PUBLICA' as const,
  regiao: 'REGIAO_METROPOLITANA_DO_RECIFE' as const,
  descricao: 'Poste apagado há 3 dias.',
  endereco: 'Av. Boa Viagem, 45',
};

// ─── createDenuncia ───────────────────────────────────────────────────────────

describe('createDenuncia', () => {

  // beforeEach executa antes de CADA it() do describe.
  // vi.clearAllMocks() zera o histórico de chamadas e os retornos configurados,
  // garantindo que um teste não "vaza" comportamento para o próximo.
  beforeEach(() => {
    vi.clearAllMocks();
    // mockResolvedValue define o que a função async vai retornar.
    // É como dizer: "quando alguém chamar cidadao.upsert(), finja que o banco
    // respondeu com este objeto."
    db.cidadao.upsert.mockResolvedValue(mockCidadao);
    db.denuncia.create.mockResolvedValue(mockDenuncia);
  });

  it('retorna a denúncia criada no caminho feliz', async () => {
    const resultado = await createDenuncia(USUARIO_ID, inputBase);

    // toEqual faz comparação profunda (deep equality)
    expect(resultado).toEqual(mockDenuncia);
  });

  it('primeiro resolve o cidadão via upsert com o usuarioId correto', async () => {
    await createDenuncia(USUARIO_ID, inputBase);

    // toHaveBeenCalledWith verifica com quais argumentos o mock foi chamado.
    // expect.objectContaining() faz um match parcial: verifica só os campos
    // informados, ignora o resto — útil quando o objeto tem muitos campos.
    expect(db.cidadao.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where:  { usuario_id: USUARIO_ID },
        create: { usuario_id: USUARIO_ID },
      })
    );
  });

  it('usa prioridade MEDIA quando não informada', async () => {
    await createDenuncia(USUARIO_ID, inputBase); // inputBase não tem prioridade

    expect(db.denuncia.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ prioridade: 'MEDIA' }),
      })
    );
  });

  it('usa a prioridade informada quando fornecida', async () => {
    await createDenuncia(USUARIO_ID, { ...inputBase, prioridade: 'ALTA' });

    expect(db.denuncia.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ prioridade: 'ALTA' }),
      })
    );
  });

  it('define status ABERTA independente do input', async () => {
    await createDenuncia(USUARIO_ID, inputBase);

    expect(db.denuncia.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'ABERTA' }),
      })
    );
  });

  it('associa a denúncia ao cidadão resolvido pelo upsert', async () => {
    await createDenuncia(USUARIO_ID, inputBase);

    expect(db.denuncia.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ cidadao_id: CIDADAO_ID }),
      })
    );
  });

  it('passa emailSolicitante quando fornecido', async () => {
    await createDenuncia(USUARIO_ID, inputBase, 'cidadao@test.com');

    expect(db.denuncia.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ email_solicitante_cifrado: expect.stringMatching(/^enc:v1:/) }),
      })
    );
  });

  it('passa null em email_solicitante quando omitido', async () => {
    await createDenuncia(USUARIO_ID, inputBase);

    expect(db.denuncia.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ email_solicitante_cifrado: null }),
      })
    );
  });

  it('inclui imagens no create quando fornecidas', async () => {
    const inputComImagens = { ...inputBase, imagens: ['foto1.jpg', 'foto2.jpg'] };
    await createDenuncia(USUARIO_ID, inputComImagens);

    expect(db.denuncia.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          imagens: {
            create: [
              { caminho_file: 'foto1.jpg' },
              { caminho_file: 'foto2.jpg' },
            ],
          },
        }),
      })
    );
  });

  it('não inclui imagens no create quando array vazio', async () => {
    const inputSemImagens = { ...inputBase, imagens: [] };
    await createDenuncia(USUARIO_ID, inputSemImagens);

    expect(db.denuncia.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ imagens: undefined }),
      })
    );
  });
});

// ─── getDenunciaById ──────────────────────────────────────────────────────────

describe('getDenunciaById', () => {

  beforeEach(() => {
    vi.clearAllMocks();
    db.cidadao.upsert.mockResolvedValue(mockCidadao);
  });

  it('retorna a denúncia quando encontrada', async () => {
    db.denuncia.findFirst.mockResolvedValue(mockDenuncia);

    const resultado = await getDenunciaById(USUARIO_ID, 1);

    expect(resultado).toEqual(mockDenuncia);
  });

  it('busca apenas demandas do próprio cidadão (cidadao_id correto)', async () => {
    db.denuncia.findFirst.mockResolvedValue(mockDenuncia);

    await getDenunciaById(USUARIO_ID, 1);

    expect(db.denuncia.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ cidadao_id: CIDADAO_ID }),
      })
    );
  });

  it('lança erro 404 quando o banco retorna null (não encontrada)', async () => {
    // mockResolvedValue(null) simula "banco não achou o registro"
    db.denuncia.findFirst.mockResolvedValue(null);

    // rejects.toThrowError é o equivalente de toThrowError para Promises.
    // Precisa do await porque a rejeição é assíncrona.
    await expect(getDenunciaById(USUARIO_ID, 999)).rejects.toThrowError(
      expect.objectContaining({ status: 404 })
    );
  });

  it('a mensagem do 404 menciona "Denúncia não encontrada"', async () => {
    db.denuncia.findFirst.mockResolvedValue(null);

    await expect(getDenunciaById(USUARIO_ID, 999)).rejects.toThrowError(
      /Denúncia não encontrada/i
    );
  });
});

// ─── getDenunciaByIdForGestor ─────────────────────────────────────────────────

describe('getDenunciaByIdForGestor', () => {

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retorna a denúncia quando encontrada', async () => {
    db.denuncia.findUnique.mockResolvedValue(mockDenuncia);

    const resultado = await getDenunciaByIdForGestor(1);

    expect(resultado).toEqual(mockDenuncia);
  });

  it('busca pelo id_denuncia correto', async () => {
    db.denuncia.findUnique.mockResolvedValue(mockDenuncia);

    await getDenunciaByIdForGestor(42);

    expect(db.denuncia.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id_denuncia: 42 },
      })
    );
  });

  it('lança erro 404 quando o banco retorna null', async () => {
    db.denuncia.findUnique.mockResolvedValue(null);

    await expect(getDenunciaByIdForGestor(999)).rejects.toThrowError(
      expect.objectContaining({ status: 404 })
    );
  });

  it('não filtra por cidadão (gestor vê qualquer denúncia)', async () => {
    db.denuncia.findUnique.mockResolvedValue(mockDenuncia);

    await getDenunciaByIdForGestor(1);

    // Gestor não tem restrição de cidadao_id na query — confirma que
    // o where não carrega esse campo
    expect(db.denuncia.findUnique).not.toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ cidadao_id: expect.anything() }),
      })
    );
  });
});

// ─── listDenunciasByCidadao ───────────────────────────────────────────────────

describe('listDenunciasByCidadao', () => {

  const paginacao = { page: 1, limit: 20, skip: 0 };

  beforeEach(() => {
    vi.clearAllMocks();
    db.cidadao.upsert.mockResolvedValue(mockCidadao);
    db.denuncia.count.mockResolvedValue(3);
    db.denuncia.findMany.mockResolvedValue([mockDenuncia]);
  });

  it('retorna o envelope paginado com data e pagination', async () => {
    const resultado = await listDenunciasByCidadao(USUARIO_ID, paginacao);

    expect(resultado).toHaveProperty('data');
    expect(resultado).toHaveProperty('pagination');
  });

  it('calcula totalPages corretamente com base no count do banco', async () => {
    db.denuncia.count.mockResolvedValue(50);
    db.denuncia.findMany.mockResolvedValue([]);

    const resultado = await listDenunciasByCidadao(USUARIO_ID, { page: 1, limit: 20, skip: 0 });

    expect(resultado.pagination.total).toBe(50);
    expect(resultado.pagination.totalPages).toBe(3); // Math.ceil(50/20) = 3
  });

  it('dispara count e findMany em paralelo (Promise.all)', async () => {
    await listDenunciasByCidadao(USUARIO_ID, paginacao);

    // Confirma que ambas as queries foram chamadas — sem isso o Promise.all
    // não teria utilidade
    expect(db.denuncia.count).toHaveBeenCalledOnce();
    expect(db.denuncia.findMany).toHaveBeenCalledOnce();
  });

  it('filtra apenas demandas do próprio cidadão', async () => {
    await listDenunciasByCidadao(USUARIO_ID, paginacao);

    expect(db.denuncia.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { cidadao_id: CIDADAO_ID },
      })
    );
  });
});
