# RESOLVE — Testes E2E (Playwright + TypeScript)

Suíte de testes End-to-End do RESOLVE. Cada arquivo em `tests/` automatiza um
dos cenários de uso combinados em grupo, executado a partir da perspectiva
real do usuário (navegador controlado pelo Playwright).

## Entrega individual — aquilespereira (C1)

**Arquivo:** [`tests/01-cadastros-sucesso.spec.ts`](tests/01-cadastros-sucesso.spec.ts)

**Cenário 1 — Cidadão solicita uma nova demanda urbana**

> Como Cidadão, preencho o formulário de solicitação urbana informando os
> dados obrigatórios (descrição detalhada, categoria válida, região
> correspondente e nível de prioridade adequado) e confirmo o envio da nova
> demanda para o sistema.

O teste:
1. Cria um cidadão de teste via API.
2. Faz login pela interface.
3. Acessa o formulário de nova demanda.
4. Preenche os campos obrigatórios (categoria, problema, região, endereço e
   descrição) e confirma que cada `<select>`/campo ficou com o valor certo.
5. Envia a nova demanda ("Salvar Denúncia").
6. Confirma o redirecionamento de volta pra listagem (`/telaUsuario`).
7. Confirma que o card da demanda recém-criada aparece no topo da lista,
   com a categoria e o problema cadastrados.

```bash
cd backend
docker compose up -d --build

cd ../e2e
npx playwright test tests/01-cadastros-sucesso.spec.ts
```

---

## Entrega individual — Icaro (C2)

**Arquivo:** [`tests/02-validacao-campos-obrigatorios-nova-demanda.spec.ts`](tests/02-validacao-campos-obrigatorios-nova-demanda.spec.ts)

**Cenário 2 — Cidadão tenta submeter o formulário de demanda em branco**

> Como Cidadão, tento submeter o formulário de demanda com os campos
> obrigatórios em branco, verificando se o sistema exibe as mensagens de
> validação e bloqueia o envio.

O teste:
1. Cria um cidadão de teste via API e faz login real pela interface.
2. Acessa o formulário de nova demanda (`/demandas/nova`).
3. Clica em "Salvar Denúncia" sem preencher nenhum campo — confirma que o
   envio foi bloqueado (a página continua em `/demandas/nova`) e que o
   primeiro campo obrigatório (Categoria) é sinalizado como inválido.
4. Preenche só Categoria, Problema e Região (deixando Endereço e Descrição
   em branco) e tenta enviar de novo — confirma que continua bloqueado e
   que agora é o campo Endereço que aparece como inválido.

> 💡 Nota de implementação: todos os campos do formulário usam o atributo
> HTML `required`, então quem valida é o próprio navegador (Constraint
> Validation API) — o evento `submit` nem chega a disparar o handler React
> enquanto houver campo obrigatório vazio. Por isso o teste confere
> `validity`/`validationMessage` dos campos em vez de procurar por um
> alerta na tela.

```bash
cd backend
docker compose up -d --build

cd ../e2e
npx playwright test tests/02-validacao-campos-obrigatorios-nova-demanda.spec.ts
```

---

## Entrega individual — Icaro (C3)

**Arquivo:** [`tests/03-busca-global-por-palavra-chave.spec.ts`](tests/03-busca-global-por-palavra-chave.spec.ts)

**Cenário 3 — Cidadão usa a busca global por palavra-chave**

> Como Cidadão, utilizo o campo de busca global digitando uma palavra-chave
> para verificar se a lista exibe apenas as solicitações que contêm o termo
> pesquisado.

O teste (assumindo a busca implementada):
1. Cria um cidadão de teste via API.
2. Cria, via API, duas demandas do cidadão com títulos únicos: uma contendo
   a palavra-chave do teste, outra sem ela.
3. Faz login real pela interface e vai pra listagem (`/telaUsuario`).
4. Digita a palavra-chave no campo de busca global.
5. Confirma que só o card da demanda que contém o termo pesquisado continua
   visível, e que o card da demanda sem o termo desaparece.

