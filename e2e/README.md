# RESOLVE — Testes E2E (Playwright + TypeScript)

Suíte de testes End-to-End do RESOLVE. Cada arquivo em `tests/` automatiza um
dos cenários de uso combinados em grupo, executado a partir da perspectiva
real do usuário (navegador controlado pelo Playwright).

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
> front-end pelo próprio `webServer` do Playwright. O backend compartilhado
> do Render estava com rate limit (`429 Too Many Requests`) no momento do
> teste, então a validação final foi feita 100% local — ver comando abaixo.

```bash
# a partir da raiz do projeto
cd backend
docker compose up -d --build      # sobe postgres, redis e os 3 serviços + gateway

cd ../e2e
E2E_API_URL=http://localhost:8080 npx playwright test tests/07-detalhes-demanda.spec.ts
```

## Cenário 10 — Acesso não autorizado ao Painel do Gestor

**Arquivo:** [`tests/10-acesso-nao-autorizado-painel-gestor.spec.ts`](tests/10-acesso-nao-autorizado-painel-gestor.spec.ts)

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
   token responde `401` e, com token de cidadão, responde `403` — o
   bloqueio não depende só do front-end.
4. **Gestor legítimo continua no painel após um F5** — marcado com
   `test.fail()`, porque **hoje isso está quebrado** (ver BUG-04 no
   `RELATORIO_BUGS.md`).

> 🐛 **Bug encontrado escrevendo este cenário (BUG-04):** o guard das páginas
> do gestor roda antes de o Zustand reidratar o token do `localStorage`, então
> *qualquer* carga direta de URL derruba o usuário pro login — inclusive um
> gestor legítimo dando F5 no próprio painel. Consequência para esta suíte: os
> testes 1 e 2 confirmam o comportamento que o cenário exige (bloquear e
> redirecionar), mas o teste 2 **não prova sozinho** que a checagem de papel
> funciona — hoje ele passaria mesmo sem ela. Quem fixa o outro lado da regra
> é o teste 4. Quando o BUG-04 for corrigido, o Playwright vai acusar
> "unexpected pass" nele — aí é só remover o `test.fail()`.

> ⚠️ Nota pro grupo: o slot `10-*` foi escolhido por ser o próximo número
> livre na pasta (existem 01, 02, 03, 07 e 08). Ajustem o número/nome na
> hora de consolidar a suíte se ele conflitar com o cenário de outra pessoa.

> ✅ Validado localmente: `4 passed` (3 testes + 1 expected fail), estável em
> 3 execuções seguidas (`--repeat-each=3` → `12 passed`), com o backend subido
> via `docker compose` e o front-end pelo `webServer` do Playwright:
> `E2E_API_URL=http://localhost:8080 npx playwright test tests/10-acesso-nao-autorizado-painel-gestor.spec.ts`

## Como rodar

Pré-requisitos: Node.js 22 (LTS) instalado. O frontend usa Next 16, que exige
Node `>= 20.9` — o "18+" que estava aqui antes não serve mais.

> 💡 Usa Nix/NixOS? `nix develop` na raiz do projeto já entrega o Node 22 e os
> navegadores do Playwright prontos, dispensando o
> `npx playwright install chromium` do passo abaixo. Ver "Ambiente reprodutível
> com Nix" no README raiz.

```bash
cd e2e
npm install
npx playwright install chromium   # baixa o navegador usado pelos testes (1x só)
npm test
```

O que acontece quando você roda `npm test`:
- O Playwright sobe sozinho o front-end (`npm run dev` dentro de
  `../frontend`) em `http://localhost:3000`, então **não precisa rodar o
  front-end manualmente antes**.
- O front-end, por padrão, já fala com o backend publicado no Render
  (`https://smart-city-6.onrender.com` — ver `frontend/src/lib/api.ts`),
  então **também não é preciso subir o backend local com Docker** pra esse
  teste passar. Os usuários e a demanda de teste são criados de verdade
  nesse ambiente compartilhado, com e-mails únicos gerados por timestamp
  pra não colidir com dados de outros testes/pessoas.

