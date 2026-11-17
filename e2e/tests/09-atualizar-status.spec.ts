/**
 * Cenário 9 — Painel Administrativo do Gestor
 *
 * "Como Gestor Público, acesso o Painel Administrativo e valido a exibição e
 * o carregamento correto dos principais indicadores operacionais (como
 * volume de demandas abertas, em andamento e encerradas)."
 *
 * O que o painel (/gestor/dashboard) mostra hoje:
 *   - o total de demandas, a contagem por categoria e a contagem por região,
 *     que vêm do metrics-service (GET /metrics) via useDemandStore.fetchMetrics;
 *   - a lista de demandas com o status de cada uma e um filtro por status
 *     (Aberta, Em Análise, Resolvida). Com um filtro aplicado, o contador de
 *     "Demandas registradas" passa a refletir só as demandas filtradas.
 *
 * O metrics-service até devolve um byStatus, mas o metricsService do front
 * descarta esse campo e a tela não tem nenhum bloco de "abertas / em
 * andamento / encerradas". Como esse indicador ainda não existe, ele não
 * está neste teste. O volume por status é conferido pelo único caminho que a
 * tela oferece hoje, que é o filtro de status do painel.
 *
 * Testes deste arquivo:
 *   1. Total, categoria e região: o gestor abre o painel, anota os números,
 *      o cidadão registra duas demandas pela API e, depois de recarregar o
 *      painel, os três números precisam ter subido.
 *   2. Volume por status: três demandas novas ficam, uma em cada status, e o
 *      filtro do painel precisa separar cada uma delas, com o contador
 *      batendo com a quantidade de cards exibidos.
 *   3. Registrar → acompanhar → atualizar → notificar: o cidadão tem uma demanda
 *      e um aparelho registrado, o gestor muda o status para "Em análise" pela
 *      tela de detalhes, o demand-service emite a notificação push e o cidadão
 *      vê o novo status ao abrir a demanda.
 *
 * Limite da evidência do teste 3: o demand-service envia as notificações com um
 * POST para EXPO_PUSH_URL. No E2E essa variável aponta para um receptor local
 * (e2e/support/expo-push-mock.mjs, subido por backend/docker-compose.e2e.yml), e
 * o teste confere a mensagem que ele recebeu. Isso comprova que o SISTEMA EMITIU a
 * notificação destinada ao aparelho registrado do solicitante. Não comprova a
 * entrega pelo serviço real do Expo nem a exibição em um celular, que ficam fora
 * do ambiente automatizado. O app web também não tem tela de notificações; o que o
 * cidadão vê na web é o status atualizado da demanda.
 *
 * Sobre a comparação "pelo menos N" no teste 1: o /metrics conta as demandas
 * do banco inteiro, e o ambiente pode ter dados de outras execuções (ou de
 * outras pessoas, se o banco for compartilhado). Exigir igualdade exata
 * deixaria o teste frágil sem motivo. Conferir que o número subiu pelo menos
 * o tanto que foi criado ainda pega o problema real, que é o painel não
 * refletir as demandas novas.
 *
 * As métricas passam por cache no Redis. O demand-service limpa esse cache
 * quando uma demanda é criada, mas o recálculo pode levar um instante, então
 * o teste 1 recarrega a página e tenta de novo até os números aparecerem.
 *
 * Variáveis de ambiente (opcionais):
 *   E2E_API_URL      URL do api-gateway (padrão http://localhost:8080)
 *   E2E_GESTOR_CODE  código de cadastro de gestor da gestão geral
 *                    (padrão change-me-codigo-gestor, o mesmo do docker-compose)
 *   E2E_EXPO_MOCK_URL  URL do receptor que imita o Expo Push (ex.: http://127.0.0.1:4010).
 *                    Sem ela, o teste 3 é ignorado com o motivo explícito; com ela
 *                    definida e o receptor fora do ar, o teste falha.
 */

import { test, expect, APIRequestContext, Locator, Page, Response } from '@playwright/test';