> ⚠️ **Feature ainda não implementada:** hoje a seção "Filtros de busca" da
> tela inicial só tem dropdowns (Status/Categoria/Região/Prioridade) — não
> existe campo de texto livre pra buscar por palavra-chave no
> título/descrição. Este teste documenta o comportamento esperado (spec) e
> está marcado com `test.fail()` — ou seja, hoje ele falha (elemento não
> encontrado) e isso é esperado, o Playwright reporta como "expected fail".
> Quando alguém implementar a busca, ajustar o seletor
> (`placeholder="Buscar por palavra-chave..."`) se necessário e remover o
> `test.fail()`.

```bash
cd backend
docker compose up -d --build

cd ../e2e
npx playwright test tests/03-busca-global-por-palavra-chave.spec.ts
```

---

## Entrega individual — Cecília Medeiros (C4)

**Arquivo:** [`tests/4-validacao-filtros.spec.ts`](tests/04-validacao-filtros.spec.ts)

**Cenário 4 — Cidadão filtra demandas por Categoria e Região**

> Como Cidadão, quero aplicar simultaneamente os filtros de Categoria e Região
> na tela inicial, para visualizar apenas as demandas que correspondam aos
> critérios selecionados.

O teste:
1. Cria (via API, para preparar o cenário) um cidadão de teste e obtém o token de autenticação.
2. Cria (via API) duas demandas de teste: 
   * Demandas válida: categoria "Manutenção de vias" + região "Região Metropolitana do Recife";
   * Demanda inválida: mesma categoria + região "Outra".
3. Faz login real pela UI (/login) e confirma o redirecionamento para /telaUsuario.
4. Seleciona simultaneamente os dois filtros nos `<select>` da tela inicial (Categoria e Região).
5. Aguarda a atualização da lista tratada via API (waitForResponse).
6. Valida o resultado na interface:
   * Confirma que o card da demanda correspondente aos dois critérios está visível (toBeVisible).
   * Confirma que o card da demanda de região diferente não é exibido na tela (toHaveCount(0)).

```bash
cd backend
docker compose up -d --build

cd ../e2e
npx playwright test tests/04-validacao-filtros.spec.ts
```

---

## Entrega individual — Beatriz Paredes (C5)

**Arquivo:** `tests/05-navegacao_e_paginacao_da_listagem_de_solicitacoes.spec.ts`

**Cenário 5 — Cidadão navega pelas páginas da listagem de solicitações**

> Como Cidadão, navego pela listagem de solicitações, garantindo que
> consigo visualizar as demandas cadastradas e avançar entre as páginas
> sem perder o acesso à tela.

O teste:
1. Cria um cidadão via API para preparar o cenário.
2. Realiza login via API para obter o token de autenticação.
3. Cria 15 demandas de teste vinculadas ao cidadão.
4. Faz login real pela interface em `/login`.
5. Confirma o redirecionamento para `/telaUsuario`.
6. Verifica se os cards de demandas são exibidos na listagem.
7. Localiza o botão de próxima página e realiza a navegação, quando disponível.
8. Confirma que o usuário permanece na tela de listagem após a navegação.

```bash
cd e2e
npx playwright test tests/05-navegacao_e_paginacao_da_listagem_de_solicitacoes.spec.ts
```

---

## Entrega individual — Thays Barbosa (C6)

**Arquivo:** [`tests/06-validar-demanda.spec.ts`](tests/06-validar-demanda.spec.ts)

**Cenário 6 — Detalhes da demanda**

> Como Cidadão, acesso a página de detalhes de uma solicitação específica e
> verifico se o histórico de atualizações e as informações do registro são
> exibidos corretamente.

O componente `DemandDetails.tsx` hoje só renderiza o estado atual da
demanda (foto, categoria, prioridade, status atual, solicitante, endereço,
data do registro, descrição) — não existe seção de histórico/timeline, nem
campo de histórico no tipo `Demand`. Por isso o arquivo tem dois testes:

1. **Informações do registro** (deve passar) — a demanda é criada pelo
   formulário (mesmo fluxo do Cenário 1), abre os detalhes a partir do card
   e confere problema, categoria, endereço e descrição na tela.
2. **Histórico de atualizações** — marcado com `test.fail()` dentro do
   próprio corpo do teste, porque a funcionalidade ainda não foi
   implementada. A demanda aqui é criada via API (arrange rápido, mesmo
   padrão do Cenário 8), deixando o teste focado só na asserção que
   importa: a seção de histórico que ainda não existe.

```bash
cd backend
docker compose up -d --build

cd ../e2e
npx playwright test tests/06-validar-demanda.spec.ts
```

---

