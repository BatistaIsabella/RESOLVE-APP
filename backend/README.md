# RESOLVE — Backend

API REST construída com **Express**, **PostgreSQL**, **Redis** e arquitetura de **microsserviços**.

---

## Tecnologias

| Tecnologia | Versão | Papel |
|---|---|---|
| Express | 4.18.2 | Framework web |
| TypeScript | 5.3.2 | Tipagem estática |
| Prisma | 5.0.0 | ORM e migrations |
| jsonwebtoken | 9.0.2 | Geração e verificação de JWT |
| bcryptjs | 2.4.3 | Hash de senhas |
| Redis | 4.6.10 | Cache de métricas |
| node-cron | 3.0.3 | Agendamento de jobs |
| dotenv | 16.3.1 | Variáveis de ambiente |

---

## Arquitetura

O projeto segue uma arquitetura de **microsserviços**, onde cada serviço é independente, possui suas próprias dependências e responsabilidades bem definidas.

```
backend/
├── api-gateway/
│   ├── src/
│   │   ├── middlewares/
│   │   │   └── .gitkeep
│   │   ├── routes/
│   │   │   └── .gitkeep
│   │   └── server.ts
│   ├── .dockerignore
│   ├── Dockerfile
│   ├── package-lock.json
│   ├── package.json
│   └── tsconfig.json
├── auth-service/
│   ├── prisma/
│   │   ├── migrations/
│   │   └── schema.prisma
│   ├── src/
│   │   ├── controllers/
│   │   │   └── authController.ts
│   │   ├── middlewares/
│   │   │   ├── authMiddleware.ts
│   │   │   └── errorMiddleware.ts
│   │   ├── repository/
│   │   ├── routes/
│   │   │   ├── authRoutes.ts
│   │   │   └── healthRoutes.ts
│   │   ├── services/
│   │   │   └── authService.ts
│   │   ├── tests/
│   │   │   └── TS01_autenticacao.test.ts
│   │   ├── app.ts
│   │   └── server.ts
│   ├── .dockerignore
│   ├── Dockerfile
│   ├── package-lock.json
│   ├── package.json
│   └── tsconfig.json
├── demand-service/
│   ├── prisma/
│   │   ├── migrations/
│   │   └── schema.prisma
│   ├── src/
│   │   ├── config/
│   │   │   └── redis.ts
│   │   ├── controllers/
│   │   │   ├── cidadaoController.ts
│   │   │   ├── demandController.ts
│   │   │   └── gestorController.ts
│   │   ├── lib/
│   │   │   └── prisma.ts
│   │   ├── middlewares/
│   │   │   ├── authMiddleware.ts
│   │   │   ├── errorMiddleware.ts
│   │   │   └── roleMiddleware.ts
│   │   ├── repositories/
│   │   │   └── DenunciaRepository.ts
│   │   ├── routes/
│   │   │   ├── demandRoutes.ts
│   │   │   └── healthRoutes.ts
│   │   ├── services/
│   │   │   ├── demandService.ts
│   │   │   └── denunciaService.ts
│   │   ├── tests/
│   │   │   ├── setup.ts
│   │   │   ├── TS02_persistencia_demanda.bdd.test.ts
│   │   │   ├── TS02_persistencia_demanda.test.ts
│   │   │   └── TS04_filtros_avancados.test.ts
│   │   ├── utils/
│   │   │   ├── httpError.ts
│   │   │   ├── pagination.ts
│   │   │   └── retry.ts
│   │   ├── app.ts
│   │   └── server.ts
│   ├── .dockerignore
│   ├── Dockerfile
│   ├── package-lock.json
│   ├── package.json
│   ├── tsconfig.json
│   └── vitest.config.ts
├── metrics-service/
│   ├── prisma/
│   │   └── schema.prisma
│   ├── src/
│   │   ├── config/
│   │   │   ├── cron.ts
│   │   │   └── redis.ts
│   │   ├── controllers/
│   │   │   └── metricsController.ts
│   │   ├── lib/
│   │   │   └── prisma.ts
│   │   ├── middlewares/
│   │   │   ├── authMiddleware.ts
│   │   │   └── errorMiddleware.ts
│   │   ├── routes/
│   │   │   ├── healthRoutes.ts
│   │   │   └── metricsRoutes.ts
│   │   ├── services/
│   │   │   └── metricsService.ts
│   │   ├── utils/
│   │   │   └── retry.ts
│   │   ├── workers/
│   │   │   └── eventWorker.ts
│   │   └── server.ts
│   ├── .dockerignore
│   ├── Dockerfile
│   ├── package-lock.json
│   └── package.json
├── docs/
└── docker-compose.yml         # PostgreSQL + Redis + 3 serviços
```
---

