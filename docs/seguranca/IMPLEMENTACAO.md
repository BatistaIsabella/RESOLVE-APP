# Segurança e LGPD: o que foi implementado

Referência: Entregáveis 1 (autenticação e senhas), 2 (dados em repouso) e 3 (LGPD).
Branch: `feat/seguranca-lgpd`.

## 1. Resumo por item dos entregáveis

Situação: **Feito**, **Parcial** (feito com limite explicado) ou **Não feito** (com o motivo).

### Entregável 1 – Autenticação e senhas

| Item | Situação | Como ficou |
|---|---|---|
| 1.1 Login por e-mail e senha com JWT | Feito | Já existia. O token agora também carrega `orgao`, `categorias` (gestor) e `sv` (versão da sessão). |
| 1.2 Hash com salt | Feito | bcrypt, custo 12 (`BCRYPT_ROUNDS`). A senha só trafega no corpo do POST e nunca é gravada nem logada. |
| 1.2 Senha com 12+ caracteres, maiúscula, minúscula, número e símbolo | Feito | Validada no servidor (`utils/senha.ts`) e no app, que mostra a lista de requisitos enquanto a pessoa digita. Limite de 72 bytes, que é o que o bcrypt aceita. |
| 1.2 Evitar senhas comuns ou vazadas | Feito | Lista local de senhas e bases comuns, mais consulta ao Have I Been Pwned com k-anonymity (só 5 caracteres do SHA-1 saem do servidor). Se o serviço externo estiver fora, a senha não é bloqueada por esse motivo. |
| 1.3 Bloqueio após 3 falhas | Feito | 3 falhas seguidas bloqueiam por 15 minutos (`LOGIN_MAX_FALHAS`, `LOGIN_BLOQUEIO_MINUTOS`). A contagem fica no banco, por e-mail, e vale também para e-mails que não existem. |
| 1.3 Mensagens genéricas | Parcial | O login responde sempre "Credenciais inválidas" (ou o bloqueio, igual para qualquer e-mail). O cadastro ainda responde "E-mail já cadastrado" (409), o que permite descobrir se um e-mail existe. |
| 1.4 Validade do token e invalidação na troca de senha | Feito | Token de 24h. Ao trocar ou redefinir a senha, a versão da sessão sobe no Redis e os tokens antigos são recusados pelos três serviços. Se o Redis estiver fora do ar, os tokens antigos continuam valendo até expirar. |
| 1.4 Token não exposto | Feito | Fica no Keychain/Keystore (`expo-secure-store`) e é apagado ao sair. |
| 1.5 Recuperação de senha | Feito | Código aleatório de 24 bytes enviado por e-mail, válido por 30 minutos, uso único. No banco fica só o hash. A resposta é igual exista ou não o e-mail. Precisa de SMTP configurado. |
| 1.6 Registro de eventos | Feito | Tabela `auth.eventos_auth`: cadastro, login ok, login com falha, login bloqueado, logout, pedido e conclusão de redefinição, troca de senha, alteração de dados, aceite de termos e exclusão de conta. Guarda data, IP e aparelho. Nunca guarda senha, token ou e-mail em texto. |
| 1.7 MFA para administradores | Feito | Verificação em duas etapas (TOTP, compatível com Google e Microsoft Authenticator) para contas de gestor. Opcional por padrão; com `MFA_OBRIGATORIO_GESTOR=true` todo gestor precisa ativar no próximo login. O login passa a ter duas etapas, há 8 códigos de recuperação de uso único, o mesmo código não vale duas vezes e o segredo fica cifrado no banco (AES-256-GCM). 3 códigos errados bloqueiam por 15 minutos. |
| 1.7 Revisão dos registros | Parcial | Os registros existem e podem ser consultados no banco. Não há tela nem alerta. |

### Entregável 2 – Dados em repouso

