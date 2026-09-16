/**
 * Cenario 9 - Painel Administrativo do Gestor
 *
 * Testa se o painel do gestor mostra e atualiza direito os indicadores
 * (volume de demandas abertas, em andamento e encerradas).
 *
 * Só que dando uma olhada no código real (frontend/src/app/gestor/dashboard/page.tsx),
 * o painel hoje só mostra três blocos: total de demandas, por categoria e por região.
 * Tudo vem do apiMetrics (useDemandStore.fetchMetrics -> metricsService.getKpis).
 * O tipo que a getKpis retorna só tem total, byCategory e byRegion - não tem
 * byStatus em lugar nenhum (nem no contrato, nem no front, nem na store).
 * Ou seja, o indicador de abertas/em andamento/encerradas que o enunciado pede
 * simplesmente não existe ainda.
 *
 * Por isso o arquivo ficou com dois testes:
 *   1. Testa os indicadores que já existem (total, categoria, região) criando
 *      demandas conhecidas via API e conferindo que os números sobem depois
 *      de recarregar o painel. Esse deve passar.
 *   2. Testa os indicadores por status, marcado com test.fail() DENTRO do
 *      próprio corpo do teste (e não solto no describe, entre os dois testes,
 *      como estava antes) — mesmo ajuste feito no Cenário 6, pra deixar
 *      explícito, no escopo do teste que de fato deve falhar, que essa
 *      funcionalidade ainda não foi implementada. test.fail() solto no
 *      describe funciona como modificador de escopo (afeta os testes
 *      declarados depois dele), o que não deixa claro qual teste é o
 *      "esperado falhar" nem documenta o motivo junto dele.
 *
 * Um detalhe sobre o "pelo menos X" no teste 1: como o apiMetrics é um endpoint
 * global (conta demanda de todo mundo, de todos os testes) e o
 * playwright.config.ts roda com fullyParallel: true, outros specs rodando
 * ao mesmo tempo (Cenários 1, 2, 6 e 8 também usam "Manutenção de vias" /
 * "Região Metropolitana do Recife") podem mexer nos números entre o "antes"
 * e o "depois" desse teste. Se comparasse com igualdade exata o teste ia
 * ficar instável à toa; comparando com "aumentou pelo menos N" ainda pega
 * o bug real (métricas não atualizando) sem precisar de isolamento entre specs.
 */

import { test, expect, APIRequestContext } from '@playwright/test';

const API_BASE_URL = process.env.E2E_API_URL ?? 'http://localhost:8080';
const SENHA_PADRAO = 'Senha@teste123';

const CATEGORIA_TESTE = 'Manutenção de vias';
const REGIAO_TESTE = 'Região Metropolitana do Recife';
const QTD_DEMANDAS_CRIADAS = 2;

interface UsuarioTeste {
  nome: string;
  email: string;
  senha: string;
}

async function criarUsuario(
  request: APIRequestContext,
  papel: 'cidadao' | 'gestor'
): Promise<UsuarioTeste> {
  const roleChar = papel === 'gestor' ? 'g' : 'c';
  const sufixo = `${Date.now().toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`;
  const usuario: UsuarioTeste = {
    nome: papel === 'gestor' ? 'Gestor E2E Teste' : 'Cidadao E2E Teste',
    email: `e2e${roleChar}${sufixo}@t.co`,
    senha: SENHA_PADRAO,
  };

  const resposta = await request.post(`${API_BASE_URL}/auth/register`, {
    data: { nome: usuario.nome, email: usuario.email, senha: usuario.senha, papel },
  });

  if (!resposta.ok()) {
    throw new Error(
      `Falha ao registrar usuario de teste (${papel}): ${resposta.status()} ${await resposta.text()}`
    );
  }

  return usuario;
}

async function logarViaApi(request: APIRequestContext, usuario: UsuarioTeste): Promise<string> {
  const resposta = await request.post(`${API_BASE_URL}/auth/login`, {
    data: { email: usuario.email, senha: usuario.senha },
  });

  if (!resposta.ok()) {
    throw new Error(`Falha ao logar usuario de teste: ${resposta.status()} ${await resposta.text()}`);
  }

  const body = await resposta.json();
  return body.token as string;
}

async function criarDemandaDeTeste(request: APIRequestContext, tokenCidadao: string, titulo: string) {
  const resposta = await request.post(`${API_BASE_URL}/demands/`, {
    headers: { Authorization: `Bearer ${tokenCidadao}` },
    data: {
      titulo,
      categoria: 'MANUTENCAO_DE_VIAS',
      problema: 'BURACO_NO_ASFALTO',
      regiao: 'REGIAO_METROPOLITANA_DO_RECIFE',
      endereco: 'Rua de Teste, 123 - Recife/PE',
      descricao: `Demanda criada pelo teste E2E do Cenario 9 (${titulo}).`,
      prioridade: 'MEDIA',
    },
  });

  if (!resposta.ok()) {
    throw new Error(`Falha ao criar demanda de teste: ${resposta.status()} ${await resposta.text()}`);
  }
}

