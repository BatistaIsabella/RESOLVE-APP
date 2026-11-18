/**
 * Cenário 10 — Cidadão não autorizado tenta acessar o Painel do Gestor
 *
 * "Como Cidadão não autorizado, tento acessar diretamente a URL do Painel
 * do Gestor via navegação, garantindo que o sistema bloqueia o acesso e
 * redireciona para o login."
 *
 * O cenário tem duas faces, e as duas são testadas aqui:
 *
 *   a) Visitante SEM login nenhum digita a URL do painel na barra de
 *      endereços (navegação direta, sem passar por link algum).
 *   b) Cidadão JÁ AUTENTICADO (papel "cidadao", portanto autenticado mas
 *      NÃO autorizado) tenta a mesma coisa — o sistema tem que barrar por
 *      PAPEL, não só por "tem token ou não".
 *
 * O que se espera em cada caso:
 *   a) Visitante sem sessão: redirecionamento para a tela de login do gestor
 *      (/logingestor).
 *   b) Cidadão autenticado: o AuthGuard o envia para a tela inicial do próprio
 *      perfil (/telaUsuario). Esse é o comportamento definido no código
 *      (frontend/src/components/Auth/AuthGuard.tsx): quem já tem sessão válida
 *      não é mandado para uma tela de login.
 *   Nos dois casos: nenhum dado do painel é renderizado e o navegador não faz
 *   nenhuma chamada às rotas de gestor da API.
 *
 * Fluxo automatizado:
 *   1. (a) Em um contexto limpo (sem token no localStorage), navega direto
 *      para cada rota protegida da área do gestor: /gestor/dashboard,
 *      /gestor e /gestor/demandas/{id}.
 *   2. Confirma, para cada uma, que a URL final é /logingestor, que o
 *      formulário de login do gestor está visível e que nenhum conteúdo do
 *      painel ("Painel de Gestão", cards de demanda) vazou para a tela.
 *   3. Confirma também que o navegador não chegou a chamar as rotas de
 *      gestor da API (/demands/gestor, /metrics) — ou seja, o bloqueio
 *      aconteceu ANTES de qualquer tentativa de buscar dados sigilosos.
 *   4. (b) Cria um cidadão via API, faz login real pela UI (/login) e, já
 *      autenticado, navega direto para /gestor/dashboard — confirma que é
 *      barrado e mandado para a própria tela inicial (/telaUsuario), sem ver
 *      o painel e sem que o navegador chame rotas de gestor.
 *   5. Defesa em profundidade: confere que o back-end também barra, sem
 *      depender do front-end — GET /demands/gestor sem token responde 401
 *      e, com token de cidadão, responde 403.
 *
 * BUG-04 (corrigido): ao escrever este cenário descobrimos que o guard antigo
 * rodava ANTES de o Zustand reidratar o token do localStorage, então qualquer
 * carga direta de URL (digitar o endereço, dar F5) derrubava o usuário pro
 * login, inclusive um gestor legítimo (ver docs/testes/RELATORIO_BUGS.md). O
 * AuthGuard central passou a esperar a reidratação antes de decidir, e o teste
 * que fixa o outro lado da regra (gestor legítimo continua no painel após o F5)
 * deixou de ser uma falha esperada. Com o bug corrigido, o teste do cidadão
 * autenticado prova de fato a checagem de PAPEL, e não mais uma corrida de
 * hidratação.
 *
 * Notas de implementação:
 * - O guard é o AuthGuard central (frontend/src/components/Auth/AuthGuard.tsx),
 *   aplicado em frontend/src/app/(gestor)/layout.tsx com role="gestor" e
 *   loginPath="/logingestor". Ele espera a reidratação do Zustand (persist) e só
 *   então decide: sem sessão, vai para /logingestor; sessão de outro perfil, vai
 *   para a tela inicial do próprio perfil (/telaUsuario). O teste espera pela URL
 *   final em vez de conferir a tela imediatamente após o goto.
 * - A rota de detalhes usa um id qualquer (1): o guard roda antes do
 *   fetch, então o teste não depende de a demanda existir.
 */

import { test, expect, APIRequestContext, Page } from '@playwright/test';

const API_BASE_URL = process.env.E2E_API_URL ?? 'http://localhost:8080';
const SENHA_PADRAO = 'Senha@teste123';
// Mesma versão de frontend/src/constants/termos.ts e da variável TERMOS_VERSAO do auth-service.
const VERSAO_TERMOS = '1.0';
// Código que o auth-service exige para cadastrar gestor (padrão do docker-compose; mesmo do cenário 9).
const CODIGO_GESTOR = process.env.E2E_GESTOR_CODE ?? 'change-me-codigo-gestor';

/** Rotas protegidas da área do gestor que um cidadão pode tentar digitar direto. */
const ROTAS_DO_PAINEL = ['/gestor/dashboard', '/gestor', '/gestor/demandas/1'];

