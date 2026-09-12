/**
 * Cenário 8 — Gestor Público altera a prioridade de uma demanda
 *
 * "Como Gestor Público, modifico o nível de prioridade de uma demanda
 * existente no sistema, garantindo que o novo nível seja salvo e refletido
 * no card da solicitação."
 *
 * Fluxo automatizado (do ponto de vista do usuário Gestor):
 *   1. Faz login na área do gestor (/logingestor).
 *   2. No Painel (/gestor/dashboard), localiza o card de uma demanda
 *      existente (prioridade inicial "Baixa").
 *   3. Abre os detalhes da demanda, edita a prioridade para "Alta" e salva.
 *   4. Confirma que a tela de detalhes já mostra "Alta".
 *   5. Volta para a listagem (navegação real, sem reload manual) e confirma
 *      que o card da mesma demanda também está exibindo "Alta" — ou seja,
 *      a alteração foi persistida e refletida na lista, não só na tela de
 *      detalhes.
 *
 * Setup (Arrange): a demanda de teste e a conta de cidadão usadas para
 * criá-la são preparadas via API antes do teste (mais rápido e não deixa o
 * resultado do teste depender de haver dados fixos no banco). A conta de
 * GESTOR, porém, é criada via API mas o LOGIN é sempre feito pela UI de
 * verdade — é essa parte que o cenário quer validar.
 *
 * Autor: Gabriel Souza (C8)
 */

import { test, expect, APIRequestContext } from '@playwright/test';

const API_BASE_URL = process.env.E2E_API_URL ?? 'https://smart-city-6.onrender.com';
const SENHA_PADRAO = 'Senha@teste123';

interface UsuarioTeste {
  nome: string;
  email: string;
  senha: string;
}

/** Cria (via API) um usuário cidadão ou gestor único para esta execução do teste. */
async function criarUsuario(
  request: APIRequestContext,
  papel: 'cidadao' | 'gestor'
): Promise<UsuarioTeste> {
  // O e-mail precisa caber em VarChar(35) no banco (ver auth-service/prisma/schema.prisma),
  // por isso usamos timestamp em base36 em vez do texto completo do cenário/timestamp decimal.
  const roleChar = papel === 'gestor' ? 'g' : 'c';
  const sufixo = `${Date.now().toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`;
  const usuario: UsuarioTeste = {
    nome: papel === 'gestor' ? 'Gestor E2E Teste' : 'Cidadão E2E Teste',
    email: `e2e${roleChar}${sufixo}@t.co`,
    senha: SENHA_PADRAO,
  };

  const resposta = await request.post(`${API_BASE_URL}/auth/register`, {
    data: { nome: usuario.nome, email: usuario.email, senha: usuario.senha, papel },
  });

  if (!resposta.ok()) {
    throw new Error(
      `Falha ao registrar usuário de teste (${papel}): ${resposta.status()} ${await resposta.text()}`
    );
  }

  return usuario;
}

/** Faz login via API e devolve o token JWT — usado só para preparar dados (cidadão). */
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

/** Cria, via API, uma demanda de teste com prioridade inicial "Baixa". */
async function criarDemandaDeTeste(
  request: APIRequestContext,
  tokenCidadao: string,
  titulo: string
): Promise<number> {
  const resposta = await request.post(`${API_BASE_URL}/demands/`, {
    headers: { Authorization: `Bearer ${tokenCidadao}` },
    data: {
      titulo,
      categoria: 'MANUTENCAO_DE_VIAS',
      regiao: 'REGIAO_METROPOLITANA_DO_RECIFE',
      descricao: 'Demanda criada automaticamente pelo teste E2E do Cenário 8 (alterar prioridade).',
      endereco: 'Rua de Teste, 123 - Recife/PE',
      prioridade: 'BAIXA',
    },
  });

  if (!resposta.ok()) {
    throw new Error(`Falha ao criar demanda de teste: ${resposta.status()} ${await resposta.text()}`);
  }

  const body = await resposta.json();
  return body.id_denuncia as number;
}

test.describe('Cenário 8 — Gestor altera a prioridade de uma demanda', () => {
  test('gestor edita a prioridade de uma demanda e a mudança é salva e refletida no card', async ({
    page,
    request,
  }) => {
    // ---------- Arrange: dados de teste isolados e únicos por execução ----------
    const tituloDemanda = `[E2E] Buraco na via ${Date.now()}`;

    const cidadao = await criarUsuario(request, 'cidadao');
    const tokenCidadao = await logarViaApi(request, cidadao);
    await criarDemandaDeTeste(request, tokenCidadao, tituloDemanda);

    const gestor = await criarUsuario(request, 'gestor');

    // ---------- Act 1: login real do gestor pela interface ----------
    await page.goto('/logingestor');
    await page.getByPlaceholder('seu@email.com').fill(gestor.email);
    await page.getByPlaceholder('••••••••').fill(gestor.senha);
    await page.getByRole('button', { name: 'ENTRAR' }).click();

    await expect(page).toHaveURL(/\/gestor\/dashboard/);

    // ---------- Act 2: localiza o card da demanda recém-criada ----------
    const card = page
      .locator('div.border.border-gray-200.rounded-lg.p-4')
      .filter({ hasText: tituloDemanda });

    await expect(card).toBeVisible();
    await expect(card.getByText('Baixa', { exact: true })).toBeVisible();

    await card.getByRole('button', { name: 'Ver Detalhes' }).click();
    await expect(page).toHaveURL(/\/gestor\/demandas\/\d+/);

    // ---------- Act 3: edita a prioridade de "Baixa" para "Alta" ----------
    const linhaPrioridade = page
      .locator('div.flex.items-center.gap-2')
      .filter({ hasText: 'Prioridade' });

    await linhaPrioridade.getByRole('button').click(); // ✏️ entra em modo de edição

    await page.locator('select').selectOption('Alta');
    await page.getByRole('button', { name: '✓' }).click(); // confirma

    // ---------- Assert 1: a tela de detalhes já reflete o novo valor ----------
    await expect(page.getByText('Alta', { exact: true })).toBeVisible();
    await expect(page.getByText('Baixa', { exact: true })).toHaveCount(0);

    // ---------- Act 4: volta para a listagem ----------
    await page.getByRole('button', { name: '← Voltar para Lista' }).click();
    await expect(page).toHaveURL(/\/gestor\/dashboard/);

    // ---------- Assert 2: o card na listagem também mostra "Alta" ----------
    const cardAtualizado = page
      .locator('div.border.border-gray-200.rounded-lg.p-4')
      .filter({ hasText: tituloDemanda });

    await expect(cardAtualizado).toBeVisible();
    await expect(cardAtualizado.getByText('Alta', { exact: true })).toBeVisible();
    await expect(cardAtualizado.getByText('Baixa', { exact: true })).toHaveCount(0);
  });
});
