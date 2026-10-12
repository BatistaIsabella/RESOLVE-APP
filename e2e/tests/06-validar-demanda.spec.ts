/**
 * Cenario 6 - Detalhes da demanda
 *
 * Como Cidadao, acesso a pagina de detalhes de uma solicitacao especifica
 * e verifico se o historico de atualizacoes e as informacoes do registro
 * sao exibidos corretamente.
 *
 * O componente DemandDetails.tsx so renderiza o estado atual da demanda
 * (foto, categoria, prioridade, status atual, solicitante, endereco, data
 * do registro, descricao). Nao existe secao de historico/timeline, e o
 * tipo Demand tambem nao tem nenhum campo de historico ou log.
 *
 * Por isso o arquivo tem dois testes:
 *   1. Informacoes do registro - cobre o que existe hoje e deve passar.
 *      A demanda e criada pelo formulario (mesmo fluxo do Cenario 1),
 *      porque o contrato exato do endpoint de criacao ainda nao esta
 *      confirmado e esse fluxo ja e validado no Cenario 1.
 *   2. Historico de atualizacoes - a funcionalidade ainda nao foi
 *      implementada, entao este teste e marcado com test.fail() DENTRO
 *      do proprio corpo do teste (e nao solto no describe, como estava
 *      antes) — mesmo espirito do Cenario 8: cada teste deixa explicito,
 *      no seu proprio escopo, o que espera e por que. Aqui, ao inves de
 *      repetir o formulario inteiro so pra chegar na tela de detalhes, a
 *      demanda e criada via API (padrao usado no Cenario 8 para arrange
 *      rapido e isolado), deixando o teste focado so na asserção que
 *      importa: a secao de historico.
 *      Quando a funcionalidade for implementada, ajustar o seletor
 *      comentado e remover a chamada test.fail().
 *
 * Fluxo do teste 1:
 *   1. Cria um cidadao de teste via API.
 *   2. Login pela interface.
 *   3. Cria uma demanda pelo formulario (mesmo fluxo do Cenario 1).
 *   4. Abre os detalhes da demanda a partir do card.
 *   5. Confere problema, categoria, endereco e descricao na tela de detalhes.
 *
 * O formulario nao tem campo de prioridade e a tela de detalhes nao mostra
 * regiao, entao esses dois campos nao sao verificados aqui.
 */

import { test, expect, APIRequestContext } from '@playwright/test';

const API_BASE_URL = process.env.E2E_API_URL ?? 'http://localhost:8080';
const SENHA_PADRAO = 'Senha@teste123';

interface UsuarioTeste {
  nome: string;
  email: string;
  senha: string;
}

async function criarUsuario(request: APIRequestContext): Promise<UsuarioTeste> {
  // email precisa caber em VarChar(35) no banco (auth-service/prisma/schema.prisma)
  const sufixo = `${Date.now().toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`;
  const usuario: UsuarioTeste = {
    nome: 'Cidadao E2E Teste',
    email: `e2ec6${sufixo}@t.co`,
    senha: SENHA_PADRAO,
  };

  const resposta = await request.post(`${API_BASE_URL}/auth/register`, {
    data: { nome: usuario.nome, email: usuario.email, senha: usuario.senha, papel: 'cidadao' },
  });

  if (!resposta.ok()) {
    throw new Error(
      `Falha ao registrar usuario de teste: ${resposta.status()} ${await resposta.text()}`
    );
  }

  return usuario;
}

/** Faz login via API e devolve o token JWT — usado so para preparar dados. */
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

/** Cria, via API, uma demanda de teste (arrange rapido, mesmo padrao do Cenario 8). */
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
      descricao: 'Demanda criada automaticamente pelo teste E2E do Cenario 6 (historico).',
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