## Responsabilidades de cada serviço

### auth-service (porta 3001)
Responsável por cadastro, autenticação e geração de tokens JWT. Nenhum outro serviço realiza login ou registro — tudo passa por aqui.

### demand-service (porta 3002)
Responsável pelo CRUD completo de demandas. Valida o JWT recebido consultando a chave secreta compartilhada. Acessa o PostgreSQL via Prisma ORM.

### metrics-service (porta 3003)
Responsável por agregar e servir KPIs e estatísticas. Usa Redis para cache das métricas e node-cron para atualização periódica dos dados.

---

## Fluxo de uma requisição

```
Cliente HTTP
    │
    ▼
Serviço correspondente (auth / demand / metrics)
    │  valida o JWT via authMiddleware (demand e metrics)
    ▼
Controller
    │  valida o corpo da requisição
    ▼
Service
    │  aplica regras de negócio
    ▼
Repository (apenas demand-service)
    │  executa queries via Prisma
    ▼
PostgreSQL / Redis
```

---

## Endpoints

### auth-service — porta 3001

| Método | Rota | Descrição | Auth |
|---|---|---|---|
| POST | `/auth/register` | Cadastra novo usuário. Papel `gestor` exige `codigoAcesso` válido no corpo, senão 403 | ❌ |
| POST | `/auth/login` | Autentica e retorna JWT | ❌ |

### demand-service — porta 3002

| Método | Rota | Descrição | Auth |
|---|---|---|---|
| GET | `/demands` | Lista todas as demandas | ✅ |
| POST | `/demands` | Cria nova demanda | ✅ |
| GET | `/demands/:id` | Detalha uma demanda | ✅ |
| PUT | `/demands/:id` | Atualiza uma demanda | ✅ |
| DELETE | `/demands/:id` | Remove uma demanda | ✅ |

### metrics-service — porta 3003

| Método | Rota | Descrição | Auth |
|---|---|---|---|
| GET | `/metrics` | Retorna KPIs e estatísticas | ✅ |

---

## Deploy em produção (Coolify / self-hosted)

O `docker-compose.prod.yml` empacota os 6 containers (Postgres, Redis, os 4 serviços e `cloudflared`) prontos para deploy via Coolify. Nenhum serviço publica porta no host — tudo fica só na rede interna do compose, e o `cloudflared` expõe o `api-gateway` para fora através de um Cloudflare Tunnel. Isso evita colisão com a porta 8080 do próprio Traefik do Coolify (`coolify-proxy`) e segue o mesmo padrão usado em outros projetos do servidor (ex.: Beholder).

### Criando o túnel no Cloudflare
1. No painel do Cloudflare Zero Trust: **Networks → Tunnels → Create a tunnel**, tipo *Cloudflared*.
2. Na aba de instalação, escolha **Docker** e copie o valor do `--token` (é o `CLOUDFLARE_TUNNEL_TOKEN`).
3. Em **Public Hostname**, aponte o subdomínio desejado (ex. `resolve-api.seudominio.com`) para `http://api-gateway:8080` — o `cloudflared` está na mesma rede Docker do `api-gateway` e o resolve pelo nome do serviço.

### No Coolify
1. Crie um novo recurso do tipo **Docker Compose**, apontando para este repositório.
2. Defina o **Base Directory** como `backend` e o **Docker Compose Location** como `docker-compose.prod.yml`.
3. Em **Environment Variables**, defina (veja `.env.production.example`):
   - `POSTGRES_PASSWORD` — senha do banco.
   - `JWT_SECRET` — segredo para assinar os JWTs (gere com `openssl rand -base64 48`). É compartilhado entre `auth-service`, `demand-service` e `metrics-service`.
   - `GESTOR_ACCESS_CODE` — código exigido para criar conta de gestor (gere com `openssl rand -base64 24`). Sem ele o cadastro de gestor responde 403, porque em produção não há valor padrão.
   - `CLOUDFLARE_TUNNEL_TOKEN` — token do túnel criado acima.
   - `POSTGRES_USER` / `POSTGRES_DB` são opcionais (default `postgres`).
4. Deploy. O `postgres-init/001-create-schemas.sql` cria o schema `demand` automaticamente na primeira subida do volume; `auth-service` e `demand-service` também garantem o schema e rodam `prisma migrate deploy` a cada start, de forma idempotente.
5. Não é necessário configurar domínio pela aba **Domains** do Coolify — a exposição pública é feita pelo túnel.