## Entrega individual — Leandro (C7)

**Arquivo:** [`tests/07-detalhes-demanda.spec.ts`](tests/07-detalhes-demanda.spec.ts)

**Cenário 7 — Cidadão visualiza os detalhes de uma demanda**

> Como Cidadão, acesso a tela de detalhes de uma demanda que registrei,
> garantindo que todas as informações (categoria, prioridade, endereço e
> descrição) estejam corretas e batam com o que foi cadastrado.

O teste:
1. Cria (via API, só pra preparar o cenário) um cidadão e uma demanda de
   teste com título, endereço e descrição conhecidos.
2. Faz **login real na tela do cidadão** (`/login`) pela UI.
3. Na listagem (`/telaUsuario`), localiza o card da demanda recém-criada e
   confere categoria ("Manutenção de vias") e prioridade ("Média") já ali.
4. Clica em "Ver Detalhes" e é levado para `/demandas/{id}`.
5. Confirma que a tela de detalhes exibe corretamente título, categoria,
   prioridade, endereço e descrição cadastrados.
6. Clica em "← Voltar para Lista" (navegação real, sem reload manual) e
   confirma que o **card da mesma demanda continua visível** na listagem —
   ou seja, a navegação de ida e volta não perde nem corrompe os dados.

> ✅ Validado rodando localmente (`1 passed`, duas execuções seguidas) com o
> backend subido via `docker compose up -d --build` (pasta `backend/`) e o
> front-end pelo próprio `webServer` do Playwright.

```bash
# a partir da raiz do projeto
cd backend
docker compose up -d --build

cd ../e2e
npx playwright test tests/07-detalhes-demanda.spec.ts
```

---

## Entrega individual — Gabriel Souza (C8)

**Arquivo:** [`tests/08-alterar-prioridade-demanda.spec.ts`](tests/08-alterar-prioridade-demanda.spec.ts)

**Cenário 8 — Gestor Público altera a prioridade de uma demanda**

> Como Gestor Público, modifico o nível de prioridade de uma demanda
> existente no sistema, garantindo que o novo nível seja salvo e refletido
> no card da solicitação.

O teste:
1. Cria (via API, só pra preparar o cenário) um cidadão e uma demanda de
   teste com prioridade inicial **Baixa**, e uma conta de gestor.
2. Faz **login real na tela do gestor** (`/logingestor`) pela UI.
3. Encontra o card da demanda recém-criada no painel (`/gestor/dashboard`)
   e confirma que ela começa como "Baixa".
4. Abre os detalhes da demanda, edita a prioridade para **Alta** e salva.
5. Confirma que a tela de detalhes já mostra "Alta".
6. Volta para a listagem e confirma que o **card também mostra "Alta"** —
   ou seja, a alteração foi realmente salva e refletida na lista, não só na
   tela de detalhes.

> ⚠️ Nota pro grupo: na árvore de pastas combinada, o slot `08-*` estava
> reservado pra "filtros-demanda" e não havia nenhum arquivo pro cenário de
> alterar prioridade. Usei `08-alterar-prioridade-demanda.spec.ts` seguindo
> o número do cenário original (Cenário 8 da lista do WhatsApp) — ajustem o
> número/nome na hora de consolidar a suíte se já tiver conflito com o
> arquivo de outra pessoa.

```bash
cd backend
docker compose up -d --build

cd ../e2e
npx playwright test tests/08-alterar-prioridade-demanda.spec.ts
```

---

## Entrega individual — Thays Barbosa (C9)

**Arquivo:** [`tests/09-atualizar-status.spec.ts`](tests/09-atualizar-status.spec.ts)

**Cenário 9 — Painel Administrativo do Gestor**

> Como Gestor Público, acesso o Painel Administrativo e valido a exibição e
> o carregamento correto dos principais indicadores operacionais (como
> volume de demandas abertas, em andamento e encerradas).

Hoje o painel (`frontend/src/app/gestor/dashboard/page.tsx`) só mostra três
blocos — total de demandas, por categoria e por região — vindos do
`apiMetrics` (`useDemandStore.fetchMetrics` → `metricsService.getKpis`). O
tipo que `getKpis` retorna não tem `byStatus` em lugar nenhum, então o
indicador de abertas/em andamento/encerradas que o enunciado pede ainda não
existe. Por isso o arquivo tem dois testes:

