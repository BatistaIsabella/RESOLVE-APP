# Suíte de Testes de API — RESOLVE APP

## 1. Identificação do SUT (Sistema sob Teste)

**RESOLVE** é uma plataforma de Registro Eletrônico de Solicitações e Ocorrências que conecta cidadãos à administração pública. Cidadãos podem registrar problemas urbanos (buracos, iluminação, lixo), e gestores municipais podem visualizar, filtrar e atualizar o status das solicitações.

- **Repositório:** https://github.com/BatistaIsabella/RESOLVE-APP
- **Ambiente:** Microserviços Node.js/Express + PostgreSQL (Supabase) + Redis
- **Serviços testados:** `auth-service` (porta 3001) e `demand-service` (porta 3002)

---

## 2. Endpoints Contemplados

### auth-service
| Método | Endpoint         | Descrição                          |
|--------|------------------|------------------------------------|
| POST   | /auth/register   | Cadastro de novo usuário           |
| POST   | /auth/login      | Autenticação e geração de JWT      |
| GET    | /health          | Health check do auth-service       |

### demand-service
| Método | Endpoint                        | Descrição                          |
|--------|---------------------------------|------------------------------------|
| POST   | /demandas                       | Criar nova denúncia (cidadão)      |
| GET    | /demandas/my-demands            | Listar minhas denúncias (cidadão)  |
| GET    | /demandas/feed                  | Feed geral de denúncias (cidadão)  |
| GET    | /demandas/:id                   | Detalhes de uma denúncia (cidadão) |
| GET    | /demandas/gestor                | Listar todas as denúncias (gestor) |
| GET    | /demandas/gestor/:id            | Detalhes de denúncia (gestor)      |
| PATCH  | /demandas/gestor/:id/status     | Atualizar status (gestor)          |
| PATCH  | /demandas/gestor/:id/prioridade | Atualizar prioridade (gestor)      |
| GET    | /health                         | Health check do demand-service     |

---

## 3. Relação dos Cenários Automatizados

### TS01 — Autenticação real e perfil JWT (existente)
- Login do cidadão retorna 200 + token + papel correto
- Login do gestor retorna 200 + token + papel correto
- Senha errada retorna 401
- E-mail inexistente retorna 401
- JWT carrega papel correto para redirecionamento

### TS02 — Persistência de nova demanda urbana (existente)
- Rejeita requisição sem token (401)
- Rejeita gestor tentando criar demanda (403)
- Rejeita body vazio (400)
- Rejeita categoria inválida (400)
- Rejeita região inválida (400)
- Persiste denúncia e retorna 201 com dados corretos
- Aplica status ABERTA por padrão
- Aplica prioridade MEDIA quando não informada
- Lida com criações simultâneas sem duplicar cidadão

### TS02 BDD — Persistência de nova demanda (BDD) (existente)
- Mesmos cenários do TS02 em formato Given/When/Then

### TS03 — Registro de usuário (**NOVO**)
- Cadastro bem-sucedido de cidadão retorna 201
- Cadastro bem-sucedido de gestor retorna 201
- E-mail duplicado retorna 409
- Nome ausente retorna 400
- E-mail ausente retorna 400
- Senha ausente retorna 400
- Papel ausente retorna 400
- Body vazio retorna 400
- Papel inválido ("admin") retorna 400
- Papel em maiúsculas ("CIDADAO") retorna 400
- Resposta não expõe campo senha (segurança)
- Resposta tem Content-Type application/json
- Resposta contém id (number), nome, email, papel

### TS04 — Filtros avançados combinados (existente)
- 5 denúncias criadas no seed
- Paginação: GET /demandas/my-demands com ?page=1&limit=2
- Página fora do range retorna data vazio
- Paginação no feed geral
- Paginação para gestor
- Filtros por categoria, status, região, prioridade (marcados como skip — não implementados no backend)

### TS05 — Operações do gestor (**NOVO**)
- Gestor lista todas as denúncias (200)
- Cidadão tentando GET /gestor retorna 403
- Sem token em GET /gestor retorna 401
- Gestor obtém detalhes de uma denúncia (200 + imagens + históricos)
- Denúncia inexistente retorna 404
- ID não numérico retorna 400
- Atualização de status: ABERTA → EM_ANALISE (200 + histórico)
- Atualização de status: EM_ANALISE → RESOLVIDA (200)
- Status inválido retorna 400
- Sem campo status retorna 400
- Status igual ao atual retorna 400
- Denúncia inexistente retorna 404
- Cidadão tentando PATCH /status retorna 403
- Atualização de prioridade: MEDIA → ALTA (200 + histórico)
- Atualização de prioridade: ALTA → BAIXA (200)
- Prioridade inválida retorna 400
- Sem campo prioridade retorna 400
- Prioridade igual à atual retorna 400
- Denúncia inexistente para prioridade retorna 404
- Cidadão tentando PATCH /prioridade retorna 403

