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
| 1.3 Mensagens genéricas | Feito (confirmação de e-mail desligada por padrão) | O login responde sempre "Credenciais inválidas" (ou o bloqueio, igual para qualquer e-mail). Com `CONFIRMACAO_EMAIL_HABILITADA=true` o cadastro também passa a responder igual (202) para qualquer e-mail: quem já tem conta recebe um aviso por e-mail, quem não tem recebe um código, e a conta só entra depois de confirmá-lo. **Com a confirmação desligada, o cadastro ainda responde "E-mail já cadastrado" (409)**, o que permite descobrir se um e-mail existe. Ligue-a junto com o SMTP. |
| 1.4 Validade do token e invalidação na troca de senha | Feito | Token de 24h. Ao trocar ou redefinir a senha, a versão da sessão sobe no Redis e os tokens antigos são recusados pelos três serviços. Se o Redis estiver fora do ar, os tokens antigos continuam valendo até expirar. |
| 1.4 Token não exposto | Feito | Fica no Keychain/Keystore (`expo-secure-store`) e é apagado ao sair. |
| 1.5 Recuperação de senha | Feito | Código aleatório de 24 bytes enviado por e-mail, válido por 30 minutos, uso único. No banco fica só o hash. A resposta é igual exista ou não o e-mail. Precisa de SMTP configurado. |
| 1.6 Registro de eventos | Feito | Tabela `auth.eventos_auth`: cadastro, login ok, login com falha, login bloqueado, logout, pedido e conclusão de redefinição, troca de senha, alteração de dados, aceite de termos, exclusão de conta, MFA e, com a confirmação de e-mail ligada, cadastro de e-mail já existente, e-mail confirmado, reenvio do código e login sem confirmar. Guarda data, IP e aparelho. Nunca guarda senha, token ou e-mail em texto: quem não tem conta é identificado por um HMAC do e-mail (chave `EMAIL_HASH_KEY`). |
| 1.7 MFA para administradores | Feito, desligada por padrão | Vem desligada (`MFA_HABILITADO=false`): ninguém consegue ativar e o app esconde a opção; para usar, ligar a variável. Verificação em duas etapas (TOTP, compatível com Google e Microsoft Authenticator) para contas de gestor. Opcional por padrão; com `MFA_OBRIGATORIO_GESTOR=true` todo gestor precisa ativar no próximo login. O login passa a ter duas etapas, há 8 códigos de recuperação de uso único, o mesmo código não vale duas vezes e o segredo fica cifrado no banco (AES-256-GCM). 3 códigos errados bloqueiam por 15 minutos. |
| 1.7 Revisão dos registros | Parcial | Os registros existem e podem ser consultados no banco. Não há tela nem alerta. |

### Entregável 2 – Dados em repouso

| Item | Situação | Como ficou |
|---|---|---|
| 2.2 Criptografia de disco (AES-256) | Parcial | Não é feita pelo código: depende de onde o banco roda. Supabase/Render oferecem; no `docker-compose.prod.yml` o volume só é criptografado se o disco do servidor for. Precisa ser confirmado no ambiente real. |
| 2.2 Criptografia de coluna e KMS | Feito (sem KMS) | O e-mail do usuário (auth) e o e-mail do solicitante (demand) ficam cifrados com AES-256-GCM. O login busca por um valor à parte, o HMAC-SHA256 do e-mail (`email_hash`), com chave própria. Contas e ocorrências antigas são migradas sozinhas ao subir o serviço. As chaves vêm de variáveis de ambiente (`DADOS_ENCRYPTION_KEY`, `EMAIL_HASH_KEY`), fora do código e do banco; em produção o serviço não sobe sem elas. **Não há integração com um KMS**: o ideal é que quem faz o deploy injete as chaves a partir de um cofre de segredos. |
| 2.3 Redis com autenticação e TTL | Feito | `requirepass` nos dois compose; fila de eventos expira em 1 hora; cache de indicadores em 5 minutos. Os eventos só têm ids e status, sem dados pessoais. |
| 2.4 Dados no aparelho | Feito | Sessão no Keychain/Keystore e apagada no logout. O app não guarda denúncias no aparelho. |
| 2.5 Indicadores sem identificar o titular | Feito | Já era assim: só contagens por categoria, região e status. |
| 2.6 Menor privilégio no banco | Feito (produção) | `docker-compose.prod.yml` usa um usuário por serviço: `auth_svc` (só schema auth), `demand_svc` (só schema demand) e `metrics_svc` (só leitura no demand). Em desenvolvimento continua o usuário administrador. |
| 2.7 Retenção de 5 anos | Feito | Rotina diária apaga denúncias resolvidas há mais de 5 anos (`RETENCAO_ANOS`), com fotos e histórico. A data de conclusão passou a ser gravada; as antigas são preenchidas pelo histórico. |
| 2.7 Descarte a pedido do titular | Feito | Ver 3.4. O cache de indicadores é invalidado e os registros de segurança do titular são anonimizados. Backups do banco seguem a rotação do provedor. |
| 2.8 Criptografia ponta a ponta das fotos | Não feito | Melhoria futura na própria documentação. |
| Entregável 4 – Fotos | Feito | O Demand só aceita imagens JPEG, PNG ou WEBP em base64, confere se o conteúdo é mesmo do tipo declarado (recusa texto, HTML, SVG e executáveis), limita cada foto a 2 MB e a denúncia a 5 fotos (413 para foto grande, 400 nos demais casos). O limite do corpo das requisições já havia caído para 10 MB. Código em `demand-service/src/utils/imagem.ts`. |