| Item | Situação | Como ficou |
|---|---|---|
| 2.2 Criptografia de disco (AES-256) | Parcial | Não é feita pelo código: depende de onde o banco roda. Supabase/Render oferecem; no `docker-compose.prod.yml` o volume só é criptografado se o disco do servidor for. Precisa ser confirmado no ambiente real. |
| 2.2 Criptografia de coluna e KMS | Não feito | O e-mail é a chave de busca do login, então não pode ser cifrado direto. Ver "Ajustes na documentação". |
| 2.3 Redis com autenticação e TTL | Feito | `requirepass` nos dois compose; fila de eventos expira em 1 hora; cache de indicadores em 5 minutos. Os eventos só têm ids e status, sem dados pessoais. |
| 2.4 Dados no aparelho | Feito | Sessão no Keychain/Keystore e apagada no logout. O app não guarda denúncias no aparelho. |
| 2.5 Indicadores sem identificar o titular | Feito | Já era assim: só contagens por categoria, região e status. |
| 2.6 Menor privilégio no banco | Feito (produção) | `docker-compose.prod.yml` usa um usuário por serviço: `auth_svc` (só schema auth), `demand_svc` (só schema demand) e `metrics_svc` (só leitura no demand). Em desenvolvimento continua o usuário administrador. |
| 2.7 Retenção de 5 anos | Feito | Rotina diária apaga denúncias resolvidas há mais de 5 anos (`RETENCAO_ANOS`), com fotos e histórico. A data de conclusão passou a ser gravada; as antigas são preenchidas pelo histórico. |
| 2.7 Descarte a pedido do titular | Feito | Ver 3.4. O cache de indicadores é invalidado e os registros de segurança do titular são anonimizados. Backups do banco seguem a rotação do provedor. |
| 2.8 Criptografia ponta a ponta das fotos | Não feito | Melhoria futura na própria documentação. |

### Entregável 3 – LGPD

| Item | Situação | Como ficou |
|---|---|---|
| 3.1 Mapeamento dos dados | Feito | Tabela na seção 4 deste documento. |
| 3.3 Minimização | Feito | Sem CPF. Mantém nome, e-mail e senha. |
| 3.4 Acesso, correção, portabilidade, eliminação | Feito | Tela "Meus dados" (toque no nome no topo das telas): ver e corrigir nome e e-mail, trocar senha, exportar os dados (JSON, pela folha de compartilhamento) e excluir a conta. |
| 3.4 Bloqueio, anonimização por pedido, informação de compartilhamento, revogação | Parcial | Pelo e-mail privacidaderesolve@gmail.com, que está na política e na tela. É processo manual, sem automação. |
| 3.5 Aceite da política e dos termos | Feito | Checkbox obrigatório no cadastro, tela pública de leitura, aceite gravado com data e versão. Contas antigas e mudanças de versão (`TERMOS_VERSAO`) pedem novo aceite no próximo acesso. Os textos são um rascunho e precisam de revisão jurídica. |
| 3.6 Gestor só vê o seu órgão | Feito | Cada código de acesso de gestor vincula a um órgão, que define as categorias visíveis. Vale na listagem, no detalhe, na mudança de status e prioridade, na exclusão e nos indicadores. Denúncia de outro órgão responde 404. |
| 3.6 Gestores terceirizados e termo de cooperação | Não feito | Não há distinção no sistema entre servidor e terceirizado. O termo é documento a ser feito pelo órgão. |
| 3.6 Cidadão vendo dados de outros | Corrigido | O feed devolvia e-mail e identificador de quem registrou. Agora não devolve, e as coordenadas saem com 3 casas (cerca de 100 m). |
| 3.7 RIPD | Não feito | É um documento, a ser elaborado antes de produção. |
| 3.8 Resposta a incidentes | Parcial | Os registros que permitem identificar o que foi afetado existem. O procedimento escrito não foi feito. |

## 2. Endpoints novos ou alterados

Pelo gateway. As rotas `/demands/...` viram `/demandas/...` no demand-service.