const API_BASE_URL = process.env.E2E_API_URL ?? 'http://localhost:8080';
const CODIGO_GESTOR = process.env.E2E_GESTOR_CODE ?? 'change-me-codigo-gestor';
// Precisa passar na política de senha do auth-service (12+ caracteres, maiúscula,
// minúscula, número e símbolo) e não pode ser uma senha comum.
const SENHA_PADRAO = 'Cajueiro#Verde2026!';
// Mesma versão de frontend/src/constants/termos.ts e da variável TERMOS_VERSAO do auth-service.
const VERSAO_TERMOS = '1.0';
// Receptor local que imita o endpoint de envio do Expo Push (só existe no ambiente de E2E).
const EXPO_MOCK_URL = process.env.E2E_EXPO_MOCK_URL;

const CATEGORIA_TESTE = 'Manutenção de vias';
const REGIAO_TESTE = 'Região Metropolitana do Recife';
const QTD_DEMANDAS_CRIADAS = 2;

type Papel = 'cidadao' | 'gestor';
type StatusApi = 'EM_ANALISE' | 'RESOLVIDA';

interface UsuarioTeste {
  nome: string;
  email: string;
  senha: string;
}

/** Cria um usuário novo pela API de cadastro, já aceitando os termos (e com o código, no caso do gestor). */
async function criarUsuario(request: APIRequestContext, papel: Papel): Promise<UsuarioTeste> {
  const letraPapel = papel === 'gestor' ? 'g' : 'c';
  const sufixo = `${Date.now().toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`;
  const usuario: UsuarioTeste = {
    nome: papel === 'gestor' ? 'Gestor E2E Teste' : 'Cidadao E2E Teste',
    email: `e2e9${letraPapel}${sufixo}@t.co`,
    senha: SENHA_PADRAO,
  };

  const resposta = await request.post(`${API_BASE_URL}/auth/register`, {
    data: {
      nome: usuario.nome,
      email: usuario.email,
      senha: usuario.senha,
      papel,
      aceiteTermos: true,
      versaoTermos: VERSAO_TERMOS,
      ...(papel === 'gestor' ? { codigoAcesso: CODIGO_GESTOR } : {}),
    },
  });

  if (!resposta.ok()) {
    throw new Error(
      `Falha ao registrar usuário de teste (${papel}): ${resposta.status()} ${await resposta.text()}`
    );
  }

  // 202 quer dizer que o ambiente exige confirmar o e-mail antes do primeiro login.
  if (resposta.status() === 202) {
    throw new Error(
      'O cadastro pediu confirmação de e-mail (CONFIRMACAO_EMAIL_HABILITADA=true). ' +
        'Desligue essa opção no ambiente de testes para criar usuários direto pela API.'
    );
  }

  return usuario;
}

/** Faz login pela API e devolve o token. Serve só para montar os dados do teste. */
async function logarViaApi(request: APIRequestContext, usuario: UsuarioTeste): Promise<string> {
  const resposta = await request.post(`${API_BASE_URL}/auth/login`, {
    data: { email: usuario.email, senha: usuario.senha },
  });

  if (!resposta.ok()) {
    throw new Error(`Falha ao logar usuário de teste: ${resposta.status()} ${await resposta.text()}`);
  }

  const corpo = await resposta.json();
  if (!corpo.token) {
    throw new Error(
      'O login não devolveu token (conta com verificação em duas etapas?). Use contas sem MFA nos testes.'
    );
  }

  return corpo.token as string;
}

/** Registra uma demanda de Manutenção de vias na RMR e devolve o id dela. */
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
      endereco: 'Rua de Teste, 123 - Recife/PE',
      descricao: `Demanda criada pelo teste E2E do Cenário 9 (${titulo}).`,
      prioridade: 'MEDIA',
    },
  });

  if (!resposta.ok()) {
    throw new Error(`Falha ao criar demanda de teste: ${resposta.status()} ${await resposta.text()}`);
  }

  const corpo = await resposta.json();
  return corpo.id_denuncia as number;
}

/** Muda o status de uma demanda como gestor, direto pela API. */
async function atualizarStatusViaApi(
  request: APIRequestContext,
  tokenGestor: string,
  idDemanda: number,
  status: StatusApi
): Promise<void> {
  const resposta = await request.patch(`${API_BASE_URL}/demands/gestor/${idDemanda}/status`, {
    headers: { Authorization: `Bearer ${tokenGestor}` },
    data: { status },
  });

  if (!resposta.ok()) {
    throw new Error(
      `Falha ao mudar o status da demanda ${idDemanda} para ${status}: ${resposta.status()} ${await resposta.text()}`
    );
  }
}

/* ---------- Notificação push: aparelho do cidadão e receptor local do Expo ---------- */