### Entregável 3 – LGPD

| Item | Situação | Como ficou |
|---|---|---|
| 3.1 Mapeamento dos dados | Feito | Tabela na seção 4 deste documento. |
| 3.3 Minimização | Feito | Sem CPF. Mantém nome, e-mail e senha. |
| 3.4 Acesso, correção, portabilidade, eliminação | Feito | Tela "Meus dados" (toque no nome no topo das telas): ver e corrigir nome e e-mail, trocar senha, exportar os dados (JSON, pela folha de compartilhamento) e excluir a conta. |
| 3.4 Bloqueio, anonimização por pedido, informação de compartilhamento, revogação | Parcial | Pelo e-mail privacidaderesolve@gmail.com, que está na política e na tela. É processo manual, sem automação. |
| 3.5 Aceite da política e dos termos | Feito | Checkbox obrigatório no cadastro, tela pública de leitura, aceite gravado com data e versão. Contas antigas e mudanças de versão (`TERMOS_VERSAO`) pedem novo aceite no próximo acesso. Os textos são um rascunho e precisam de revisão jurídica. |
| 3.6 Gestor só vê o seu órgão | Feito | Cada código de acesso de gestor vincula a um órgão, que define as categorias visíveis. Vale na listagem, no detalhe, na mudança de status e prioridade, na exclusão e nos indicadores. Denúncia de outro órgão responde 404. |
| 3.6 Gestores terceirizados e termo de cooperação | Parcial | Não há distinção no sistema entre servidor e terceirizado. Há um modelo de termo em [TERMO_DE_COOPERACAO_MODELO.md](TERMO_DE_COOPERACAO_MODELO.md), a ser preenchido e revisado pelo órgão. |
| 3.6 Cidadão vendo dados de outros | Corrigido | O feed devolvia e-mail e identificador de quem registrou. Agora não devolve, e as coordenadas saem com 3 casas (cerca de 100 m). |
| 3.7 RIPD | Feito (rascunho) | [RIPD.md](RIPD.md). Os campos do órgão controlador e a aprovação ficam para quem for operar. |
| 3.8 Resposta a incidentes | Feito | [PROCEDIMENTO_INCIDENTES.md](PROCEDIMENTO_INCIDENTES.md): papéis, fluxo, contenção por cenário, consultas, modelo de registro e de aviso. |

## 2. Endpoints novos ou alterados

Pelo gateway. As rotas `/demands/...` viram `/demandas/...` no demand-service.

