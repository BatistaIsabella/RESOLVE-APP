/**
 * Cenário 5 — Cidadão navega pelas páginas da listagem de solicitações
 *
 * "Como Cidadão, acesso a listagem de solicitações e consigo navegar entre
 * as páginas, garantindo que os registros sejam carregados corretamente e
 * que a aplicação permaneça estável caso ocorra uma falha na paginação."
 *
 * Fluxo automatizado:
 *   1. Cria uma conta de cidadão via API.
 *   2. Cria várias demandas via API.
 *   3. Faz login pela interface real.
 *   4. Acessa a listagem de solicitações.
 *   5. Localiza o controle de paginação.
 *   6. Avança na listagem.
 *   7. Confirma que a aplicação continua funcionando.
 *   8. Simula uma falha na requisição de demandas.
 *   9. Confirma que a aplicação permanece estável.
 *
 * Setup (Arrange):
 * - Usuário cidadão criado via API.
 * - Demandas criadas via API.
 * - Login realizado pela UI.
 *
 */

import { test, expect, APIRequestContext } from '@playwright/test';

const API_BASE_URL =
  process.env.E2E_API_URL ?? 'http://localhost:8080';

const SENHA_PADRAO = 'Senha@teste123';

interface UsuarioTeste {
  nome: string;
  email: string;
  senha: string;
}


async function criarUsuario(
  request: APIRequestContext
): Promise<UsuarioTeste> {
  const sufixo =
    `${Date.now().toString(36)}${Math.floor(
      Math.random() * 36
    ).toString(36)}`;

  const usuario: UsuarioTeste = {
    nome: 'Cid E2E',
    email: `e2e${sufixo}@t.co`,
    senha: SENHA_PADRAO,
  };

  const resposta = await request.post(
    `${API_BASE_URL}/auth/register`,
    {
      data: {
        nome: usuario.nome,
        email: usuario.email,
        senha: usuario.senha,
        papel: 'cidadao',
      },
    }
  );

  if (!resposta.ok()) {
    const corpo = await resposta.text();

    throw new Error(
      `Falha ao criar usuário de teste: ${resposta.status()} ${corpo}`
    );
  }

  return usuario;
}

async function logarViaApi(
  request: APIRequestContext,
  usuario: UsuarioTeste
): Promise<string> {
  const resposta = await request.post(
    `${API_BASE_URL}/auth/login`,
    {
      data: {
        email: usuario.email,
        senha: usuario.senha,
      },
    }
  );

  if (!resposta.ok()) {
    throw new Error(
      `Falha ao logar usuário de teste: ${resposta.status()} ${await resposta.text()}`
    );
  }

  const body = await resposta.json();

  return body.token as string;
}

interface DemandaTeste {
  titulo: string;
  endereco: string;
  descricao: string;
}

async function criarDemandaDeTeste(
  request: APIRequestContext,
  tokenCidadao: string,
  demanda: DemandaTeste
): Promise<number> {
  const resposta = await request.post(
    `${API_BASE_URL}/demands/`,
    {
      headers: {
        Authorization: `Bearer ${tokenCidadao}`,
      },
      data: {
        titulo: demanda.titulo,
        categoria: 'MANUTENCAO_DE_VIAS',
        regiao: 'REGIAO_METROPOLITANA_DO_RECIFE',
        descricao: demanda.descricao,
        endereco: demanda.endereco,
        prioridade: 'MEDIA',
      },
    }
  );

  if (!resposta.ok()) {
    throw new Error(
      `Falha ao criar demanda de teste: ${resposta.status()} ${await resposta.text()}`
    );
  }

  const body = await resposta.json();

  return body.id_denuncia as number;
}