interface UsuarioTeste {
  nome: string;
  email: string;
  senha: string;
}

/** Cria (via API) um usuário cidadão único para esta execução do teste. */
async function criarCidadao(request: APIRequestContext): Promise<UsuarioTeste> {
  // O e-mail precisa caber em VarChar(35) no banco (ver auth-service/prisma/schema.prisma),
  // por isso o sufixo usa timestamp em base36 em vez de texto + timestamp decimal.
  const sufixo = `${Date.now().toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`;
  const usuario: UsuarioTeste = {
    nome: 'Cidadão E2E Teste',
    email: `e2ec10${sufixo}@t.co`,
    senha: SENHA_PADRAO,
  };

  const resposta = await request.post(`${API_BASE_URL}/auth/register`, {
    data: {
      nome: usuario.nome,
      email: usuario.email,
      senha: usuario.senha,
      papel: 'cidadao',
      aceiteTermos: true,
      versaoTermos: VERSAO_TERMOS,
    },
  });

  if (!resposta.ok()) {
    throw new Error(
      `Falha ao registrar usuário de teste: ${resposta.status()} ${await resposta.text()}`
    );
  }

  return usuario;
}

/** Faz login via API e devolve o token JWT — usado só para checar o back-end direto. */
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

/**
 * Confirma que a tela atual é a de login do gestor e que NADA do painel
 * ficou visível — nem o cabeçalho, nem cards de demanda.
 */
async function esperarTelaDeLoginDoGestor(page: Page, rotaTentada: string) {
  await expect(page, `esperava redirecionamento para /logingestor ao acessar ${rotaTentada}`)
    .toHaveURL(/\/logingestor$/);

  // O formulário de login do gestor está de fato na tela.
  await expect(page.getByPlaceholder('seu@email.com')).toBeVisible();
  await expect(page.getByPlaceholder('••••••••')).toBeVisible();
  await expect(page.getByRole('button', { name: 'ENTRAR' })).toBeVisible();

  // E nenhum conteúdo do painel vazou (nem título, nem cards de demanda).
  await expect(page.getByRole('heading', { name: /Painel de Gest[ãa]o/i })).toHaveCount(0);
  await expect(page.locator('div.border.border-gray-200.rounded-lg.p-4')).toHaveCount(0);
}

/**
 * Confirma que um cidadão autenticado que tentou a rota do painel do gestor foi
 * enviado para a própria tela inicial (/telaUsuario) e que NADA do painel ficou
 * visível.
 */
async function esperarHomeDoCidadao(page: Page, rotaTentada: string) {
  await expect(
    page,
    `esperava o cidadão autenticado na própria tela inicial (/telaUsuario) ao acessar ${rotaTentada}`
  ).toHaveURL(/\/telaUsuario$/);

  // Nenhum conteúdo do painel do gestor vazou (nem título, nem indicadores).
  await expect(page.getByRole('heading', { name: /Painel de Gest[ãa]o/i })).toHaveCount(0);
  await expect(page.getByText('Demandas registradas')).toHaveCount(0);
  await expect(page.getByText('Demandas por categoria')).toHaveCount(0);
}