| Método e rota | Uso |
|---|---|
| `POST /auth/register` | Agora exige `aceiteTermos: true` e `versaoTermos`. Gestor envia `codigoAcesso`. |
| `POST /auth/login` | Devolve também `orgao` e `termosPendentes`. Responde 429 com `Retry-After` quando bloqueado. |
| `POST /auth/logout` | Registra a saída. O token continua o mesmo até expirar; o app o descarta. |
| `POST /auth/forgot-password`, `POST /auth/reset-password` | Recuperação de senha. |
| `POST /auth/confirmar-email` | Recebe o `token` enviado por e-mail e ativa a conta. Uso único, 24 h. Só existe efeito com `CONFIRMACAO_EMAIL_HABILITADA=true`. |
| `POST /auth/reenviar-confirmacao` | Recebe o `email` e reenvia o código se a conta aguarda confirmação. A resposta é igual para qualquer e-mail. Intervalo mínimo de 1 minuto. |
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
| `MFA_HABILITADO` | auth | `true` liga a MFA dos gestores. Padrão `false`: ninguém consegue ativar e o app esconde a opção. Quem já a tivesse ativa continua sendo desafiado no login. |
| `MFA_ENCRYPTION_KEY` | auth | Chave (32 bytes em base64, `openssl rand -base64 32`) que cifra o segredo do autenticador. Em produção, sem ela, a MFA fica indisponível. Não troque depois de haver MFA ativa. |
| `MFA_OBRIGATORIO_GESTOR` | auth | `true` exige MFA de todo gestor. Padrão `false`. |
| `DADOS_ENCRYPTION_KEY` | auth, demand | Chave (32 bytes em base64, `openssl rand -base64 32`) que cifra o e-mail no banco. Tem de ser a mesma nos dois serviços. Obrigatória em produção. **Não troque depois de haver dados**: os e-mails gravados deixariam de ser lidos. |
| `EMAIL_HASH_KEY` | auth | Chave (pelo menos 32 bytes em base64) do valor de busca do e-mail. Obrigatória em produção. Trocá-la impede o login de todas as contas até o valor de busca ser refeito. |
| `CONFIRMACAO_EMAIL_HABILITADA` | auth | `true` liga a confirmação de e-mail no cadastro. Padrão `false`. Exige SMTP: sem ele ninguém consegue concluir o cadastro. Só o app mobile foi adaptado. |
| `TOKEN_CONFIRMACAO_HORAS`, `CONTA_NAO_CONFIRMADA_DIAS` | auth | Validade do código de confirmação e prazo para apagar contas nunca confirmadas (padrões: 24 e 3). |
| `IMAGENS_MAX_POR_DENUNCIA`, `IMAGEM_MAX_BYTES` | demand | Quantidade máxima de fotos por denúncia e tamanho máximo de cada uma, em bytes (padrões: 5 e 2 MB). |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | auth | Envio do e-mail de redefinição. Sem `SMTP_HOST` o e-mail não sai; em desenvolvimento o link aparece no log. |
| `DEMAND_SERVICE_URL` | auth | Usada na exclusão da conta. |
| `CORS_ORIGINS` | gateway e serviços | Origens web permitidas. Vazio libera ninguém (o app não precisa). |
| `LOGIN_MAX_FALHAS`, `LOGIN_BLOQUEIO_MINUTOS`, `TOKEN_REDEFINICAO_MINUTOS`, `LOG_RETENCAO_DIAS`, `RETENCAO_ANOS`, `TERMOS_VERSAO` | auth, demand | Ajustes opcionais (padrões: 3, 15, 30, 365, 5, 1.0). |

Órgãos disponíveis: `GERAL` (todas as categorias), `ILUMINACAO`, `OBRAS_E_SANEAMENTO`, `LIMPEZA_URBANA`, `TRANSITO`, `FISCALIZACAO_E_SEGURANCA`. A lista e as categorias de cada um estão em `backend/auth-service/src/config/orgaos.ts`. A categoria `OUTROS_EMPECILHOS` só aparece para a gestão geral.

## 4. Mapeamento dos dados (item 3.1)

| Dado | Serviço | Finalidade | Retenção | Proteção |
|---|---|---|---|---|
| Nome, e-mail | Auth | Identificar a conta | Até a exclusão da conta | Acesso só do auth_svc; e-mail cifrado com AES-256-GCM (coluna) e criptografia de disco do provedor |
| Senha | Auth | Autenticar | Até a exclusão da conta | Só hash bcrypt |
| Aceite de termos (data, versão) | Auth | Comprovar o aceite | Até a exclusão da conta | Idem |
| Registros de segurança (tipo, data, IP, aparelho) | Auth | Detectar acesso indevido | 12 meses; anonimizados na exclusão | Sem senha, token ou e-mail em texto |
| Código de redefinição | Auth | Recuperar acesso | 30 minutos, uso único | Só hash |
| Título, descrição, categoria, região, endereço (com GPS) | Demand | Tratar a demanda | 5 anos após a conclusão | Acesso só do demand_svc; gestor do órgão da categoria |
| E-mail de quem registrou | Demand | Contato do gestor com o solicitante | Idem; apagado na exclusão da conta | Cifrado com AES-256-GCM no banco; visto em texto só pelo gestor do órgão e pelo próprio dono |
| Fotos | Demand | Evidência | Idem; apagadas na exclusão da conta | Idem |
| Histórico de status | Demand | Rastreabilidade | Idem | Idem |
| Indicadores | Metrics | Gestão | Cache de 5 minutos | Só agregados, sem identificação |