### Validação local antes de subir
```bash
cd backend
cp .env.production.example .env
# localmente não há túnel, então pode comentar o serviço cloudflared
# ou exportar um CLOUDFLARE_TUNNEL_TOKEN de teste antes de subir
docker compose -f docker-compose.prod.yml --env-file .env up -d --build auth-service demand-service metrics-service api-gateway postgres redis
docker compose -f docker-compose.prod.yml exec api-gateway wget -qO- http://localhost:8080/health
```

> **Atenção:** o cadastro com papel `gestor` exige o `codigoAcesso` correto no corpo da requisição, conferido contra `GESTOR_ACCESS_CODE`. Se a variável não estiver definida, o `auth-service` recusa todo cadastro de gestor em produção (403) — não há valor padrão fora de desenvolvimento. Defina-a antes do primeiro deploy, ou nenhuma conta de gestor poderá ser criada.

---

## Como rodar localmente

### Pré-requisitos
- Docker e Docker Compose
- Node.js 20+ (apenas para o frontend)

### Backend (Docker)

Na pasta `backend/`, copie o `.env.example` para `.env.local`.

```bash
cd backend

docker compose --env-file .env.local up -d --build

docker compose --env-file .env.local exec auth-service npx prisma migrate deploy
docker compose --env-file .env.local exec demand-service npx prisma migrate deploy
```

> Use sempre `migrate deploy`. **Não** rode `prisma migrate dev` em produção.

Serviços:
- API Gateway → http://localhost:8080
- Auth → http://localhost:3001
- Demand → http://localhost:3002
- Metrics → http://localhost:3003

### Arquitetura assíncrona

- **Filas (Redis):** `demand-service` publica eventos em `smartcity:event-queue` ao alterar status
- **Eventos (pub/sub):** canal `smartcity:denuncia-status` notifica o `metrics-service`
- **Processamento paralelo:** KPIs agregados com `Promise.all` no `metrics-service`
- **Cron:** atualização de cache a cada 5 minutos
- **Cache Redis:** KPIs em `smartcity:metrics:kpis` (TTL 5 min)
- **Paginação:** `GET /demands?page=1&limit=20`
- **Health:** `GET /health` em cada serviço + gateway agregado

### Frontend

```bash
cd frontend
cp .env.local.example .env.local
npm install
npm run dev
```

Acesse http://localhost:3000

## Testes Automatizados (E2E)

A suíte de testes de ponta a ponta utiliza o **Playwright** para validar os fluxos críticos da aplicação, simulando cenários reais de uso pelo navegador.

### Pré-requisitos
* Certifique-se de que os microsserviços do backend via Docker e o banco de dados local estejam em execução.
* O ambiente de testes utiliza a variável `E2E_API_URL` para se comunicar com o gateway local (`http://localhost:8080`).

### Como rodar os testes
Acesse a pasta correspondente aos testes E2E e utilize os comandos abaixo:

```bash
cd e2e

# Instalar as dependências do Playwright (caso necessário)
npm install

# Rodar todos os testes automatizados
npx playwright test

# Rodar um teste específico com a interface visual (headed)
npx playwright test tests/07-detalhes-demanda.spec.ts --headed

# Abrir o relatório HTML detalhado da última execução
npx playwright show-report

### Desenvolvimento sem Docker (opcional)

```bash
# auth-service
cd auth-service
npm install
npm run dev

# demand-service (outro terminal)
cd demand-service
npm install
npx prisma migrate deploy
npm run dev
```

Use os arquivos `.env` dentro de cada serviço com URLs apontando para `localhost`.

---

## Variáveis de ambiente

Cada serviço tem seu próprio arquivo `.env.local`.

### auth-service
| Variável | Descrição | Exemplo |
|---|---|---|
| `PORT` | Porta do serviço | `3001` |
| `SECRET_KEY` | Chave secreta para assinar o JWT | `uma-chave-longa-e-aleatoria` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Tempo de expiração do token | `1440` |

### demand-service
| Variável | Descrição | Exemplo |
|---|---|---|
| `PORT` | Porta do serviço | `3002` |
| `DATABASE_URL` | Connection string do PostgreSQL | `postgresql://user:pass@localhost:5432/smartcity` |
| `SECRET_KEY` | Mesma chave do auth-service para validar JWT | `uma-chave-longa-e-aleatoria` |

### metrics-service
| Variável | Descrição | Exemplo |
|---|---|---|
| `PORT` | Porta do serviço | `3003` |
| `DATABASE_URL` | Connection string do PostgreSQL | `postgresql://user:pass@localhost:5432/smartcity` |
| `REDIS_URL` | Connection string do Redis | `redis://localhost:6379` |
| `SECRET_KEY` | Mesma chave do auth-service para validar JWT | `uma-chave-longa-e-aleatoria` |
