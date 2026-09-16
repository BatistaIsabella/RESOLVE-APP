/**
 * Cenário 3 — Cidadão usa a busca global por palavra-chave
 *
 * "Como Cidadão, utilizo o campo de busca global digitando uma
 * palavra-chave para verificar se a lista exibe apenas as solicitações
 * que contêm o termo pesquisado."
 *
 * ⚠️ ATENÇÃO PRO GRUPO — feature ainda não implementada:
 * Hoje (checar frontend/src/app/(public)/telaUsuario/page.tsx) a seção
 * "FILTROS DE BUSCA" só tem dropdowns de Status/Categoria/Região/Prioridade
 * — não existe nenhum campo de texto livre pra buscar por palavra-chave no
 * título/descrição das demandas. Esse teste documenta o comportamento
 * esperado (spec), assumindo que a implementação vai adicionar um campo de
 * busca com `placeholder="Buscar por palavra-chave..."` dentro dessa
 * mesma seção de filtros. Ele está marcado com `test.fail()` — ou seja,
 * HOJE ele falha (elemento não encontrado) e isso é esperado; o Playwright
 * reporta esse resultado como "expected fail" (passa a suíte). Quando
 * alguém implementar a busca, ajuste o seletor abaixo se o placeholder
 * ficar diferente, remova o `test.fail()` e o teste passa a validar a
 * feature de verdade — se ele começar a passar sem remover o
 * `test.fail()`, o Playwright avisa como "unexpected pass", sinalizando
 * que está na hora de promover o teste.
 *
 * Fluxo automatizado (assumindo a busca implementada):
 *   1. Cria um cidadão de teste via API.
 *   2. Cria, via API, duas demandas do cidadão com títulos únicos: uma
 *      contendo a palavra-chave do teste, outra sem ela.
 *   3. Faz login real pela interface e vai pra listagem (/telaUsuario).
 *   4. Digita a palavra-chave no campo de busca global.
 *   5. Confirma que só o card da demanda que contém o termo pesquisado
 *      continua visível, e que o card da demanda sem o termo desaparece.
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
async function criarUsuario(request: APIRequestContext): Promise<UsuarioTeste> {
  // e-mail precisa caber em VarChar(35) no banco (ver auth-service/prisma/schema.prisma).
  const sufixo = `${Date.now().toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`;
  const usuario: UsuarioTeste = {
    nome: 'Cidadão E2E Teste',
    email: `e2ec3${sufixo}@t.co`,
    senha: SENHA_PADRAO,
  };

  const resposta = await request.post(`${API_BASE_URL}/auth/register`, {
    data: { nome: usuario.nome, email: usuario.email, senha: usuario.senha, papel: 'cidadao' },
  });

  if (!resposta.ok()) {
    throw new Error(
      `Falha ao registrar usuário de teste: ${resposta.status()} ${await resposta.text()}`
    );
  }

  return usuario;
}

/** Faz login via API e devolve o token JWT — usado só para preparar dados. */
async function logarViaApi(request: APIRequestContext, usuario: UsuarioTeste): Promise<string> {
  const resposta = await request.post(`${API_BASE_URL}/auth/login`, {
    data: { email: usuario.email, senha: usuario.senha },
  });

  if (!resposta.ok()) {
    throw new Error(`Falha ao logar usuário de teste: ${resposta.status()} ${await resposta.text()}`);
  }

  const body = await resposta.json();
  return body.token as string;
}

/** Cria, via API, uma demanda de teste com um título conhecido. */
async function criarDemandaDeTeste(
  request: APIRequestContext,
  tokenCidadao: string,
  titulo: string
): Promise<void> {
  const resposta = await request.post(`${API_BASE_URL}/demands/`, {
    headers: { Authorization: `Bearer ${tokenCidadao}` },
    data: {
      titulo,
      categoria: 'MANUTENCAO_DE_VIAS',
      regiao: 'REGIAO_METROPOLITANA_DO_RECIFE',
      descricao: `Demanda criada automaticamente pelo teste E2E do Cenário 3 (${titulo}).`,
      endereco: 'Rua de Teste, 123 - Recife/PE',
      prioridade: 'MEDIA',
    },
  });

  if (!resposta.ok()) {
    throw new Error(`Falha ao criar demanda de teste: ${resposta.status()} ${await resposta.text()}`);
  }
}

test.describe('Cenário 3 — busca global por palavra-chave', () => {
  // Feature ainda não implementada no frontend — ver nota no topo do arquivo.
  test.fail();

  test('lista só as demandas cujo título/descrição contêm o termo pesquisado', async ({
    page,
    request,
  }) => {
    // ---------- Arrange: duas demandas, só uma com a palavra-chave ----------
    const palavraChave = `Vazamento${Date.now()}`;
    const tituloComTermo = `[E2E] ${palavraChave} na Rua das Flores`;
    const tituloSemTermo = `[E2E] Poste com lâmpada apagada ${Date.now()}`;

    const cidadao = await criarUsuario(request);
    const token = await logarViaApi(request, cidadao);
    await criarDemandaDeTeste(request, token, tituloComTermo);
    await criarDemandaDeTeste(request, token, tituloSemTermo);

    // ---------- Act 1: login real pela interface ----------
    await page.goto('/login');
    await page.getByPlaceholder('seu@email.com').fill(cidadao.email);
    await page.getByPlaceholder('••••••••').fill(cidadao.senha);
    await page.getByRole('button', { name: 'ENTRAR' }).click();

    await expect(page).toHaveURL(/\/telaUsuario/);

    const cardComTermo = page
      .locator('div.border.border-gray-200.rounded-lg.p-4')
      .filter({ hasText: tituloComTermo });
    const cardSemTermo = page
      .locator('div.border.border-gray-200.rounded-lg.p-4')
      .filter({ hasText: tituloSemTermo });

    await expect(cardComTermo).toBeVisible();
    await expect(cardSemTermo).toBeVisible();

    // ---------- Act 2: usa o campo de busca global (ainda não existe) ----------
    const campoBusca = page.getByPlaceholder('Buscar por palavra-chave...');
    await campoBusca.fill(palavraChave);

    // ---------- Assert: só a demanda com o termo pesquisado continua na lista ----------
    await expect(cardComTermo).toBeVisible();
    await expect(cardSemTermo).not.toBeVisible();
  });
});
