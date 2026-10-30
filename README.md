<h1 align="center">
  🏙️ RESOLVE - Plataforma de Registro Eletrônico de Solicitações e Ocorrências com Verificação e Encaminhamento de Demandas Urbanas
</h1>

<p align="center">
  <img alt="Status" src="https://img.shields.io/badge/status-em%20desenvolvimento-yellow?style=for-the-badge">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white">
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white">
  <img alt="Node.js" src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white">
  <img alt="React Native" src="https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB">
  <img alt="Expo" src="https://img.shields.io/badge/Expo-000020?style=for-the-badge&logo=expo&logoColor=white">
  <a href="https://github.com/BatistaIsabella/RESOLVE-APP/actions/workflows/regressao.yml"><img alt="Regressão" src="https://img.shields.io/github/actions/workflow/status/BatistaIsabella/RESOLVE-APP/regressao.yml?style=for-the-badge&label=regress%C3%A3o"></a>
</p>

<p align="center">
  Uma plataforma web e mobile para centralizar o registro de demandas urbanas, facilitar o acompanhamento das solicitações e oferecer mais visibilidade para os gestores, responsáveis por executar a resolução de problemas públicos.
</p>

---

## 📑 Sumário

- [Visão Geral](#-visão-geral)
- [Objetivos Específicos](#-objetivos-específicos)
- [Perfis de Usuário](#-perfis-de-usuário)
- [Funcionalidades do MVP](#-funcionalidades-do-mvp)
- [Indicadores Operacionais](#-indicadores-operacionais-gestão)
- [Telas do Projeto](#️-telas-do-projeto)
- [Stack Tecnológica](#️-stack-tecnológica)
- [Documentação da API](#-documentação-da-api)
- [Arquitetura: Concorrência, Paralelismo e Otimização](#-arquitetura-concorrência-paralelismo-e-otimização)
- [Estrutura do Repositório](#-estrutura-do-repositório)
- [Links Úteis](#-links-úteis)
- [Como Rodar](#-como-rodar)
- [Equipe de Desenvolvimento](#-equipe-de-desenvolvimento)

---

## 🌍 Visão Geral

A plataforma busca melhorar a comunicação entre o cidadão e a gestão responsável, reduzindo a dispersão de informações e apoiando a tomada de decisão com dados operacionais em tempo real.

### 🎯 O Problema Central
A ausência de uma plataforma centralizada para registro, rastreabilidade e priorização de demandas urbanas dificulta a tomada de decisão por parte da gestão e reduz a eficiência no atendimento à população.

### 🏛️ Alinhamento com Políticas Públicas
A proposta dialoga com as diretrizes de transformação digital no setor público, em especial a **Lei nº 14.129/2021 (Lei do Governo Digital)**, estabelecendo princípios como:
- Eficiência administrativa e desburocratização;
- Transparência;
- Uso de soluções digitais para melhorar os serviços públicos.

Relaciona-se também com a **Estratégia Nacional de Governo Digital**, incentivando o uso de tecnologias para melhorar a relação entre o governo e o cidadão.

---

## ✅ Objetivos Específicos
- **Centralizar** o registro de demandas urbanas.
- **Permitir** o acompanhamento claro das solicitações.
- **Oferecer** visibilidade operacional para os gestores.
- **Aumentar** a transparência no atendimento à população.
- **Organizar** o fluxo de demandas com base na prioridade, data e status.

---

## 👥 Perfis de Usuário

### 🧑‍💼 Cidadão
Responsável por:
- [x] Registrar demandas urbanas.
- [x] Visualizar a lista de demandas.
- [x] Consultar detalhes das solicitações.
- [x] Acompanhar o status das solicitações.
- [x] Editar ou excluir a própria solicitação enquanto ela está aberta.

### 🏢 Gestor Público
Responsável por:
- [x] Visualizar demandas registradas de forma global.
- [x] Filtrar solicitações e atualizar o status manualmente.
- [x] Acessar o painel administrativo (Dashboard).
- [x] Acompanhar indicadores operacionais cruciais.

---

## 🚀 Funcionalidades do MVP

- [x] Cadastro e autenticação de usuários;
- [x] Criação e listagem de demandas urbanas;
- [x] Edição e exclusão de demandas pelo cidadão (enquanto abertas) e exclusão pelo gestor;
- [x] Visualização detalhada de cada demanda;
- [x] Sistema de filtros avançados (prioridade, categoria, região e status) e busca por texto;
- [x] Atualização manual de status e prioridade (exclusivo para gestores);
- [x] Visualizações em formato de Lista;
- [x] Painel administrativo para gestores (Métricas e KPIs);
- [x] Aplicativo mobile (Android e iOS) com foto pela câmera e localização por GPS.

---

## 📊 Indicadores Operacionais (Gestão)
O painel administrativo acompanha, no mínimo:
1. **Volume:** Quantidade total de demandas registradas;
2. **Distribuição:** Demandas por categoria;
3. **Geografia:** Demandas por região;
4. **Andamento:** Demandas por status.

---

## 🖥️ Telas do Projeto

### 🥇 Prioridade Alta
| Tela | Descrição |
|---|---|
| **Página Inicial (Cidadão)** | Destaque para o fluxo do cidadão, listagem de demandas, sistema de filtros e acesso à área do gestor. |
| **Página Inicial (Gestor)** | Listagem geral, filtros avançados, acesso ao painel administrativo e ações de edição/atualização de status. |
| **Formulário de Demanda** | Coleta de dados da ocorrência (local, descrição, categoria, imagem, etc.). |
| **Detalhes da Demanda** | Visualização completa de todos os dados de um registro específico. |
| **Painel Administrativo** | Dashboard focado em métricas operacionais para os gestores. |
| **Sistema de Filtros** | Combinação de filtros por categoria, região, status e prioridade. |

### 🥈 Prioridade Secundária
| Tela | Descrição |
|---|---|
| **Login e Cadastro** | Acesso segmentado (`Sou cidadão` ou `Sou gestor`) com email e senha. |

---

## ⚙️ Stack Tecnológica

| Camada | Tecnologias Utilizadas |
| :--- | :--- |
| **Front-end (web)** | `TypeScript`, `Next.js`, `Chakra UI`, `Tailwind CSS`, `Zustand` |
| **Mobile** | `React Native`, `Expo`, `Expo Router`, `Context API`, `expo-camera`, `expo-location`, `expo-secure-store` |
| **Back-end & Integração** | `Node.js`, `Express`, `Prisma ORM`, `PostgreSQL` |
| **Autenticação & Dados** | `JWT`, `Cookies`, `Redis`, `Cron Jobs` |
| **Testes & CI** | `Vitest`, `Supertest`, `Playwright`, `GitHub Actions` |

---

## 📡 Documentação da API
A plataforma RESOLVE utiliza um API Gateway como ponto central de entrada (Porta 8080), que gerencia o tráfego e a segurança entre o frontend e os microsserviços internos.

* **Ponto Único de Entrada:** `http://localhost:8080`
* **Padronização:** Todas as trocas de dados são realizadas via JSON.

| Serviço | Método | Endpoint | Descrição |
| :--- | :--- | :--- | :--- |
| **Monitoramento** | `GET` | `/health` | Verifica a saúde e disponibilidade dos serviços. |
| **Monitoramento** | `GET` | `/warmup` | Acorda os microsserviços (evita *cold start*). |
| **Autenticação** | `POST` | `/auth/register` | Cadastra cidadão ou gestor (gestor exige código de acesso). |
| **Autenticação** | `POST` | `/auth/login` | Autentica o usuário e gera o token de acesso (JWT). |
| **Demandas (cidadão)** | `GET` | `/demands/my-demands` | Lista as demandas do cidadão (paginação, filtros e `?q=` para busca). |
| **Demandas (cidadão)** | `POST` | `/demands` | Registra uma nova ocorrência urbana. |
| **Demandas (cidadão)** | `GET` | `/demands/:id` | Detalhe de uma demanda do próprio cidadão. |
| **Demandas (cidadão)** | `PATCH` | `/demands/:id` | Edita a própria demanda enquanto está aberta. |
| **Demandas (cidadão)** | `DELETE` | `/demands/:id` | Exclui a própria demanda enquanto está aberta. |
| **Demandas (gestor)** | `GET` | `/demands/gestor/demands` | Lista todas as demandas (paginação, filtros e `?q=`). |
| **Demandas (gestor)** | `GET` | `/demands/gestor/:id` | Detalhe de qualquer demanda. |
| **Demandas (gestor)** | `PATCH` | `/demands/gestor/:id/status` | Altera o status e registra no histórico. |
| **Demandas (gestor)** | `PATCH` | `/demands/gestor/:id/prioridade` | Altera a prioridade e registra no histórico. |
| **Demandas (gestor)** | `DELETE` | `/demands/gestor/:id` | Exclui uma demanda. |
| **Métricas** | `GET` | `/metrics` | Retorna KPIs e indicadores operacionais para o gestor. |

Todas as rotas de demandas e métricas exigem o header `Authorization: Bearer <token>`. A documentação completa está no [Postman](https://documenter.getpostman.com/view/40719566/2sBXwtrADd).

---

## 🧠 Arquitetura: Concorrência, Paralelismo e Otimização

A arquitetura da plataforma **RESOLVE** foi desenhada para operar como um sistema distribuído de alta disponibilidade e resiliência. Abaixo estão mapeados os padrões implementados na infraestrutura e no código:

### 🔀 Concorrência (Event-Driven & Background Jobs)
A aplicação tira proveito do Event Loop do Node.js e de uma arquitetura orientada a eventos para não bloquear a thread principal durante processamentos pesados:

* **Mensageria e Filas (Redis):** O `demand-service` não trava a requisição aguardando a atualização das métricas. Ao alterar um status, ele delega a tarefa disparando eventos de forma assíncrona (`lPush` na fila `smartcity:event-queue` e `publish` no canal `smartcity:denuncia-status`) e devolve a resposta imediatamente ao gestor.
* **Workers em Segundo Plano:** O `metrics-service` possui *workers* dedicados (`startEventSubscriber` e `startQueueWorker`) que escutam ativamente o Redis. Eles processam as atualizações de KPIs em background, lidando com falhas através de políticas de *retry* (`withRetry`).
* **Agregação Assíncrona (`Promise.all`):** No cálculo de métricas, múltiplas consultas de leitura (total, categorias, regiões e status) são disparadas simultaneamente. O Node.js gerencia essas requisições concorrentemente, reduzindo o tempo de carregamento do dashboard.
* **Timeout no Publish do Redis (`Promise.race`):** Ao publicar um evento de mudança de status no Redis, o `demand-service` disputa a operação contra um temporizador de 3 segundos. Caso o Redis demore ou falhe, a corrida rejeita a promise e loga o erro — sem travar a thread que já devolveu a resposta HTTP ao gestor.
* **Controle de Concorrência com Transações (`prisma.$transaction`):** As operações de atualização de status e de prioridade de uma demanda são executadas dentro de uma transação atômica. A gravação na tabela `denuncias` e a criação do registro em `historicos` acontecem como uma unidade indivisível — se qualquer etapa falhar, tudo é revertido, prevenindo inconsistências quando múltiplas requisições concorrentes chegam ao mesmo tempo.
* **Limite de Reconexão do Redis com Backoff Progressivo:** A configuração do cliente Redis define uma estratégia de reconexão com no máximo 3 tentativas, aplicando um atraso progressivo entre elas (`retries * 200ms` — ou seja, 200ms, 400ms e 600ms). Após esgotar as tentativas, a conexão é encerrada em vez de tentar indefinidamente. Isso evita rajadas de reconexão que sobrecarregariam o servidor Redis em caso de falha.
* **Nível de Isolamento de Transação (Read Committed):** Por padrão, as transações do Prisma (prisma.$transaction) no PostgreSQL operam sob o nível de isolamento Read Committed. Isso garante concorrência segura que se, por exemplo, dois gestores tentarem atualizar o status da mesma denúncia ao mesmo tempo, o banco garante que a segunda transação só lerá os dados após a primeira dar commit, evitando o Dirty Reads. 
* **Mecanismo de Lock Implícito:** Durante a execução de um prisma.denuncia.update dentro do bloco de transação, o PostgreSQL aplica um bloqueio exclusivo de linha. Isso impede que requisições concorrentes alterem o registro da denúncia no exato milissegundo em que o histórico está sendo gerado, blindando o sistema contra Race Conditions. 

### ⚡ Paralelismo (Processamento Distribuído)
O paralelismo real do sistema é alcançado através da sua infraestrutura, tirando proveito de múltiplos recursos computacionais:

* **Ecossistema de Microsserviços (Docker):** O `api-gateway` (porta 8080), `auth-service` (3001), `demand-service` (3002) e `metrics-service` (3003) operam como processos independentes. Eles rodam simultaneamente, dividindo a carga de CPU do servidor host.
* **Execução no Banco de Dados:** Quando o back-end dispara as requisições concorrentes de métricas, o PostgreSQL executa essas queries de leitura pesada paralelamente em seus próprios processos internos.
* **Listagens Paginadas com Contagem Paralela (`Promise.all`):** Nas funções `listDenunciasByCidadao` e `listAllDenuncias` do `demand-service`, a contagem total de registros (`COUNT`) e a busca paginada (`findMany`) são disparadas simultaneamente com `Promise.all`. O banco executa ambas as queries em paralelo, reduzindo o tempo de resposta de cada listagem em comparação com execução sequencial.
* **Aquecimento de Serviços Não-Bloqueante (`Promise.allSettled`):** O `api-gateway` expõe um endpoint `/warmup` que dispara pings simultâneos para os três microsserviços sem aguardar nenhuma resposta (*fire-and-forget*). O uso de `Promise.allSettled` garante que a falha de um serviço não impeça o retorno imediato do gateway — o cliente recebe `200` enquanto os processos são acordados em paralelo.
* **Workers Paralelos do PostgreSQL:** O PostgreSQL do Supabase é configurado para alocar múltiplos Background Workers para executar varreduras e agregações paralelas na CPU do servidor de banco de dados. Quando o metrics-service dispara as queries analíticas, o banco pode dividir a tabela denuncias em blocos e processar a contagem por categorias em paralelo, utilizando múltiplos núcleos de processamento do servidor.

### 🛡️ Otimização, Resiliência e Segurança
Técnicas rigorosas foram implementadas para proteger a memória, o tempo de resposta e a estabilidade do servidor:

* **Camada de Cache (Redis):** KPIs processados são cacheados com um *Time To Live* (TTL) de 5 minutos. Isso blinda o banco de dados contra centenas de consultas analíticas repetitivas quando múltiplos gestores acessam o painel ao mesmo tempo.
* **Rate Limiting (API Gateway):** O proxy de entrada (porta 8080) limita **5000 requisições a cada 15 minutos por IP** (`RATE_LIMIT_MAX`) e **100 a cada 15 minutos nas rotas `/auth`** (`AUTH_RATE_LIMIT_MAX`). Além disso, o auth-service bloqueia o login de uma conta por 15 minutos após 3 falhas seguidas. Os detalhes de segurança e LGPD estão em [docs/seguranca](docs/seguranca/README.md).
* **Mecanismos de Fail-Safe e Timeout:** A renovação do cache de métricas utiliza um `Promise.race` com um limite de 5 segundos. Isso garante que a aplicação rejeite a operação rapidamente caso o banco de dados trave, evitando que o sistema inteiro congele esperando uma resposta infinita.
* **Health Checks Ativos:** O Gateway possui uma rota `/health` que realiza chamadas concorrentes (`Promise.all`) para validar o status de todos os microsserviços, reportando a integridade da infraestrutura em tempo real.
* **Índices no Banco de Dados:** O schema Prisma do `demand-service` define índices explícitos (`@@index`) nos campos `categoria`, `status`, `prioridade` e `regiao` da tabela `denuncias`. Isso acelera diretamente as queries de filtragem do painel do gestor, evitando varreduras completas na tabela a cada requisição.
* **Paginação com `skip/limit`:** Todas as listagens de demandas utilizam paginação (`skip` + `take` no Prisma), garantindo que apenas o subconjunto de dados solicitado seja carregado na memória e trafegado entre banco e serviço — sem trazer registros desnecessários independentemente do volume total de demandas.
* **`upsert` Atômico para Resolução de Identidade:** As funções `resolveCidadaoId` e `resolveGestorId` utilizam `prisma.upsert` ao invés de `SELECT + INSERT` em operações separadas. Isso elimina a *race condition* onde duas requisições simultâneas do mesmo usuário tentariam inserir o mesmo registro no banco, causando violação de chave única.
* **Atualização Local sem Re-fetch Total:** Ao alterar o status ou a prioridade de uma demanda, a interface atualiza apenas o registro afetado no estado local (Zustand no web, Context API no mobile) com base na resposta da API, sem disparar um novo carregamento de todas as demandas. Isso reduz o número de requisições desnecessárias e mantém a interface responsiva.
* **Persistência Seletiva no Frontend web (`partialize`):** O estado global do Zustand utiliza a opção `partialize` para persistir no `localStorage` apenas os dados essenciais de sessão (`token`, `role`, `userEmail`, `userName`). Dados volumosos e potencialmente desatualizados como `demands`, `filters` e `apiMetrics` são **excluídos da persistência**, evitando leitura de cache obsoleto e consumo desnecessário de armazenamento local.
* **Monitoramento Ativo contra Cold Start (UptimeRobot + `/warmup`):** Um monitor externo (UptimeRobot) acessa o endpoint `/warmup` do gateway a cada 5 minutos, mantendo todos os microsserviços do Render em execução contínua. Sem esse mecanismo, o plano gratuito hiberna os serviços após 15 minutos de inatividade, causando cold starts de aproximadamente 30 segundos para o próximo usuário que acessar a plataforma.
* **Sessão Segura no Mobile:** No app mobile, só a sessão (token, papel, nome e e-mail) é salva no aparelho, no Keychain/Keystore via `expo-secure-store`, e apenas quando o usuário marca "Mantenha-me conectado".
* **Minimização de Escrita via Enums Nativos:** A otimização do armazenamento e da paginação no banco é impulsionada pelo uso de CREATE TYPE ... AS ENUM nas tabelas. Ao invés de trafegar strings longas de texto (como 'REGIAO_METROPOLITANA_DO_RECIFE'), o PostgreSQL armazena internamente esses valores como identificadores numéricos de 4 bytes, reduzindo drasticamente o tamanho do índice em memória e acelerando o tempo de varredura das listagens paginadas.

---

## 📁 Estrutura do Repositório

```
RESOLVE-APP/
├── backend/                 # Microsserviços Node.js (Express + Prisma)
│   ├── api-gateway/         # Porta de entrada da API
│   ├── auth-service/        # Cadastro, login e JWT
│   ├── demand-service/      # Demandas urbanas (CRUD, filtros, status)
│   ├── metrics-service/     # Indicadores do painel do gestor
│   ├── postgres-init/       # Scripts de criação dos schemas
│   └── docker-compose*.yml  # Ambiente local e de produção
├── frontend/                # Aplicação web (Next.js)
│   └── mobile/              # Aplicativo mobile (React Native + Expo)
├── e2e/                     # Testes end-to-end (Playwright)
├── docs/                    # Documentação do projeto
│   ├── arquitetura/         # Diagramas de modelagem e de arquitetura
│   └── testes/              # Plano de testes, relatório de bugs, suíte do backend e evidências
├── .github/workflows/       # Pipeline de regressão (CI)
├── render.yaml              # Deploy no Render
└── flake.nix                # Ambiente reprodutível com Nix
```

| Documento | Onde está |
| :--- | :--- |
| Pipeline de CI, backlog executado e configuração do Quality Gate | [docs/testes/PIPELINE_CI_QUALITY_GATE.md](docs/testes/PIPELINE_CI_QUALITY_GATE.md) |
| Plano de Testes e Backlog de Automação | [docs/testes/Plano_de_Testes_e_Backlog_Grupo5.docx](docs/testes/Plano_de_Testes_e_Backlog_Grupo5.docx) |
| Relatório de bugs | [docs/testes/RELATORIO_BUGS.md](docs/testes/RELATORIO_BUGS.md) |
| Suíte de testes do backend | [docs/testes/SUITE_TESTES_BACKEND.md](docs/testes/SUITE_TESTES_BACKEND.md) |
| Plano de QA | [docs/testes/plano-qa.html](docs/testes/plano-qa.html) |
| Evidências de execução e cobertura | [docs/testes/evidencias/](docs/testes/evidencias/) |
| Saídas das rodadas de IA do plano de testes | [docs/testes/ia/](docs/testes/ia/) |
| Testes E2E | [e2e/README.md](e2e/README.md) |
| App mobile | [frontend/mobile/README.md](frontend/mobile/README.md) e [ARQUITETURA.md](frontend/mobile/ARQUITETURA.md) |
| Frontend web | [frontend/README.md](frontend/README.md) e [ARQUITETURA.md](frontend/ARQUITETURA.md) |
| Backend | [backend/README.md](backend/README.md) |

---

## 🔗 Links Úteis

| Ferramenta Utilizada | Material | Links |
| :--- | :--- | :---
| **Figma** | Protótipo | [Acesse aqui](https://www.figma.com/design/5qGAuNGrMKdG7AgXjG77YX/Smart-City?node-id=0-1&t=ew4wGee8wgaJ4qCo-1) |
| **Postman** | Documentação Pública da API | [Acesse aqui](https://documenter.getpostman.com/view/40719566/2sBXwtrADd) |
| **BRmodelo** | Modelagem conceitual - Auth | [Acesse aqui](docs/arquitetura/modeloConceitualAuth.png) |
| **BRmodelo** | Modelagem lógica - Auth | [Acesse aqui](docs/arquitetura/modeloLogicoAuth.png) |
| **BRmodelo** | Modelagem conceitual - Demand | [Acesse aqui](docs/arquitetura/ModeloConceitualDemandv4.png) |
| **BRmodelo** | Modelagem lógica - Demand | [Acesse aqui](docs/arquitetura/ModeloLogicoDemandv2.png) |
| **LucidChart** | Desenho da Arquitetura em Microsserviços | [Acesse aqui](docs/arquitetura/Arquitetura_microsservicos.png) |

---

## 🚀 Como Rodar

### Backend e Banco de Dados
```bash
cd backend
cp .env.example .env.local      # no Windows: copy .env.example .env.local
docker compose --env-file .env.local up -d --build

docker compose --env-file .env.local exec auth-service npx prisma generate
docker compose --env-file .env.local exec auth-service npx prisma migrate deploy

docker compose --env-file .env.local exec demand-service npx prisma generate
docker compose --env-file .env.local exec demand-service npx prisma migrate deploy
```
> Disponível em http://localhost:8080

### Frontend web
```bash
cd frontend
npm install
npm run dev
```
> Disponível em http://localhost:3000

### App mobile
```bash
cd frontend/mobile
npm install
npx expo start
```
> Abra no emulador Android (`a`), no simulador iOS (`i`) ou num aparelho. Detalhes em [frontend/mobile/README.md](frontend/mobile/README.md).

### Testes
```bash
cd backend/demand-service && npx vitest run --config vitest.unit.config.ts   # unitários do backend
cd e2e && npm install && npx playwright install && npx playwright test        # E2E (backend e frontend web rodando)
```

### Ambiente reprodutível com Nix (opcional)

O repositório traz um `flake.nix` para quem usa Nix/NixOS. Ele fixa as versões
das ferramentas, então não é preciso instalar Node na mão nem acertar a
versão certa:

```bash
nix develop            # Node 22 + Playwright (frontend e e2e)
nix develop .#backend  # Postgres 16 + Redis + Node, para rodar os serviços sem Docker
```

Dois detalhes que o flake resolve e valem para todo mundo saber:

- **Node:** os Dockerfiles do backend fixam `node:20-alpine`, mas o Node 20 saiu
  de suporte (EOL em 2026-04-30). O flake usa **Node 22 LTS**, que atende o
  requisito do Next 16 (`>= 20.9`).
- **Playwright:** o pacote npm exige um build exato de navegador, então
  `e2e/package.json` fixa `@playwright/test` na mesma versão empacotada pelo
  nixpkgs (`playwright-driver`). No shell do Nix os navegadores já vêm prontos
  (`PLAYWRIGHT_BROWSERS_PATH`), dispensando o `npx playwright install` — que,
  sem isso, baixa um binário dinâmico que não roda no NixOS. Se as versões
  saírem de sincronia, o shell avisa ao ser aberto.

Quem não usa Nix segue normalmente com Node 22 instalado pelo gerenciador de
sua preferência — nada no projeto passou a depender do Nix.

---

## 👩‍💻 Equipe de Desenvolvimento

- Álvaro Antonio e Silva
- Aquiles Pereira
- Arthur Estevão
- Beatriz Paredes
- Cecília Medeiros
- Gabriel Souza
- Icaro Leonardo Silva de Souza Costa
- Isabella Batista
- Jose Leandro De Morais
- Melissa Vitória
- Thays Barbosa