| Método e rota | Uso |
|---|---|
| `POST /auth/register` | Agora exige `aceiteTermos: true` e `versaoTermos`. Gestor envia `codigoAcesso`. |
| `POST /auth/login` | Devolve também `orgao` e `termosPendentes`. Responde 429 com `Retry-After` quando bloqueado. |
| `POST /auth/logout` | Registra a saída. O token continua o mesmo até expirar; o app o descarta. |
| `POST /auth/forgot-password`, `POST /auth/reset-password` | Recuperação de senha. |
| `GET /auth/me`, `PATCH /auth/me`, `DELETE /auth/me` | Ver, corrigir e excluir a conta (exclusão pede a senha). |
| `POST /auth/me/senha` | Troca de senha. Devolve token novo e encerra os outros. |
| `POST /auth/aceite-termos` | Registra o aceite da versão vigente. |
| `POST /auth/login/mfa` | Segunda etapa do login: recebe o `desafio` do login e o `codigo` (6 dígitos do autenticador ou código de recuperação). |
| `POST /auth/mfa/configurar`, `POST /auth/mfa/ativar` | O gestor gera a chave e confirma o primeiro código. A ativação devolve os 8 códigos de recuperação, uma única vez. |
| `POST /auth/mfa/desativar` | Pede a senha e um código válido. Encerra as outras sessões. |
| `GET /demands/me/export`, `DELETE /demands/me` | Cópia dos dados e anonimização das ocorrências. O segundo é chamado pelo auth-service na exclusão. |

## 3. Configuração

Variáveis novas (exemplos em `backend/.env.example` e `backend/.env.production.example`).

| Variável | Serviço | Para quê |
|---|---|---|
| `JWT_SECRET` | auth, demand, metrics | Obrigatória e igual nos três. O serviço não sobe sem ela. Não existe mais valor padrão. |
| `GESTOR_ACCESS_CODES` | auth | `ORGAO=codigo;ORGAO2=codigo2`. Sem nenhum código, em produção, o cadastro de gestor fica fechado. |
| `GESTOR_ACCESS_CODE` | auth | Código único que libera a gestão geral (compatibilidade). |
| `REDIS_PASSWORD` e `REDIS_URL` com senha | todos | Redis exige senha. |
| `AUTH_DB_PASSWORD`, `DEMAND_DB_PASSWORD`, `METRICS_DB_PASSWORD` | postgres (produção) | Senhas dos usuários de banco por serviço. |
| `MFA_ENCRYPTION_KEY` | auth | Chave (32 bytes em base64, `openssl rand -base64 32`) que cifra o segredo do autenticador. Em produção, sem ela, a MFA fica indisponível. Não troque depois de haver MFA ativa. |
| `MFA_OBRIGATORIO_GESTOR` | auth | `true` exige MFA de todo gestor. Padrão `false`. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | auth | Envio do e-mail de redefinição. Sem `SMTP_HOST` o e-mail não sai; em desenvolvimento o link aparece no log. |
| `DEMAND_SERVICE_URL` | auth | Usada na exclusão da conta. |
| `CORS_ORIGINS` | gateway e serviços | Origens web permitidas. Vazio libera ninguém (o app não precisa). |
| `LOGIN_MAX_FALHAS`, `LOGIN_BLOQUEIO_MINUTOS`, `TOKEN_REDEFINICAO_MINUTOS`, `LOG_RETENCAO_DIAS`, `RETENCAO_ANOS`, `TERMOS_VERSAO` | auth, demand | Ajustes opcionais (padrões: 3, 15, 30, 365, 5, 1.0). |

Órgãos disponíveis: `GERAL` (todas as categorias), `ILUMINACAO`, `OBRAS_E_SANEAMENTO`, `LIMPEZA_URBANA`, `TRANSITO`, `FISCALIZACAO_E_SEGURANCA`. A lista e as categorias de cada um estão em `backend/auth-service/src/config/orgaos.ts`. A categoria `OUTROS_EMPECILHOS` só aparece para a gestão geral.

## 4. Mapeamento dos dados (item 3.1)

| Dado | Serviço | Finalidade | Retenção | Proteção |
|---|---|---|---|---|
| Nome, e-mail | Auth | Identificar a conta | Até a exclusão da conta | Acesso só do auth_svc; criptografia de disco do provedor |
| Senha | Auth | Autenticar | Até a exclusão da conta | Só hash bcrypt |
| Aceite de termos (data, versão) | Auth | Comprovar o aceite | Até a exclusão da conta | Idem |
| Registros de segurança (tipo, data, IP, aparelho) | Auth | Detectar acesso indevido | 12 meses; anonimizados na exclusão | Sem senha, token ou e-mail em texto |
| Código de redefinição | Auth | Recuperar acesso | 30 minutos, uso único | Só hash |
| Título, descrição, categoria, região, endereço (com GPS) | Demand | Tratar a demanda | 5 anos após a conclusão | Acesso só do demand_svc; gestor do órgão da categoria |
| E-mail de quem registrou | Demand | Contato do gestor com o solicitante | Idem; apagado na exclusão da conta | Visto só pelo gestor do órgão e pelo próprio dono |
| Fotos | Demand | Evidência | Idem; apagadas na exclusão da conta | Idem |
| Histórico de status | Demand | Rastreabilidade | Idem | Idem |
| Indicadores | Metrics | Gestão | Cache de 5 minutos | Só agregados, sem identificação |

