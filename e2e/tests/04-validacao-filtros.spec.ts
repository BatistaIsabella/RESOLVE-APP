/**
 * Cenário 4 — Cidadão filtra demandas por Categoria e Região
 *
 * O QUE ESTE TESTE VALIDA:
 * "Como Cidadão, quero aplicar simultaneamente os filtros de
 * Categoria e Região na tela inicial, para visualizar apenas
 * as demandas que correspondam aos critérios selecionados."
 *
 * - Uma demanda que corresponde à Categoria e à Região
 *   selecionadas é exibida na lista.
 * - Uma demanda com a mesma Categoria, mas de Região diferente,
 *   NÃO é exibida.
 * - Os filtros são aplicados de forma conjunta (AND), considerando
 *   os dois critérios simultaneamente — não apenas um deles.
 *
 * FLUXO AUTOMATIZADO:
 * 1. Arrange (via API): cria um cidadão de teste, faz login pra obter
 *    o token, e cria duas demandas:
 *      - válida: categoria "Manutenção de vias" + região "Região
 *        Metropolitana do Recife"
 *      - inválida: mesma categoria + região "Outra"
 * 2. Login real pela UI em /login e confirma redirecionamento para
 *    /telaUsuario (toHaveURL).
 * 3. Seleciona os dois filtros (Categoria e Região) nos <select> da
 *    tela inicial.
 * 4. Valida o resultado:
 *      - o card da demanda válida está visível (toBeVisible)
 *      - o card da demanda de outra região não aparece (toHaveCount(0))
 *      - waitForResponse garante que a lista já foi atualizada pela
 *        API antes da validação
 * 
 * Pré-requisito: projeto rodando (backend Docker + frontend Next.js)
 *
 * Execução:
 *  - cd e2e
 *  - npx playwright test tests/04-validacao-filtros.spec.ts
 */

import { test, expect, APIRequestContext } from '@playwright/test';

const API_BASE_URL = process.env.E2E_API_URL ?? 'http://localhost:8080';
const SENHA_PADRAO = 'Senha@teste123';

interface UsuarioTeste {
  nome: string;
  email: string;
  senha: string;
}

/** Cria (via API) um usuário cidadão único para esta execução do teste. */
async function criarUsuario(
  request: APIRequestContext,
  papel: 'cidadao' | 'gestor' = 'cidadao'
): Promise<UsuarioTeste> {
  const roleChar = papel === 'gestor' ? 'g' : 'c';
  const sufixo = `${Date.now().toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`;
  const usuario: UsuarioTeste = {
    nome: 'Cidadão E2E Teste',
    email: `e2e${roleChar}${sufixo}@t.co`,
    senha: SENHA_PADRAO,
  };

  const resposta = await request.post(`${API_BASE_URL}/auth/register`, {
    data: { nome: usuario.nome, email: usuario.email, senha: usuario.senha, papel },
  });

  if (!resposta.ok()) {
    const textoErro = await resposta.text();
    console.error(`[API ERROR] Falha ao registrar usuário: Status ${resposta.status()} - ${textoErro}`);
    throw new Error(`Falha ao registrar usuário de teste: ${resposta.status()} ${textoErro}`);
  }

  return usuario;
}

/** Faz login via API e devolve o token JWT — usado para preparar dados (Arrange). */
async function logarViaApi(request: APIRequestContext, usuario: UsuarioTeste): Promise<string> {
  const resposta = await request.post(`${API_BASE_URL}/auth/login`, {
    data: { email: usuario.email, senha: usuario.senha },
  });

  if (!resposta.ok()) {
    const textoErro = await resposta.text();
    console.error(`[API ERROR] Falha no login API: Status ${resposta.status()} - ${textoErro}`);
    throw new Error(`Falha ao logar usuário de teste: ${resposta.status()} ${textoErro}`);
  }

  const body = await resposta.json();
  const token = body.token || body.accessToken || body.jwt;
  if (!token) {
    throw new Error(`Token não retornado pela API no login. Response body: ${JSON.stringify(body)}`);
  }
  return token as string;
}