### TS06 — Controle de acesso e autenticação (**NOVO**)
- POST /demandas sem token retorna 401
- GET /my-demands sem token retorna 401
- GET /feed sem token retorna 401
- GET /gestor sem token retorna 401
- PATCH /gestor/:id/status sem token retorna 401
- PATCH /gestor/:id/prioridade sem token retorna 401
- Token sem prefixo "Bearer" retorna 401
- Token com assinatura corrompida retorna 401
- Token aleatório (não JWT) retorna 401
- Token expirado retorna 401
- Token com secret errado retorna 401
- Cidadão → GET /gestor retorna 403
- Cidadão → GET /gestor/:id retorna 403
- Cidadão → PATCH /gestor/:id/status retorna 403
- Cidadão → PATCH /gestor/:id/prioridade retorna 403
- Gestor → POST /demandas retorna 403
- Gestor → GET /my-demands retorna 403
- Gestor → GET /feed retorna 403
- ID não numérico em GET /:id retorna 400
- ID zero em GET /:id retorna 400
- ID inexistente em GET /:id retorna 404

### TS07 — Health check e contrato da API (auth-service) (**NOVO**)
- GET /health retorna 200
- GET /health body contém status "ok"
- GET /health body identifica "auth-service"
- GET /health Content-Type application/json
- CORS header Access-Control-Allow-Origin presente
- OPTIONS /auth/register retorna 204 (preflight)
- Resposta de registro contém: id, nome, email, papel
- Resposta não expõe senha
- Resposta de login contém: token, papel, userId, nome
- Token tem formato JWT (3 segmentos separados por ".")
- Login retorna Content-Type application/json
- Erro 401 contém campo "error" (não "message")
- Erro 400 contém campo "error"

### TS08 — Health check e contrato da API (demand-service) (**NOVO**)
- GET /health retorna 200
- GET /health body contém status "ok"
- GET /health body identifica o serviço
- GET /health Content-Type application/json
- Criação de denúncia contém campos: id_denuncia, titulo, categoria, regiao, status, prioridade, descricao, endereco, data_registro, imagens
- Criação retorna Content-Type application/json
- Status padrão é "ABERTA"
- GET /my-demands resposta contém "data" e "pagination"
- pagination contém: page, limit, total, totalPages
- GET /feed resposta contém "data" e "pagination"
- GET /gestor resposta contém "data" e "pagination"
- pagination.limit padrão é 20
- Erro sem token contém campo "error" (não "message")
- Erro de validação contém campo "error"
- Erro 404 contém campo "error"

---

## 4. Estrutura do Código-Fonte

```
backend/
├── auth-service/
│   └── src/tests/
│       ├── TS01_autenticacao.test.ts          (existente)
│       ├── TS03_registro_usuario.test.ts      ← NOVO
│       └── TS07_health_contrato_auth.test.ts  ← NOVO
└── demand-service/
    └── src/tests/
        ├── setup.ts                                        (existente)
        ├── TS02_persistencia_demanda.test.ts               (existente)
        ├── TS02_persistencia_demanda.bdd.test.ts           (existente)
        ├── TS04_filtros_avancados.test.ts                  (existente)
        ├── TS05_operacoes_gestor.test.ts                   ← NOVO
        ├── TS06_controle_acesso.test.ts                    ← NOVO
        └── TS08_health_contrato_demand.test.ts             ← NOVO
```

---

## 5. Configuração e Execução

### Pré-requisitos

- Node.js >= 18
- PostgreSQL rodando com os schemas de auth e demand criados
- Redis rodando (necessário para o demand-service)
- Variáveis de ambiente configuradas

### Variáveis de Ambiente

Crie um arquivo `.env` em cada serviço baseado no `.env.example` do backend:

**auth-service/.env**
```env
DATABASE_URL_AUTH=postgresql://usuario:senha@host:5432/db_auth
JWT_SECRET=sua-chave-secreta
```

**demand-service/.env**
```env
DATABASE_URL_DEMAND=postgresql://usuario:senha@host:5432/db_demand
JWT_SECRET=sua-chave-secreta   # DEVE ser a mesma do auth-service
REDIS_URL=redis://localhost:6379
```

> **Atenção:** `JWT_SECRET` precisa ser idêntico nos dois serviços para que os tokens do auth-service sejam aceitos pelo demand-service.

### Executar Migrations

```bash
# auth-service
cd backend/auth-service
npx prisma migrate deploy

# demand-service
cd backend/demand-service
npx prisma migrate deploy
```

### Instalar Dependências

```bash
cd backend/auth-service && npm install
cd backend/demand-service && npm install
```

### Executar Todos os Testes

```bash
# auth-service (TS01, TS03, TS07)
cd backend/auth-service
npx vitest run

# demand-service (TS02, TS04, TS05, TS06, TS08)
cd backend/demand-service
npx vitest run
```

### Executar Suíte Específica

```bash
# Exemplo: apenas TS05
cd backend/demand-service
npx vitest run src/tests/TS05_operacoes_gestor.test.ts

# Exemplo: apenas TS03
cd backend/auth-service
npx vitest run src/tests/TS03_registro_usuario.test.ts
```

### Executar com Output Detalhado