interface MensagemPush {
  to: string;
  title?: string;
  body?: string;
  data?: { denunciaId?: number; status?: string };
}

function urlDoMock(): string {
  if (!EXPO_MOCK_URL) {
    throw new Error('E2E_EXPO_MOCK_URL não definida.');
  }
  return EXPO_MOCK_URL;
}

/** Registra o token do aparelho na conta do cidadão (o mesmo POST que o app mobile faz ao logar). */
async function registrarAparelho(
  request: APIRequestContext,
  tokenCidadao: string,
  tokenPush: string
): Promise<void> {
  const resposta = await request.post(`${API_BASE_URL}/demands/devices`, {
    headers: { Authorization: `Bearer ${tokenCidadao}` },
    data: { token: tokenPush },
  });

  if (resposta.status() !== 204) {
    throw new Error(`Falha ao registrar o aparelho: ${resposta.status()} ${await resposta.text()}`);
  }
}

/** Remove o aparelho da conta do cidadão (o mesmo DELETE que o app mobile faz ao sair). */
async function removerAparelho(
  request: APIRequestContext,
  tokenCidadao: string,
  tokenPush: string
): Promise<void> {
  const resposta = await request.delete(`${API_BASE_URL}/demands/devices`, {
    headers: { Authorization: `Bearer ${tokenCidadao}` },
    data: { token: tokenPush },
  });

  if (resposta.status() !== 204) {
    throw new Error(`Falha ao remover o aparelho: ${resposta.status()} ${await resposta.text()}`);
  }
}

/** Mensagens que o receptor recebeu para esse token. Cada teste usa um token só seu. */
async function mensagensDoMock(request: APIRequestContext, tokenPush: string): Promise<MensagemPush[]> {
  const resposta = await request.get(`${urlDoMock()}/messages`, { params: { to: tokenPush } });
  if (!resposta.ok()) {
    throw new Error(`Receptor do Expo respondeu ${resposta.status()} ao listar as mensagens.`);
  }
  return (await resposta.json()) as MensagemPush[];
}

async function limparMensagensDoMock(request: APIRequestContext, tokenPush: string): Promise<void> {
  await request.delete(`${urlDoMock()}/messages`, { params: { to: tokenPush } });
}

/* ---------- Painel: espera de carregamento e leitura dos números ---------- */

function chamadaDoPainel(caminho: '/metrics' | '/demands/gestor') {
  return (resposta: Response) =>
    new URL(resposta.url()).pathname === caminho && resposta.request().method() === 'GET';
}

/**
 * Espera o painel terminar de carregar: as métricas e a lista de demandas.
 * Quem chama precisa registrar a espera ANTES da ação que dispara o carregamento
 * (login ou reload), senão a resposta pode passar antes de alguém estar ouvindo.
 */
function esperarCarregamentoDoPainel(page: Page) {
  return Promise.all([
    page.waitForResponse(chamadaDoPainel('/metrics'), { timeout: 30_000 }),
    page.waitForResponse(chamadaDoPainel('/demands/gestor'), { timeout: 30_000 }),
  ]);
}

async function conferirCarregamento(page: Page, respostas: Response[]): Promise<void> {
  // Se as métricas falham, o painel cai em silêncio para a contagem da lista
  // (que só tem 100 itens). Melhor acusar o erro aqui do que ler número errado.
  for (const resposta of respostas) {
    expect(resposta.ok(), `${resposta.url()} respondeu ${resposta.status()}`).toBeTruthy();
  }
  await expect(page.getByRole('heading', { name: 'Painel de Gestão' })).toBeVisible();
  await expect(page.getByText('Atualizando lista...')).toHaveCount(0);
}

/** Login do gestor pela tela e espera o painel abrir já carregado. */
async function logarGestorNoPainel(page: Page, gestor: UsuarioTeste): Promise<void> {
  await page.goto('/logingestor');
  await page.getByPlaceholder('seu@email.com').fill(gestor.email);
  await page.getByPlaceholder('••••••••').fill(gestor.senha);

  const carregamento = esperarCarregamentoDoPainel(page);
  await page.getByRole('button', { name: 'ENTRAR' }).click();

  await expect(page).toHaveURL(/\/gestor\/dashboard$/);
  await conferirCarregamento(page, await carregamento);
}

