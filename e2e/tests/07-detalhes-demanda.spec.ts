/**
 * Cenário 7 — Cidadão visualiza os detalhes de uma demanda
 *
 * "Como Cidadão, acesso a tela de detalhes de uma demanda que registrei,
 * garantindo que todas as informações (categoria, prioridade, endereço e
 * descrição) estejam corretas e batam com o que foi cadastrado."
 *
 * Fluxo automatizado (do ponto de vista do usuário Cidadão):
 *   1. Faz login na área do cidadão (/login).
 *   2. Na tela de denúncias (/telaUsuario), localiza o card de uma demanda
 *      existente e confere categoria/prioridade já na listagem.
 *   3. Clica em "Ver Detalhes" e é levado para /demandas/{id}.
 *   4. Confirma que a tela de detalhes exibe corretamente: título,
 *      categoria, prioridade, endereço e a descrição detalhada cadastrados.
 *   5. Volta para a listagem (navegação real, sem reload manual) e confirma
 *      que o card da mesma demanda continua visível — ou seja, a navegação
 *      de ida e volta não perde nem corrompe os dados exibidos.
 *
 * Setup (Arrange): a demanda de teste e a conta de cidadão usadas para
 * criá-la são preparadas via API antes do teste (mais rápido e não deixa o
 * resultado do teste depender de haver dados fixos no banco). O LOGIN,
 * porém, é sempre feito pela UI de verdade — é essa parte que o cenário
 * quer validar, junto com a navegação para os detalhes e de volta.
 */

import { test, expect, APIRequestContext } from '@playwright/test';

const API_BASE_URL = process.env.E2E_API_URL ?? 'https://smart-city-6.onrender.com';
const SENHA_PADRAO = 'Senha@teste123';

interface UsuarioTeste {
  nome: string;
  email: string;
  senha: string;
}

/** Cria (via API) um usuário cidadão único para esta execução do teste. */
async function criarUsuario(request: APIRequestContext): Promise<UsuarioTeste> {
  // O e-mail precisa caber em VarChar(35) no banco (ver auth-service/prisma/schema.prisma),
  // por isso usamos timestamp em base36 em vez do texto completo do cenário/timestamp decimal.
  const sufixo = `${Date.now().toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`;
  const usuario: UsuarioTeste = {
    nome: 'Cidadão E2E Teste',
    email: `e2ec${sufixo}@t.co`,
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

interface DemandaTeste {
  titulo: string;
  endereco: string;
  descricao: string;
}

/** Cria, via API, uma demanda de teste com dados conhecidos para conferir na tela de detalhes. */
async function criarDemandaDeTeste(
  request: APIRequestContext,
  tokenCidadao: string,
  demanda: DemandaTeste
): Promise<number> {
  const resposta = await request.post(`${API_BASE_URL}/demands/`, {
    headers: { Authorization: `Bearer ${tokenCidadao}` },
    data: {
      titulo: demanda.titulo,
      categoria: 'MANUTENCAO_DE_VIAS',
      regiao: 'REGIAO_METROPOLITANA_DO_RECIFE',
      descricao: demanda.descricao,
      endereco: demanda.endereco,
      prioridade: 'MEDIA',
    },
  });

  if (!resposta.ok()) {
    throw new Error(`Falha ao criar demanda de teste: ${resposta.status()} ${await resposta.text()}`);
  }

  const body = await resposta.json();
  return body.id_denuncia as number;
}

test.describe('Cenário 7 — Cidadão visualiza os detalhes de uma demanda', () => {
  test('cidadão abre os detalhes de uma demanda e confere os dados cadastrados', async ({
    page,
    request,
  }) => {
    // ---------- Arrange: dados de teste isolados e únicos por execução ----------
    const demandaTeste: DemandaTeste = {
      titulo: `[E2E] Buraco na via ${Date.now()}`,
      endereco: 'Rua de Teste, 123 - Recife/PE',
      descricao: 'Demanda criada automaticamente pelo teste E2E do Cenário 7 (detalhes da demanda).',
    };

    const cidadao = await criarUsuario(request);
    const tokenCidadao = await logarViaApi(request, cidadao);
    await criarDemandaDeTeste(request, tokenCidadao, demandaTeste);

    // ---------- Act 1: login real do cidadão pela interface ----------
    await page.goto('/login');
    await page.getByPlaceholder('seu@email.com').fill(cidadao.email);
    await page.getByPlaceholder('••••••••').fill(cidadao.senha);
    await page.getByRole('button', { name: 'ENTRAR' }).click();

    await expect(page).toHaveURL(/\/telaUsuario/);

    // ---------- Act 2: localiza o card da demanda recém-criada ----------
    const card = page
      .locator('div.border.border-gray-200.rounded-lg.p-4')
      .filter({ hasText: demandaTeste.titulo });

    await expect(card).toBeVisible();
    await expect(card.getByText('Manutenção de vias', { exact: true })).toBeVisible();
    await expect(card.getByText('Média', { exact: true })).toBeVisible();

    await card.getByRole('button', { name: 'Ver Detalhes' }).click();
    await expect(page).toHaveURL(/\/demandas\/\d+/);

    // ---------- Assert 1: a tela de detalhes exibe os dados corretos ----------
    await expect(page.getByRole('heading', { name: demandaTeste.titulo })).toBeVisible();
    await expect(page.getByText('Manutenção de vias', { exact: true })).toBeVisible();
    await expect(page.getByText('Média', { exact: true })).toBeVisible();
    await expect(page.getByText(demandaTeste.endereco, { exact: true })).toBeVisible();
    await expect(page.getByText(demandaTeste.descricao, { exact: true })).toBeVisible();

    // ---------- Act 3: volta para a listagem ----------
    await page.getByRole('button', { name: '← Voltar para Lista' }).click();
    await expect(page).toHaveURL(/\/telaUsuario/);

    // ---------- Assert 2: o card continua visível na listagem, sem perda de dados ----------
    const cardAposVoltar = page
      .locator('div.border.border-gray-200.rounded-lg.p-4')
      .filter({ hasText: demandaTeste.titulo });

    await expect(cardAposVoltar).toBeVisible();
    await expect(cardAposVoltar.getByText('Manutenção de vias', { exact: true })).toBeVisible();
  });
});