## 5. Ajustes necessários nos documentos dos entregáveis

Alguns trechos descrevem coisas que o projeto não tem:

1. **Armazenamento no aparelho (2.4):** o app não usa React Query nem AsyncStorage e não guarda denúncias localmente. Só a sessão fica no armazenamento seguro.
2. **Geolocalização (2.2):** não existe coluna de geolocalização. O GPS vai como texto dentro do campo `endereco`, e não há consulta espacial. O argumento para não cifrar essa coluna não se aplica.
3. **Criptografia de coluna (2.2):** o e-mail não pode ser cifrado diretamente porque é a chave de busca do login. O e-mail de quem registrou (`email_solicitante`) poderia, mas o gestor precisa vê-lo.
4. **Dados do cadastro (3.3):** o cadastro coleta também o nome, e não só e-mail e senha.
5. **Notificações push (2.3):** não existem. O Redis serve para atualizar os indicadores.
6. **Gestor por órgão (3.6):** passou a existir e está descrito acima.

## 6. Pontos de atenção para quem for publicar

- Banco já existente: rodar uma vez `docker compose -f docker-compose.prod.yml exec postgres sh /docker-entrypoint-initdb.d/002-roles.sh` (precisa das três senhas de banco no `.env`). Em banco novo roda sozinho.
- Os serviços aplicam o schema com `prisma db push` ao subir. As colunas e tabelas novas são só adições, então não há perda de dados.
- Gestores já cadastrados ficam com o órgão `GERAL` (acesso a tudo, como antes). Para limitar, é preciso cadastrar de novo com o código do órgão ou alterar a coluna `orgao` em `auth.usuarios`.
- Tokens emitidos antes desta versão seguem valendo até expirar (24h) e não são afetados pela invalidação por troca de senha.
- O limite de 10 pedidos de recuperação de senha por IP a cada 15 minutos fica em memória do auth-service e zera quando ele reinicia. O bloqueio de login por conta fica no banco.
- O `render.yaml` usa variáveis (`DATABASE_URL_AUTH` etc.) diferentes das que o código lê (`DATABASE_URL`). Isso já era assim e não foi mexido.
- A coordenada do GPS continua com 5 casas para o gestor, que precisa achar o local. Os demais cidadãos veem 3 casas.

## 7. Como rodar os testes

```bash
# banco de teste (Postgres) e variáveis
cd backend/auth-service    && DATABASE_URL=".../postgres?schema=auth"   npx prisma db push && npx vitest run
cd backend/demand-service  && DATABASE_URL=".../postgres?schema=demand" npx prisma db push && npx vitest run
cd backend/metrics-service && npx vitest run
cd frontend/mobile         && npm test && npx tsc --noEmit
```

Os testes do auth usam um Redis simulado em memória. Os do demand criam e removem os próprios dados, mas a rotina de retenção apaga qualquer denúncia resolvida há mais de 5 anos no banco apontado, então não rode contra um banco com dados reais.

Resultado da última execução: auth 146, demand 322, metrics 14 e app 18 testes passando. Além disso, os serviços foram executados juntos (gateway, auth, demand, metrics, Postgres e um Redis com senha) em dois roteiros pelo gateway: 45 verificações (cadastro, política de senha, bloqueio, escopo por órgão, feed, troca e recuperação de senha, exportação e exclusão da conta) e 26 de MFA (ativação, login em duas etapas, desafio recusado pelos outros serviços, repetição de código, recuperação, bloqueio e desativação). As telas do app foram conferidas por tipagem, lint e geração do bundle Android; **não foram testadas em aparelho**.