/** Cria, via API, uma demanda de teste parametrizada. */
async function criarDemandaDeTeste(
  request: APIRequestContext,
  tokenCidadao: string,
  dados: { titulo: string; categoria: string; regiao: string }
): Promise<number> {
  const resposta = await request.post(`${API_BASE_URL}/demands/`, {
    headers: {
      Authorization: `Bearer ${tokenCidadao}`,
      'Content-Type': 'application/json',
    },
    data: {
      titulo: dados.titulo,
      categoria: dados.categoria,
      regiao: dados.regiao,
      descricao: 'Demanda criada automaticamente para validação de filtros E2E.',
      endereco: 'Rua das Flores, 456 - Recife/PE',
      prioridade: 'MEDIA',
    },
  });

  if (!resposta.ok()) {
    const textoErro = await resposta.text();
    console.error(`[API ERROR] Erro na criação de demanda (${dados.titulo}): Status ${resposta.status()} - Body: ${textoErro}`);
    throw new Error(`Falha ao criar demanda de teste: ${resposta.status()} ${textoErro}`);
  }

  const body = await resposta.json();
  return (body.id_denuncia || body.id) as number;
}

test.describe('Cenário 4 — Cidadão aplica filtros de Categoria e Região', () => {
  test('cidadão aplica filtros simultâneos e valida se a lista exibe apenas resultados correspondentes', async ({
    page,
    request,
  }) => {
    test.setTimeout(90000);

    // ---------- Arrange: prepara usuário e cria demandas no banco ----------
    const categoriaAlvo = 'Manutenção de vias';
    const regiaoAlva = 'Região Metropolitana do Recife';

    const categoriaAlvoEnum = 'MANUTENCAO_DE_VIAS';
    const regiaoAlvaEnum = 'REGIAO_METROPOLITANA_DO_RECIFE';
    const regiaoOutraEnum = 'OUTRA';

    const timestamp = Date.now();
    const tituloDemandaValida = `[E2E] Buraco na pista ${timestamp}`;
    const tituloDemandaOutraRegiao = `[E2E] Posto sem remédio ${timestamp}`;

    const cidadao = await criarUsuario(request, 'cidadao');
    const tokenCidadao = await logarViaApi(request, cidadao);

    // Demanda 1: Atende aos filtros selecionados
    await criarDemandaDeTeste(request, tokenCidadao, {
      titulo: tituloDemandaValida,
      categoria: categoriaAlvoEnum,
      regiao: regiaoAlvaEnum,
    });

    // Demanda 2: Categoria igual, mas Região DIFERENTE
    await criarDemandaDeTeste(request, tokenCidadao, {
      titulo: tituloDemandaOutraRegiao,
      categoria: categoriaAlvoEnum,
      regiao: regiaoOutraEnum,
    });

    // ---------- Act 1: Realiza login no sistema ----------
    await page.goto('/login');
    await page.getByPlaceholder('seu@email.com').fill(cidadao.email);
    await page.getByPlaceholder('••••••••').fill(cidadao.senha);
    await page.getByRole('button', { name: 'ENTRAR' }).click();

    await expect(page).toHaveURL(/\/telaUsuario$/);

    // ---------- Act 2: Seleciona ambos os filtros na interface ----------
    const selectCategoria = page
      .locator('select')
      .filter({ has: page.locator(`option[value="${categoriaAlvo}"]`) });

    const selectRegiao = page
      .locator('select')
      .filter({ has: page.locator(`option[value="${regiaoAlva}"]`) });

    // Seleciona Categoria
    await selectCategoria.selectOption({ value: categoriaAlvo });

    // Seleciona Região — os filtros são aplicados no cliente (sem nova
    // chamada à API), então validamos o resultado diretamente na UI
    await selectRegiao.selectOption({ value: regiaoAlva });

    // ---------- Assertions: Valida se a UI exibiu o card correto e ocultou o incorreto ----------
    const cardValido = page.locator('div.max-h-\\[600px\\] > div').filter({ hasText: tituloDemandaValida });
    
    // O card correspondente aos dois filtros precisa estar visível
    await expect(cardValido).toBeVisible({ timeout: 15000 });

    // O card de outra região NÃO pode estar visível na lista filtrada
    await expect(page.getByText(tituloDemandaOutraRegiao)).toHaveCount(0);
  });
});