/** Recarrega o painel. A sessão fica salva no localStorage, então o gestor continua logado. */
async function recarregarPainel(page: Page): Promise<void> {
  const carregamento = esperarCarregamentoDoPainel(page);
  await page.reload();

  await expect(page).toHaveURL(/\/gestor\/dashboard$/);
  await conferirCarregamento(page, await carregamento);
}

function blocoDoPainel(page: Page, titulo: string): Locator {
  return page.locator('div.bg-purple-600').filter({ hasText: titulo });
}

function contadorTotal(page: Page): Locator {
  return blocoDoPainel(page, 'Demandas registradas').locator('p.text-7xl');
}

async function lerTotal(page: Page): Promise<number> {
  const texto = await contadorTotal(page).innerText();
  return Number(texto.trim());
}

async function lerContagem(page: Page, tituloDoBloco: string, rotulo: string): Promise<number> {
  const linha = blocoDoPainel(page, tituloDoBloco)
    .locator('div.flex.items-center.justify-between.gap-1')
    .filter({ hasText: rotulo });
  const texto = await linha.locator('span.font-bold').innerText();
  return Number(texto.trim());
}

const lerContagemCategoria = (page: Page, categoria: string) =>
  lerContagem(page, 'Demandas por categoria', categoria);

const lerContagemRegiao = (page: Page, regiao: string) =>
  lerContagem(page, 'Demandas por região', regiao);

/* ---------- Painel: lista e filtro de status ---------- */

function cardsDaLista(page: Page): Locator {
  return page.locator('div.border.border-gray-200.rounded-lg.p-4');
}

async function filtrarPorStatus(page: Page, opcao: string): Promise<void> {
  const campoStatus = page
    .locator('div.flex.flex-col.gap-1')
    .filter({ has: page.locator('label', { hasText: 'Status' }) })
    .locator('select');

  await campoStatus.selectOption({ label: opcao });
  await page.getByRole('button', { name: 'Aplicar Filtro' }).click();
}