test.describe('Cenário 10 — acesso não autorizado ao Painel do Gestor', () => {
  test('visitante sem login é bloqueado e redirecionado ao tentar as URLs do painel', async ({
    page,
  }) => {
    // Registra qualquer chamada do navegador às rotas de gestor da API: se o
    // bloqueio funciona, nenhuma delas deve acontecer.
    const chamadasDeGestor: string[] = [];
    page.on('request', (req) => {
      const url = req.url();
      if (url.includes('/demands/gestor') || url.includes('/metrics')) {
        chamadasDeGestor.push(url);
      }
    });

    // ---------- Arrange: confirma que não existe sessão nenhuma ----------
    // (o contexto do Playwright já começa limpo — isso só documenta a premissa
    // do cenário: o usuário nunca fez login nesta máquina/navegador)
    await page.goto('/');
    // `globalThis as any` porque o tsconfig da suíte não inclui a lib "DOM"
    // (ver e2e/tsconfig.json) — o código roda no navegador, não aqui.
    const sessao = await page.evaluate(
      () =>
        (globalThis as any).localStorage.getItem('smart-city-storage-v2') as string | null
    );
    expect(sessao === null || !JSON.parse(sessao)?.state?.token).toBeTruthy();

    for (const rota of ROTAS_DO_PAINEL) {
      // ---------- Act: navegação direta pela URL ----------
      await page.goto(rota);

      // ---------- Assert: barrado e mandado pro login do gestor ----------
      await esperarTelaDeLoginDoGestor(page, rota);
    }

    expect(
      chamadasDeGestor,
      `o navegador não deveria chamar rotas de gestor sem sessão: ${chamadasDeGestor.join(', ')}`
    ).toEqual([]);
  });

  test('cidadão autenticado (papel errado) não vê o painel e é enviado à própria tela inicial', async ({
    page,
    request,
  }) => {
    // ---------- Arrange: cidadão de verdade, logado de verdade ----------
    const cidadao = await criarCidadao(request);

    await page.goto('/login');
    await page.getByPlaceholder('seu@email.com').fill(cidadao.email);
    await page.getByPlaceholder('••••••••').fill(cidadao.senha);
    await page.getByRole('button', { name: 'ENTRAR' }).click();

    await expect(page).toHaveURL(/\/telaUsuario/);

    // A partir daqui, registra qualquer chamada do navegador às rotas de gestor da API:
    // se o bloqueio funciona, nenhuma delas deve acontecer.
    const chamadasDeGestor: string[] = [];
    page.on('request', (req) => {
      const url = req.url();
      if (url.includes('/demands/gestor') || url.includes('/metrics')) {
        chamadasDeGestor.push(url);
      }
    });

    // ---------- Act: digita a URL do painel do gestor na barra de endereços ----------
    await page.goto('/gestor/dashboard');

    // ---------- Assert: autenticado, mas não autorizado → vai para a própria tela inicial ----------
    // O AuthGuard decide por PAPEL (a sessão existe e é válida), então o cidadão não é mandado
    // para uma tela de login: volta para /telaUsuario, sem ver o painel do gestor.
    await esperarHomeDoCidadao(page, '/gestor/dashboard');

    expect(
      chamadasDeGestor,
      `o navegador não deveria chamar rotas de gestor com sessão de cidadão: ${chamadasDeGestor.join(', ')}`
    ).toEqual([]);
  });

  // BUG-04 (corrigido): o guard antigo redirecionava antes de a sessão ser reidratada e expulsava
  // um gestor legítimo do próprio painel ao dar F5. O AuthGuard central agora só decide depois da
  // reidratação, e este teste (que fixa o comportamento correto) passou a valer como teste normal.
  test.describe('regra de papel (o outro lado do bloqueio)', () => {
    test('gestor legítimo continua no painel depois de recarregar a página', async ({
      page,
      request,
    }) => {
      // ---------- Arrange: gestor de verdade, logado pela UI ----------
      const sufixo = `${Date.now().toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`;
      const gestor = {
        nome: 'Gestor E2E Teste',
        email: `e2eg10${sufixo}@t.co`,
        senha: SENHA_PADRAO,
      };

      const registro = await request.post(`${API_BASE_URL}/auth/register`, {
        data: {
          ...gestor,
          papel: 'gestor',
          codigoAcesso: CODIGO_GESTOR,
          aceiteTermos: true,
          versaoTermos: VERSAO_TERMOS,
        },
      });
      if (!registro.ok()) {
        throw new Error(
          `Falha ao registrar gestor de teste: ${registro.status()} ${await registro.text()}`
        );
      }

      await page.goto('/logingestor');
      await page.getByPlaceholder('seu@email.com').fill(gestor.email);
      await page.getByPlaceholder('••••••••').fill(gestor.senha);
      await page.getByRole('button', { name: 'ENTRAR' }).click();

      await expect(page).toHaveURL(/\/gestor\/dashboard/);

      // ---------- Act: F5, do jeito que qualquer usuário faria ----------
      await page.reload();

      // ---------- Assert: a sessão SOBREVIVE e o usuário CONTINUA no painel ----------
      // Aqui estamos afirmando que uma navegação NÃO vai acontecer, então não
      // basta olhar a URL logo após o reload: um redirecionamento tardio só
      // apareceria depois. Por isso deixamos a página assentar antes de conferir
      // onde ela parou.
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3_000);

      await expect(page).toHaveURL(/\/gestor\/dashboard/);
      await expect(page.getByRole('heading', { name: /Painel de Gest[ãa]o/i })).toBeVisible();
    });
  });

  test('o back-end também barra o acesso às rotas de gestor (defesa em profundidade)', async ({
    request,
  }) => {
    // Sem o token, a API responde 401 (não autenticado).
    const semToken = await request.get(`${API_BASE_URL}/demands/gestor?page=1&limit=10`);
    expect(semToken.status()).toBe(401);

    // Com token de cidadão, a API responde 403 (autenticado, mas sem perfil).
    const cidadao = await criarCidadao(request);
    const tokenCidadao = await logarViaApi(request, cidadao);

    const comTokenDeCidadao = await request.get(`${API_BASE_URL}/demands/gestor?page=1&limit=10`, {
      headers: { Authorization: `Bearer ${tokenCidadao}` },
    });
    expect(comTokenDeCidadao.status()).toBe(403);
  });
});