test.describe('Cenario 6 - Detalhes da demanda', () => {
  test('exibe corretamente as informacoes do registro', async ({ page, request }) => {
    const cidadao = await criarUsuario(request);

    const endereco = `Rua E2E Cenario 6, ${Date.now()} - Recife/PE`;
    const descricao = `Demanda criada pelo teste E2E do Cenario 6 em ${Date.now()}.`;

    await page.goto('/login');
    await page.getByPlaceholder('seu@email.com').fill(cidadao.email);
    await page.getByPlaceholder('••••••••').fill(cidadao.senha);
    await page.getByRole('button', { name: 'ENTRAR' }).click();

    await expect(page).toHaveURL(/\/telaUsuario$/);

    await page.getByRole('button', { name: 'Criar Nova Solicitação' }).click();
    await expect(page).toHaveURL(/\/demandas\/nova$/);
    await expect(page.getByRole('heading', { name: 'Nova Denúncia' })).toBeVisible();

    await page.locator('select').nth(0).selectOption({ label: 'Manutenção de vias' });
    await page.locator('select').nth(1).selectOption({ label: 'Buraco no asfalto' });
    await page.locator('select').nth(2).selectOption({ label: 'Região Metropolitana do Recife' });
    await page.getByPlaceholder('Endereço Completo *').fill(endereco);
    await page.getByPlaceholder('Descrição detalhada *').fill(descricao);

    await page.getByRole('button', { name: 'Salvar Denúncia' }).click();
    await expect(page).toHaveURL(/\/telaUsuario$/);

    // usuario novo, entao a demanda criada e a unica da lista
    const card = page.locator('div.border.border-gray-200.rounded-lg.p-4').first();
    await card.scrollIntoViewIfNeeded();
    await expect(card).toBeVisible({ timeout: 15000 });

    await card.getByRole('button', { name: 'Ver Detalhes' }).click();
    await expect(page).toHaveURL(/\/demandas\/[^/]+$/);

    await expect(page.getByRole('heading', { name: 'Buraco no asfalto' })).toBeVisible();
    await expect(page.getByText('Manutenção de vias', { exact: true })).toBeVisible();
    await expect(page.getByText(endereco)).toBeVisible();
    await expect(page.getByText(descricao)).toBeVisible();

    // status e prioridade nao sao definidos no formulario, entao so
    // confirmamos que aparecem com algum valor valido
    await expect(page.getByText('Status Atual')).toBeVisible();
    await expect(page.getByText(/^(Aberta|Em análise|Resolvida)$/).first()).toBeVisible();
    await expect(page.getByText('Prioridade', { exact: false }).first()).toBeVisible();
    await expect(page.getByText(/^(Alta|Média|Baixa)$/).first()).toBeVisible();
  });

  test('exibe o historico de atualizacoes da demanda', async ({ page, request }) => {
    // Funcionalidade ainda nao implementada: DemandDetails.tsx nao tem
    // secao de historico e o tipo Demand nao tem campo pra isso.
    // test.fail() fica DENTRO do teste (nao solto no describe) para que
    // a anotacao valha so para este caso, com o motivo documentado aqui
    // mesmo — quando a feature existir, apagar esta linha e ajustar o
    // seletor abaixo.
    test.fail();

    const cidadao = await criarUsuario(request);
    const tokenCidadao = await logarViaApi(request, cidadao);
    const tituloDemanda = `[E2E] Buraco na via ${Date.now()}`;
    await criarDemandaDeTeste(request, tokenCidadao, tituloDemanda);

    await page.goto('/login');
    await page.getByPlaceholder('seu@email.com').fill(cidadao.email);
    await page.getByPlaceholder('••••••••').fill(cidadao.senha);
    await page.getByRole('button', { name: 'ENTRAR' }).click();
    await expect(page).toHaveURL(/\/telaUsuario$/);

    const card = page
      .locator('div.border.border-gray-200.rounded-lg.p-4')
      .filter({ hasText: tituloDemanda });
    await expect(card).toBeVisible();

    await card.getByRole('button', { name: 'Ver Detalhes' }).click();
    await expect(page).toHaveURL(/\/demandas\/[^/]+$/);

    // assume que a futura implementacao vai ter esse texto em algum
    // heading ou regiao da tela
    const historico = page.getByText(/hist[óo]rico de atualiza[çc][õo]es/i);
    await expect(historico).toBeVisible();
  });
});