test.describe('Cenário 9 — Painel Administrativo do Gestor', () => {
  test('total, categoria e região sobem no painel depois que novas demandas são registradas', async ({
    page,
    request,
  }) => {
    test.setTimeout(120_000);

    const gestor = await criarUsuario(request, 'gestor');
    await logarGestorNoPainel(page, gestor);

    await expect(page.getByText('Demandas registradas')).toBeVisible();
    await expect(page.getByText('Demandas por categoria')).toBeVisible();
    await expect(page.getByText('Demandas por região')).toBeVisible();

    const totalAntes = await lerTotal(page);
    const categoriaAntes = await lerContagemCategoria(page, CATEGORIA_TESTE);
    const regiaoAntes = await lerContagemRegiao(page, REGIAO_TESTE);

    const cidadao = await criarUsuario(request, 'cidadao');
    const tokenCidadao = await logarViaApi(request, cidadao);

    for (let i = 0; i < QTD_DEMANDAS_CRIADAS; i++) {
      await criarDemandaDeTeste(request, tokenCidadao, `[E2E] Demanda painel ${Date.now()}-${i}`);
    }

    // O recálculo das métricas pode demorar um pouco, então recarrega e confere de novo até aparecer.
    await expect(async () => {
      await recarregarPainel(page);

      expect(await lerTotal(page)).toBeGreaterThanOrEqual(totalAntes + QTD_DEMANDAS_CRIADAS);
      expect(await lerContagemCategoria(page, CATEGORIA_TESTE)).toBeGreaterThanOrEqual(
        categoriaAntes + QTD_DEMANDAS_CRIADAS
      );
      expect(await lerContagemRegiao(page, REGIAO_TESTE)).toBeGreaterThanOrEqual(
        regiaoAntes + QTD_DEMANDAS_CRIADAS
      );
    }).toPass({ timeout: 60_000, intervals: [2_000, 3_000, 5_000] });
  });

  test('o filtro de status separa as demandas abertas, em análise e resolvidas', async ({
    page,
    request,
  }) => {
    test.setTimeout(90_000);

    const marca = Date.now();
    const tituloAberta = `[E2E] Painel aberta ${marca}`;
    const tituloEmAnalise = `[E2E] Painel em analise ${marca}`;
    const tituloResolvida = `[E2E] Painel resolvida ${marca}`;
    const todosOsTitulos = [tituloAberta, tituloEmAnalise, tituloResolvida];

    // Três demandas novas, uma em cada status. A "aberta" fica como nasceu.
    const cidadao = await criarUsuario(request, 'cidadao');
    const tokenCidadao = await logarViaApi(request, cidadao);
    await criarDemandaDeTeste(request, tokenCidadao, tituloAberta);
    const idEmAnalise = await criarDemandaDeTeste(request, tokenCidadao, tituloEmAnalise);
    const idResolvida = await criarDemandaDeTeste(request, tokenCidadao, tituloResolvida);

    const gestor = await criarUsuario(request, 'gestor');
    const tokenGestor = await logarViaApi(request, gestor);
    await atualizarStatusViaApi(request, tokenGestor, idEmAnalise, 'EM_ANALISE');
    await atualizarStatusViaApi(request, tokenGestor, idResolvida, 'RESOLVIDA');

    await logarGestorNoPainel(page, gestor);

    const cards = cardsDaLista(page);
    const cardDe = (titulo: string) => cards.filter({ hasText: titulo });

    // Sem filtro, as três aparecem, cada uma com o seu status.
    await expect(cardDe(tituloAberta).getByText('Aberta', { exact: true })).toBeVisible();
    await expect(cardDe(tituloEmAnalise).getByText('Em Análise', { exact: true })).toBeVisible();
    await expect(cardDe(tituloResolvida).getByText('Resolvida', { exact: true })).toBeVisible();

    const filtros = [
      { opcao: 'Aberta', titulo: tituloAberta },
      { opcao: 'Em Análise', titulo: tituloEmAnalise },
      { opcao: 'Resolvida', titulo: tituloResolvida },
    ];

    for (const filtro of filtros) {
      await filtrarPorStatus(page, filtro.opcao);

      // Só a demanda daquele status continua na lista; as outras duas saem.
      await expect(cardDe(filtro.titulo)).toBeVisible();
      for (const outroTitulo of todosOsTitulos.filter((t) => t !== filtro.titulo)) {
        await expect(cardDe(outroTitulo)).toHaveCount(0);
      }

      // Todos os cards que sobraram têm o status filtrado, e o contador do
      // painel bate com a quantidade de cards na tela.
      const qtdCards = await cards.count();
      await expect(
        cards.filter({ has: page.getByText(filtro.opcao, { exact: true }) })
      ).toHaveCount(qtdCards);
      await expect(contadorTotal(page)).toHaveText(String(qtdCards));
    }

    // Limpar o filtro traz as três de volta.
    await page.getByRole('button', { name: 'Limpar' }).click();
    for (const titulo of todosOsTitulos) {
      await expect(cardDe(titulo)).toBeVisible();
    }
  });

  test('o gestor muda o status pela tela, a notificação push é registrada no receptor do Expo e o cidadão vê o novo status', async ({
    page,
    request,
    browser,
    baseURL,
  }) => {
    test.skip(
      !EXPO_MOCK_URL,
      'Defina E2E_EXPO_MOCK_URL (receptor do Expo Push, ver backend/docker-compose.e2e.yml) para rodar este teste.'
    );
    test.setTimeout(120_000);

    // Falha clara (e não verde falso) se o ambiente foi configurado mas o receptor não está no ar.
    const saude = await request.get(`${urlDoMock()}/health`).catch(() => null);
    expect(saude?.ok(), `Receptor do Expo Push não respondeu em ${urlDoMock()}/health`).toBeTruthy();

    // Token e título únicos: o teste só enxerga a mensagem dele, mesmo com outros dados no ambiente.
    // O título fica bem abaixo do limite de 50 caracteres do backend (cerca de 28).
    const marca = `${Date.now().toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`;
    const titulo = `[E2E] Notificação ${marca}`;
    const tokenPush = `ExponentPushToken[e2e-${marca}]`;

    // ---------- Arrange: cidadão com demanda ----------
    const cidadao = await criarUsuario(request, 'cidadao');
    const tokenCidadao = await logarViaApi(request, cidadao);
    // A demanda vem antes do aparelho: é ela que cria o registro do cidadão no demand-service.
    const idDemanda = await criarDemandaDeTeste(request, tokenCidadao, titulo);

    try {
      // ---------- Arrange: aparelho registrado ----------
      await registrarAparelho(request, tokenCidadao, tokenPush);
      await limparMensagensDoMock(request, tokenPush);

      // ---------- Act 1: o gestor abre a demanda pela interface ----------
      const gestor = await criarUsuario(request, 'gestor');
      await logarGestorNoPainel(page, gestor);

      const card = cardsDaLista(page).filter({ hasText: titulo });
      await expect(card).toBeVisible();
      await card.getByRole('button', { name: 'Ver Detalhes' }).click();
      await expect(page).toHaveURL(new RegExp(`/gestor/demandas/${idDemanda}$`));

      // ---------- Act 2: o gestor muda o status para "Em análise" ----------
      // A tela não tem nome acessível nos botões ✏️ e ✓; o bloco é localizado pelo rótulo "Status Atual".
      const linhaStatus = page.getByText('Status Atual', { exact: true }).locator('xpath=..');
      const blocoStatus = linhaStatus.locator('xpath=..');
      await expect(blocoStatus).toContainText('Aberta');

      await linhaStatus.getByRole('button').click(); // ✏️ entra em modo de edição
      await page.locator('select').selectOption('Em análise');

      // A espera é registrada antes do clique, senão a resposta pode passar antes de alguém ouvir.
      const respostaDoPatch = page.waitForResponse(
        (resposta) =>
          resposta.request().method() === 'PATCH' &&
          new URL(resposta.url()).pathname === `/demands/gestor/${idDemanda}/status`
      );
      await page.getByRole('button', { name: '✓' }).click();
      const patch = await respostaDoPatch;
      expect(patch.ok(), `PATCH do status respondeu ${patch.status()}`).toBeTruthy();
      await expect(blocoStatus).toContainText('Em análise');

      // ---------- Assert 1: o demand-service enviou a notificação ao receptor do Expo ----------
      // O envio é assíncrono (sai depois da resposta ao gestor), então consulta o receptor até chegar,
      // com limite de tempo explícito. Isso prova a emissão; não prova entrega ao aparelho.
      await expect
        .poll(async () => (await mensagensDoMock(request, tokenPush)).length, {
          message: 'O demand-service não enviou a notificação ao receptor do Expo Push',
          timeout: 15_000,
          intervals: [250, 500, 1_000],
        })
        .toBe(1);

      const [mensagem] = await mensagensDoMock(request, tokenPush);
      expect(mensagem.to).toBe(tokenPush);
      expect(mensagem.title).toBe('Sua denúncia foi atualizada');
      expect(mensagem.body).toContain(`"${titulo}"`);
      expect(mensagem.body).toContain('em análise');
      expect(mensagem.data).toMatchObject({ denunciaId: idDemanda, status: 'EM_ANALISE' });

      // ---------- Assert 2: o cidadão acompanha o novo status pela interface ----------
      // Contexto novo, para não herdar a sessão do gestor guardada no navegador.
      const contextoCidadao = await browser.newContext({ baseURL });
      try {
        const paginaCidadao = await contextoCidadao.newPage();
        await paginaCidadao.goto('/login');
        await paginaCidadao.getByPlaceholder('seu@email.com').fill(cidadao.email);
        await paginaCidadao.getByPlaceholder('••••••••').fill(cidadao.senha);
        await paginaCidadao.getByRole('button', { name: 'ENTRAR' }).click();
        await expect(paginaCidadao).toHaveURL(/\/telaUsuario/);

        const cardDoCidadao = paginaCidadao
          .locator('div.border.border-gray-200.rounded-lg.p-4')
          .filter({ hasText: titulo });
        await expect(cardDoCidadao).toBeVisible();
        await cardDoCidadao.getByRole('button', { name: 'Ver Detalhes' }).click();
        // Timeout maior: na primeira visita a /demandas/[id] o modo dev compila a rota sob demanda.
        await expect(paginaCidadao).toHaveURL(new RegExp(`/demandas/${idDemanda}$`), { timeout: 30_000 });

        const statusParaOCidadao = paginaCidadao
          .getByText('Status Atual', { exact: true })
          .locator('xpath=../..');
        await expect(statusParaOCidadao).toContainText('Em análise');
      } finally {
        await contextoCidadao.close();
      }
    } finally {
      // Limpeza em qualquer desfecho. Cada passo é independente e não pode esconder a falha original do teste.
      await limparMensagensDoMock(request, tokenPush).catch(() => undefined);
      await removerAparelho(request, tokenCidadao, tokenPush).catch(() => undefined);
    }
  });
});