1. **Indicadores que já existem** (total, categoria, região) — deve
   passar: cria demandas conhecidas via API e confere que os números sobem
   depois de recarregar o painel (comparando com "aumentou pelo menos N",
   pra não ficar instável à toa já que `apiMetrics` é um contador global
   compartilhado com os outros cenários rodando ao mesmo tempo).
2. **Indicadores por status** — marcado com `test.fail()` dentro do
   próprio corpo do teste, porque o `byStatus` ainda não foi implementado.

> 🐛 **Achado rodando localmente:** o primeiro teste (indicadores de
> total/categoria/região) é instável nessa suíte — descobrimos que ele cai,
> às vezes, no mesmo bug do Cenário 10 (**BUG-04**, ver
> `RELATORIO_BUGS.md`): o guard da rota `/gestor/dashboard` roda antes do
> Zustand terminar de reidratar o token salvo, então o segundo
> `page.goto('/gestor/dashboard')` do teste ocasionalmente chuta o gestor
> de volta pro login. Não é um problema deste teste especificamente — é o
> mesmo bug de corrida documentado no Cenário 10, só que este cenário
> também dá `page.goto` no painel e por isso também fica exposto a ele.

```bash
cd backend
docker compose up -d --build

cd ../e2e
npx playwright test tests/09-atualizar-status.spec.ts
```

---

## Entrega individual — ArthurEstevaum (C10)

**Arquivo:** [`tests/10-acesso-nao-autorizado-painel-gestor.spec.ts`](tests/10-acesso-nao-autorizado-painel-gestor.spec.ts)

**Cenário 10 — Acesso não autorizado ao Painel do Gestor**

> Como Cidadão não autorizado, tento acessar diretamente a URL do Painel do
> Gestor via navegação, garantindo que o sistema bloqueia o acesso e
> redireciona para o login.

O arquivo tem quatro testes, cobrindo as duas faces do "não autorizado", a
checagem de back-end e o outro lado da regra de autorização:

1. **Visitante sem login** digita direto as URLs protegidas
   (`/gestor/dashboard`, `/gestor` e `/gestor/demandas/{id}`). Para cada
   uma, confirma que a URL final é `/logingestor`, que o formulário de
   login do gestor está na tela e que **nenhum conteúdo do painel vazou**
   (nem o título "Painel de Gestão", nem cards de demanda). Confirma também
   que o navegador **não chegou a chamar** as rotas de gestor da API
   (`/demands/gestor`, `/metrics`) — o bloqueio acontece antes de qualquer
   tentativa de buscar dados.
2. **Cidadão autenticado** (papel `cidadao`) faz login real pela UI em
   `/login` e, já com sessão válida, tenta `/gestor/dashboard`. Também é
   barrado — ou seja, o guard valida **papel**, não só "tem token".
3. **Defesa em profundidade:** direto na API, `GET /demands/gestor` sem
   token responde `401` e, com token de cidadão, responde `403`.
4. **Gestor legítimo continua no painel após um F5** — marcado com
   `test.fail()`, porque **hoje isso está quebrado** (ver BUG-04 no
   `RELATORIO_BUGS.md`).

> 🐛 **Bug encontrado escrevendo este cenário (BUG-04):** o guard das páginas
> do gestor roda antes de o Zustand reidratar o token do `localStorage`, então
> *qualquer* carga direta de URL derruba o usuário pro login — inclusive um
> gestor legítimo dando F5 no próprio painel. Quando o BUG-04 for corrigido,
> o Playwright vai acusar "unexpected pass" nele — aí é só remover o `test.fail()`.

> ✅ Validado localmente: `4 passed` (3 testes + 1 expected fail), estável em
> 3 execuções seguidas, com o backend subido via `docker compose` e o front-end
> pelo `webServer` do Playwright.

```bash
cd backend
docker compose up -d --build

cd ../e2e
npx playwright test tests/10-acesso-nao-autorizado-painel-gestor.spec.ts
```

---

## Entrega individual — Isabella Batista (C11)

**Arquivo:** [`tests/11-logout.spec.ts`](tests/11-logout.spec.ts)

**Cenário 11 — Encerramento de sessão (Logout)**

> Como usuário autenticado, clico na opção de encerrar sessão (Logout),
> verificando o redirecionamento para a tela inicial e a limpeza dos
> dados de sessão no navegador.