test.describe(
  'Cenário 5 - Navegação e paginação da listagem de solicitações',
  () => {

    test(
      'deve navegar entre páginas e carregar registros corretamente',
      async ({ page, request }) => {

        // ARRANGE — preparação dos dados

        const cidadao = await criarUsuario(request);

        const tokenCidadao = await logarViaApi(
          request,
          cidadao
        );


        for (let i = 1; i <= 15; i++) {
          await criarDemandaDeTeste(
            request,
            tokenCidadao,
            {
              titulo: `[E2E] Pag ${i}-${Date.now().toString(36)}`,
              endereco: `Rua Teste ${i}`,
              descricao: `Demanda E2E de paginação ${i}.`,
            }
          );
        }

        // ACT 1 — Login pela interface

        await page.goto('/login');

        await page
          .getByPlaceholder('seu@email.com')
          .fill(cidadao.email);

        await page
          .getByPlaceholder('••••••••')
          .fill(cidadao.senha);

        await page
          .getByRole('button', { name: 'ENTRAR' })
          .click();

        // ASSERT 1 — Redirecionamento para a listagem

        await expect(page).toHaveURL(
          /\/telaUsuario/
        );

        await expect(
          page.locator('body')
        ).toBeVisible();

        // ASSERT 2 — Existem registros

        const cards = page.locator(
          'div.border.border-gray-200.rounded-lg.p-4'
        );

        await expect(
          cards.first()
        ).toBeVisible();

        expect(
          await cards.count()
        ).toBeGreaterThan(0);

        // ACT 2 — Localiza o controle de próxima página

        const botaoProxima = page
          .getByRole('button', {
            name: /próxima|proxima|next/i,
          })
          .last();

        await expect(
          botaoProxima
        ).toBeVisible();

        // ACT 3 — Avança na paginação

        await botaoProxima.click();

        await page.waitForTimeout(500);

        // ASSERT 3 — A aplicação continua carregada

        await expect(page).toHaveURL(
          /\/telaUsuario/
        );

        await expect(
          page.locator('body')
        ).toBeVisible();

        const cardsAposAvancar = page.locator(
          'div.border.border-gray-200.rounded-lg.p-4'
        );

        await expect(
          cardsAposAvancar.first()
        ).toBeVisible();

        expect(
          await cardsAposAvancar.count()
        ).toBeGreaterThan(0);

      }
    );

    test(
      'deve permanecer estável quando ocorrer falha na paginação',
      async ({ page, request }) => {

        // ARRANGE — preparação dos dados

        const cidadao = await criarUsuario(request);

        const tokenCidadao = await logarViaApi(
          request,
          cidadao
        );

        for (let i = 1; i <= 15; i++) {
          await criarDemandaDeTeste(
            request,
            tokenCidadao,
            {
              titulo: `[E2E] Falha Pag ${i}-${Date.now().toString(36)}`,
              endereco: `Rua Falha ${i}`,
              descricao: `Demanda E2E para teste de falha ${i}.`,
            }
          );
        }

        // ACT 1 — Login pela interface

        await page.goto('/login');

        await page
          .getByPlaceholder('seu@email.com')
          .fill(cidadao.email);

        await page
          .getByPlaceholder('••••••••')
          .fill(cidadao.senha);

        await page
          .getByRole('button', { name: 'ENTRAR' })
          .click();

        await page.waitForLoadState('networkidle');

        // ASSERT 1 — Listagem carregada

        await expect(page).toHaveURL(
          /\/telaUsuario/
        );

        await expect(
          page.locator('body')
        ).toBeVisible();

        const cardsAntesDaFalha = page.locator(
          'div.border.border-gray-200.rounded-lg.p-4'
        );

        await expect(
          cardsAntesDaFalha.first()
        ).toBeVisible();

        expect(
          await cardsAntesDaFalha.count()
        ).toBeGreaterThan(0);

        // ARRANGE 2 — Simula erro na API de demandas

        await page.route(
          '**/demands*',
          async (route) => {
            if (
              route.request().method() === 'GET'
            ) {
              await route.fulfill({
                status: 500,
                contentType: 'application/json',
                body: JSON.stringify({
                  error:
                    'Erro interno ao carregar solicitações',
                }),
              });

              return;
            }

            await route.continue();
          }
        );

        // ACT 2 — Tenta utilizar a paginação

        const botaoProxima = page
          .getByRole('button', {
            name: /próxima|proxima|next/i,
          })
          .last();

        await expect(
          botaoProxima
        ).toBeVisible();

        await botaoProxima.click();

        await page.waitForTimeout(1000);

        // ASSERT 2 — Usuário permanece na tela

        await expect(page).toHaveURL(
          /\/telaUsuario/
        );

        await expect(
          page.locator('body')
        ).toBeVisible();

        // ASSERT 3 — Aplicação não quebra

        const body = page.locator('body');

        await expect(body).not.toBeEmpty();

        expect(
          await page.locator('html').count()
        ).toBe(1);

        // CLEANUP — remove interceptação

        await page.unroute('**/demands*');
      }
    );
  }
);