## 5. Ajustes necessários nos documentos dos entregáveis

O texto sugerido para cada trecho está em [AJUSTES_NOS_ENTREGAVEIS.md](AJUSTES_NOS_ENTREGAVEIS.md). Alguns trechos descrevem coisas que o projeto não tem:

1. **Armazenamento no aparelho (2.4):** o app não usa React Query nem AsyncStorage e não guarda denúncias localmente. Só a sessão fica no armazenamento seguro.
2. **Geolocalização (2.2):** não existe coluna de geolocalização. O GPS vai como texto dentro do campo `endereco`, e não há consulta espacial. O argumento para não cifrar essa coluna não se aplica.
3. **Criptografia de coluna (2.2):** foi implementada para o e-mail do usuário e o e-mail do solicitante (ver a tabela do item 2.2). A coordenada de GPS não tem coluna própria e não é cifrada em coluna, só por disco.
4. **Dados do cadastro (3.3):** o cadastro coleta também o nome, e não só e-mail e senha.
5. **Notificações push (2.3):** não existem. O Redis serve para atualizar os indicadores.
6. **Gestor por órgão (3.6):** passou a existir e está descrito acima.

## 6. Pontos de atenção para quem for publicar

- Banco já existente: rodar uma vez `docker compose -f docker-compose.prod.yml exec postgres sh /docker-entrypoint-initdb.d/002-roles.sh` (precisa das três senhas de banco no `.env`). Em banco novo roda sozinho.
- Os serviços aplicam o schema com `prisma db push` ao subir. As colunas e tabelas novas são só adições, então não há perda de dados.
- **Antes de publicar esta versão, faça um backup do banco e gere as duas chaves** (`DADOS_ENCRYPTION_KEY`, `EMAIL_HASH_KEY`). A mudança altera a coluna do e-mail do auth (`usuarios.email`) e retira dela a restrição de unicidade, que passa para `email_hash`. Ao subir, o serviço cifra os e-mails existentes antes de aceitar requisições; se isso falhar, ele não sobe. Guarde as chaves fora do repositório e do banco: sem elas os e-mails não podem ser lidos. Voltar para a versão anterior depois da migração exige restaurar o backup.
- O `prisma db push` desta versão não renomeia nenhuma coluna, mas troca o tipo da coluna `usuarios.email` (de 254 para 600 caracteres), adiciona `email_hash`, `email_pendente` e `criado_em`, e cria a tabela `tokens_confirmacao_email`. Em `demand.denuncias` a coluna `email_solicitante` continua com o mesmo nome no banco.
- O JWT continua levando o e-mail em texto (a assinatura não cifra o conteúdo). O demand-service usa esse e-mail para gravar o e-mail do solicitante, já cifrado.
- Gestores já cadastrados ficam com o órgão `GERAL` (acesso a tudo, como antes). Para limitar, é preciso cadastrar de novo com o código do órgão ou alterar a coluna `orgao` em `auth.usuarios`.
- Tokens emitidos antes desta versão seguem valendo até expirar (24h) e não são afetados pela invalidação por troca de senha.
- O limite de 10 pedidos de recuperação de senha por IP a cada 15 minutos fica no Redis (`auth:rl:recuperacao:<ip>`) e não zera com a reinicialização. Se o Redis estiver fora do ar, vale um limite na memória do processo. O bloqueio de login por conta fica no banco.
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

Resultado da última execução (em um Postgres 16 local): auth 192, demand 370, metrics 14 e app 18 testes passando. Antes desta rodada de criptografia e confirmação de e-mail, os serviços também foram executados juntos (gateway, auth, demand, metrics, Postgres e um Redis com senha) em dois roteiros pelo gateway: 45 verificações (cadastro, política de senha, bloqueio, escopo por órgão, feed, troca e recuperação de senha, exportação e exclusão da conta) e 26 de MFA. **Esses dois roteiros não foram repetidos com as mudanças de criptografia e confirmação de e-mail.** As telas do app foram conferidas por tipagem, lint e testes de utilitários; **não foram testadas em aparelho**, inclusive a nova tela de confirmação de e-mail.