```bash
npx vitest run --reporter=verbose
```

---

## 6. Análise dos Resultados

### Achados e Comportamentos Observados

#### Bug identificado no TS04 (testes existentes)
Os testes do arquivo `TS04_filtros_avancados.test.ts` utilizam rotas incorretas:
- `GET /demandas/demands` → rota correta: `GET /demandas/my-demands`
- `GET /demandas/demands/feed` → rota correta: `GET /demandas/feed`
- `GET /demandas/gestor/demands` → rota correta: `GET /demandas/gestor`

Isso significa que os testes de paginação do TS04 estão testando rotas que retornam 404, e não as rotas reais. Os novos testes (TS08) cobrem as rotas corretas.

#### Filtros não implementados no backend
O TS04 já documenta (via `it.skip`) que os filtros por `categoria`, `status`, `regiao` e `prioridade` **não estão implementados** nos endpoints de listagem. Os parâmetros são ignorados silenciosamente — o backend retorna todos os registros sem filtrar.

#### Inconsistência no JWT_SECRET padrão
- `auth-service/src/middlewares/authMiddleware.ts` usa fallback `'change-me'`
- Testes existentes (TS02, TS04) usam fallback `'smartcity-dev-secret'`

Se `JWT_SECRET` não estiver configurado no `.env`, os tokens gerados pelos testes não serão validados pelo middleware. Os novos testes (TS05, TS06, TS08) usam `'change-me'` para consistência com o middleware.

### Resultado da Execução

Os testes foram executados em ambiente corporativo com restrição de rede. A conexão com o banco de dados Supabase (porta 6543) foi bloqueada pelo firewall da rede local, mesmo com hotspot móvel como alternativa.

**auth-service** (`evidencias_auth.txt`):
- ✅ 10 testes passaram — validações de campos obrigatórios, papel inválido, CORS preflight
- ❌ 16 falharam — todos por `Can't reach database server` (bloqueio de rede)

**demand-service** (`evidencias_demand.txt`):
- Mesma condição — testes de validação passaram; testes com banco falharam por bloqueio de rede

> Os testes que passaram confirmam que o framework está configurado corretamente e que a lógica de validação da API funciona. As falhas são exclusivamente de infraestrutura (conectividade de rede), não de código.

### Cobertura Total

| Área                        | Antes | Depois |
|-----------------------------|-------|--------|
| Autenticação (login)        | ✅    | ✅     |
| Registro de usuário         | ❌    | ✅ TS03|
| Criação de denúncia         | ✅    | ✅     |
| Operações de gestor         | ❌    | ✅ TS05|
| Controle de acesso          | Parcial | ✅ TS06|
| Health check                | ❌    | ✅ TS07/TS08|
| Contrato da API             | ❌    | ✅ TS07/TS08|
| Paginação                   | Parcial | ✅ TS08|

---



| Membro | Contribuição |
|--------|-------------|
| Isabella Batista | Análise do SUT, mapeamento de todos os endpoints, identificação de bugs e inconsistências no código existente, configuração do ambiente de testes, implementação de TS03 e TS06, elaboração da documentação completa e do plano de testes QA |
| Arthur Estevaum | TS05 — Cenários de operações do gestor (listagem, detalhes, atualização de status e prioridade) |
| Álvaro Silva | TS07 — Cenários de health check e contrato da API do auth-service |
| Beatriz Paredes | TS08 — Cenários de health check e contrato da API do demand-service |
| Cecília Medeiros | TS02 — Cenários de persistência de nova demanda urbana e versão BDD |
| Jose Leandro De Morais | TS04 — Cenários de filtros avançados e paginação |
| Melissa Filgueiras | TS01 — Cenários de autenticação JWT e redirecionamento por perfil |
| Gabriel Souza | Análise dos resultados obtidos e registro das evidências de execução |
| Thays Barbosa | Revisão geral do código e apoio na execução dos testes |
| Aquiles | Mapeamento dos requisitos funcionais e definição dos critérios de aceite dos cenários de teste |
| Icaro Silva | Apoio na configuração do repositório |

---

## 8. Uso de Inteligência Artificial

Ferramentas de IA foram utilizadas como apoio em etapas específicas desta atividade:

- **Reestruturação do plano de testes:** a IA auxiliou na reorganização e expansão do plano de testes existente, integrando os cenários de API às estratégias de teste mobile já definidas pelo squad, com estrutura profissional de cobertura shift-left a shift-right.

- **Revisão e melhoria dos scripts:** os códigos construídos pelo squad foram revisados com apoio de IA para identificar melhorias de clareza, cobertura de casos de borda e consistência nos padrões de asserção adotados.

- **Geração do plano de QA atualizado:** a IA foi utilizada na geração do arquivo consolidado do plano de QA (`plano-qa.html`), incorporando todos os cenários automatizados, a análise de riscos, critérios de aceite e os bugs identificados durante a execução.

Todo o código gerado com apoio de IA foi compreendido, revisado e validado pelo squad. A seleção dos cenários, a análise dos resultados e a responsabilidade pela entrega final são integralmente da equipe.