Outros comandos úteis:

```bash
npm run test:headed   # roda com o navegador visível (bom pra ver o fluxo acontecendo)
npm run test:ui       # abre o modo interativo (UI Mode) do Playwright
npm run report        # abre o relatório HTML da última execução
```

### Rodando contra outro backend/front-end

Se quiser apontar para uma instância local do backend (subida com Docker,
seguindo o README raiz do projeto) ou outra URL de front-end, use variáveis
de ambiente:

```bash
E2E_API_URL=http://localhost:8080 E2E_BASE_URL=http://localhost:3000 npm test
```

`E2E_API_URL` é repassado automaticamente também pro processo do front-end
(como `NEXT_PUBLIC_API_GATEWAY_URL`, a mesma env var que `frontend/src/lib/api.ts`
usa) — assim o navegador conversa com o mesmo backend que o teste está usando,
em vez de continuar batendo no Render por padrão.

### Sem Docker? Rodando o backend 100% local (sem containers)

Se sua máquina/VM não roda Docker (foi o meu caso), dá pra subir os serviços
direto com Node, sem container nenhum — só precisa de um PostgreSQL rodando
(local, fora do Docker). O `demand-service` também usa Redis, mas só pra
publicar um evento na troca de **status** (não na de prioridade) e falha
silenciosamente se o Redis estiver fora do ar — então nem precisa dele pra
esse cenário.

```bash
# 1. Crie um banco com os dois schemas que o Prisma espera
createdb -U postgres smartcity_local
psql -U postgres -d smartcity_local -c "CREATE SCHEMA demand;"

# 2. Suba os 3 serviços (cada um em um terminal), apontando pro Postgres local
cd backend/auth-service
DATABASE_URL_AUTH="postgresql://postgres:SUA_SENHA@localhost:5432/smartcity_local?schema=public" \
JWT_SECRET="dev-secret" PORT=3001 npm install && npx prisma migrate deploy && npm run dev

cd backend/demand-service
DATABASE_URL_DEMAND="postgresql://postgres:SUA_SENHA@localhost:5432/smartcity_local?schema=demand" \
JWT_SECRET="dev-secret" PORT=3002 npm install && npx prisma migrate deploy && npm run dev

cd backend/api-gateway
AUTH_SERVICE_URL="http://localhost:3001" DEMAND_SERVICE_URL="http://localhost:3002" \
PORT=8080 npm install && npm run dev

# 3. Rode os testes apontando pro gateway local
cd e2e
E2E_API_URL=http://localhost:8080 npm test
```

> ⚠️ **Foi assim que validei que o `08-alterar-prioridade-demanda.spec.ts`
> realmente passa** (`1 passed`, rodado duas vezes) — o backend compartilhado
> do Render estava com rate limit estourado (todo mundo do grupo testando a
> mesma instância grátis essa semana). Rodando local eu achei e corrigi dois
> problemas reais no meio do caminho:
> - **E-mail de teste grande demais**: `usuarios.email` no banco é
>   `VarChar(35)`; o formato de e-mail único que eu tinha (com timestamp
>   decimal + texto do cenário) passava disso e o registro falhava com 500.
>   Troquei pra um formato mais curto em base36.
> - **Timeout curto pro modo dev do Next.js**: na primeira visita a cada
>   rota, o Next/Turbopack compila sob demanda, o que pode passar de 30s em
>   máquina mais lenta. Subi o timeout do teste pra 60s e defini
>   `navigationTimeout`/`actionTimeout` explícitos no `playwright.config.ts`.

## Estrutura

```
e2e/
├── tests/
│   └── 08-alterar-prioridade-demanda.spec.ts   # cenário do Gabriel (C8)
├── package.json
├── playwright.config.ts
└── tsconfig.json
```

Quando o grupo consolidar a suíte, cada colega deve colar o(s) próprio(s)
arquivo(s) `NN-nome-do-cenario.spec.ts` dentro de `tests/`, sem duplicar
`package.json`/`playwright.config.ts` (só o Gabriel criou essa base, os
demais só adicionam o teste deles nessa mesma pasta `tests/`).