/** Faz login do gestor pela interface — usado nos dois testes. */
async function logarGestorViaUi(
  page: import('@playwright/test').Page,
  gestor: UsuarioTeste
): Promise<void> {
  await page.goto('/logingestor');
  await page.getByPlaceholder('seu@email.com').fill(gestor.email);
  await page.getByPlaceholder('••••••••').fill(gestor.senha);
  await page.getByRole('button', { name: 'ENTRAR' }).click();
  await expect(page).toHaveURL(/\/gestor\/dashboard/);
}

async function lerTotal(page: import('@playwright/test').Page): Promise<number> {
  const bloco = page.locator('div.bg-purple-600').filter({ hasText: 'Demandas registradas' });
  const texto = await bloco.locator('p.text-7xl').innerText();
  return Number(texto.trim());
}

async function lerContagemCategoria(page: import('@playwright/test').Page, categoria: string): Promise<number> {
  const bloco = page.locator('div.bg-purple-600').filter({ hasText: 'Demandas por categoria' });
  const linha = bloco.locator('div.flex.items-center.justify-between.gap-1').filter({ hasText: categoria });
  const texto = await linha.locator('span.font-bold').innerText();
  return Number(texto.trim());
}

async function lerContagemRegiao(page: import('@playwright/test').Page, regiao: string): Promise<number> {
  const bloco = page.locator('div.bg-purple-600').filter({ hasText: 'Demandas por região' });
  const linha = bloco.locator('div.flex.items-center.justify-between.gap-1').filter({ hasText: regiao });
  const texto = await linha.locator('span.font-bold').innerText();
  return Number(texto.trim());
}

test.describe('Cenario 9 - Painel Administrativo do Gestor', () => {
  test('carrega e atualiza corretamente os indicadores de total, categoria e regiao', async ({
    page,
    request,
  }) => {
    const gestor = await criarUsuario(request, 'gestor');
    await logarGestorViaUi(page, gestor);

    await expect(page.getByRole('heading', { name: 'Painel de Gestão' })).toBeVisible();
    await expect(page.getByText('Demandas registradas')).toBeVisible();

    const totalAntes = await lerTotal(page);
    const categoriaAntes = await lerContagemCategoria(page, CATEGORIA_TESTE);
    const regiaoAntes = await lerContagemRegiao(page, REGIAO_TESTE);

    const cidadao = await criarUsuario(request, 'cidadao');
    const tokenCidadao = await logarViaApi(request, cidadao);

    for (let i = 0; i < QTD_DEMANDAS_CRIADAS; i++) {
      await criarDemandaDeTeste(request, tokenCidadao, `[E2E] Demanda painel ${Date.now()}-${i}`);
    }

    await page.reload();
    await expect(page.getByText('Demandas registradas')).toBeVisible();

    await expect
      .poll(() => lerTotal(page), { timeout: 15000 })
      .toBe(totalAntes + QTD_DEMANDAS_CRIADAS);

    await expect
      .poll(() => lerContagemCategoria(page, CATEGORIA_TESTE), { timeout: 15000 })
      .toBe(categoriaAntes + QTD_DEMANDAS_CRIADAS);

    await expect
      .poll(() => lerContagemRegiao(page, REGIAO_TESTE), { timeout: 15000 })
      .toBe(regiaoAntes + QTD_DEMANDAS_CRIADAS);
  });

  test('exibe o volume de demandas abertas, em andamento e encerradas', async ({ page, request }) => {
    // Hoje o painel não separa nada por status (getKpis só retorna total,
    // byCategory e byRegion — ver comentário no topo do arquivo), então
    // este teste tem que falhar mesmo. test.fail() fica aqui dentro, e não
    // solto no describe, para valer só para este teste e documentar o
    // motivo junto com ele. Quando o byStatus for implementado, apagar
    // esta linha e ajustar os seletores abaixo pro que a UI realmente usar.
    test.fail();

    const gestor = await criarUsuario(request, 'gestor');
    await logarGestorViaUi(page, gestor);

    // chute de como vai ficar quando implementarem isso
    await expect(page.getByText('Abertas', { exact: false })).toBeVisible();
    await expect(page.getByText('Em Andamento', { exact: false })).toBeVisible();
    await expect(page.getByText('Encerradas', { exact: false })).toBeVisible();
  });
});