O teste:
1. Cria (via API, só pra preparar o cenário) um cidadão de teste.
2. Faz **login real pela UI** (`/login`).
3. Confirma que a sessão está ativa pelo nome do usuário no header.
4. Clica em "Sair".
5. Confirma o redirecionamento para `/login`.
6. Tenta acessar `/telaUsuario` diretamente e confirma que é barrado de volta
   para `/login` — o guard de autenticação funciona após o logout.
7. Lê o `localStorage` e confirma que token, papel, e-mail e nome foram
   efetivamente limpos pelo Zustand.

```bash
cd backend
docker compose up -d --build

cd ../e2e
npx playwright test tests/11-logout.spec.ts
```

---

## Como rodar

Pré-requisitos: **Docker Desktop** e **Node.js 22 (LTS)** instalados. O frontend
usa Next 16, que exige Node `>= 20.9`.

```bash
# 1. Sobe o backend (postgres, redis e os microsserviços)
cd backend
docker compose up -d --build

# 2. Instala dependências e roda os testes
cd ../e2e
npm install
npx playwright install chromium   # baixa o navegador usado pelos testes (1x só)
npm test
```

O que acontece quando você roda `npm test`:
- O Playwright sobe sozinho o front-end (`npm run dev` dentro de
  `../frontend`) em `http://localhost:3000`, então **não precisa rodar o
  front-end manualmente antes**.
- O front-end já está configurado para falar com o backend local
  (`http://localhost:8080` — ver `frontend/.env.local`). Os usuários e
  demandas de teste são criados com e-mails únicos gerados por timestamp
  para não colidir entre execuções.

Outros comandos úteis:

```bash
npm run test:headed   # roda com o navegador visível (bom pra ver o fluxo acontecendo)
npm run test:ui       # abre o modo interativo (UI Mode) do Playwright
npm run report        # abre o relatório HTML da última execução
```

### Rodando um cenário específico

```bash
npx playwright test tests/11-logout.spec.ts
```

### Rodando contra outro backend ou front-end

Se quiser apontar para outra instância do backend ou front-end, use variáveis
de ambiente:

```bash
E2E_API_URL=http://localhost:8080 E2E_BASE_URL=http://localhost:3000 npm test
```

### Sem Docker? Rodando o backend 100% local (sem containers)

Se sua máquina/VM não roda Docker, dá pra subir os serviços direto com Node,
sem container nenhum — só precisa de um PostgreSQL rodando localmente.

```bash
# 1. Crie um banco com os dois schemas que o Prisma espera
createdb -U postgres smartcity_local
psql -U postgres -d smartcity_local -c "CREATE SCHEMA demand;"

# 2. Suba os 3 serviços (cada um em um terminal)
cd backend/auth-service
DATABASE_URL_AUTH="postgresql://postgres:SUA_SENHA@localhost:5432/smartcity_local?schema=public" \
JWT_SECRET="dev-secret" PORT=3001 npm install && npx prisma migrate deploy && npm run dev

cd backend/demand-service
DATABASE_URL_DEMAND="postgresql://postgres:SUA_SENHA@localhost:5432/smartcity_local?schema=demand" \
JWT_SECRET="dev-secret" PORT=3002 npm install && npx prisma migrate deploy && npm run dev

cd backend/api-gateway
AUTH_SERVICE_URL="http://localhost:3001" DEMAND_SERVICE_URL="http://localhost:3002" \
PORT=8080 npm install && npm run dev

# 3. Rode os testes
cd e2e
npm test
```

## Estrutura

```
e2e/
├── tests/
│   ├── 01-cadastros-sucesso.spec.ts
│   ├── 02-validacao-campos-obrigatorios-nova-demanda.spec.ts
│   ├── 03-busca-global-por-palavra-chave.spec.ts
│   ├── 04-validacao-filtros.spec.ts
│   ├── 05-navegação_e_paginacao_da_listagem_de_solicitacoes.spec.ts
│   ├── 06-validar-demanda.spec.ts
│   ├── 07-detalhes-demanda.spec.ts
│   ├── 08-alterar-prioridade-demanda.spec.ts
│   ├── 09-atualizar-status.spec.ts
│   ├── 10-acesso-nao-autorizado-painel-gestor.spec.ts
│   └── 11-logout.spec.ts
├── package.json
├── playwright.config.ts
└── tsconfig.json
```
