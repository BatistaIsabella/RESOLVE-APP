# Ajustes nos textos dos entregáveis

Lista dos trechos dos PDFs (versão com o Entregável 4) que não batem com o que o projeto faz hoje, cada um com o texto sugerido para substituí-lo. Conferido contra o código da branch `feat/seguranca-lgpd`.

Trechos que já batem e **não** precisam de ajuste: 1.1, 1.2, 1.5, 1.6, 2.1, 2.3 a 2.7, 3.1 a 3.3, 3.5, 3.7, 3.8, 4.1, 4.2, 4.4 (inclusive o limite de 3 s e as 3 reconexões do Redis) e a validade de 24 h do JWT.

## Entregável 1

### 1.3 Proteção do login: mensagens genéricas

**Problema:** o texto diz que o sistema não informa se o e-mail existe. Isso vale para o login e a recuperação de senha, mas o cadastro ainda responde "e-mail já cadastrado" quando a confirmação de e-mail está desligada (o padrão).

**Texto sugerido (acrescentar):**

> O login e a recuperação de senha respondem de forma idêntica, exista ou não o e-mail. O cadastro também responde de forma idêntica quando a confirmação de e-mail está habilitada (`CONFIRMACAO_EMAIL_HABILITADA=true`): a resposta é sempre "enviamos um código de confirmação", quem já tem conta recebe um aviso por e-mail, quem não tem recebe o código, e a conta só pode entrar depois de confirmá-lo. Com o recurso desligado, o cadastro informa que o e-mail já está em uso. O recurso depende de servidor SMTP e vem desligado por padrão; o risco enquanto estiver desligado consta como R6 do RIPD.

### 1.4 Sessão do usuário

**Texto sugerido (acrescentar):**

> A invalidação das sessões após a troca de senha usa uma versão de sessão guardada no Redis. Se o Redis estiver indisponível, o serviço continua operando e os tokens anteriores seguem válidos até expirar (24 horas). A decisão prioriza a disponibilidade e consta como risco R8 do RIPD.

### 1.7 Recomendações

**Problema:** o texto trata a MFA como melhoria futura, e ela já foi implementada.

**Texto sugerido (substitui o primeiro período):**

> A autenticação multifator por código TOTP para contas de gestor foi implementada, com códigos de recuperação de uso único e segredo cifrado. Vem desligada por padrão (`MFA_HABILITADO=false`) e deve ser ligada, e tornada obrigatória aos gestores (`MFA_OBRIGATORIO_GESTOR=true`), antes da operação em produção.

## Entregável 2

### 2.2 Criptografia dos dados em repouso

**Problema:** o texto diz que o **nome** fica cifrado em coluna e que o **e-mail** fica só com criptografia de disco. No código é o contrário: o e-mail (do usuário e do solicitante) está cifrado em coluna, e o nome está em texto. Também não há integração com KMS.

**Texto sugerido (substitui o primeiro e o terceiro parágrafos):**

> Os dados armazenados no banco de dados PostgreSQL devem ser protegidos por criptografia em repouso, por criptografia em nível de disco (como AES-256, disponibilizada pelo provedor de nuvem) e, para os campos mais sensíveis, por criptografia em nível de coluna. No RESOLVE, o e-mail do usuário (Auth) e o e-mail do solicitante registrado na ocorrência (Demand) são gravados cifrados com AES-256-GCM.

> Criptografar uma coluna tem um custo: ela deixa de poder ser usada diretamente em buscas e filtros. No RESOLVE, a busca por texto usa título e descrição, e os filtros usam categoria, região, status e prioridade, então esses campos mantêm apenas a criptografia em nível de disco. O e-mail do usuário é o identificador de login e precisa ser localizado, então o Auth guarda ao lado um valor de busca: o HMAC-SHA256 do e-mail normalizado, com chave própria. O login consulta por esse valor e nunca pelo e-mail em texto. O nome do usuário não é cifrado em coluna, pois não é usado como chave de acesso e é exibido ao próprio titular e ao gestor; ele fica protegido pela criptografia de disco e pelo controle de acesso. As contas e ocorrências anteriores à criptografia são migradas automaticamente na inicialização do serviço.

**Texto sugerido para as chaves (segundo parágrafo):**

> As chaves (`DADOS_ENCRYPTION_KEY`, `EMAIL_HASH_KEY` e, para a verificação em duas etapas, `MFA_ENCRYPTION_KEY`) ficam fora do código-fonte e do banco, em variáveis de ambiente injetadas no deploy, e em produção os serviços não sobem sem elas. A integração com um serviço de gerenciamento de chaves (KMS) e a rotação das chaves ficam como melhoria futura.

### 2.3 Proteção dos dados em cache e filas (Redis)

**Texto sugerido (acrescentar ao final):**

> O Redis também guarda a versão de sessão de cada usuário (para invalidar tokens após a troca de senha) e os contadores do limite de chamadas por IP nas rotas de recuperação de senha. A fila de eventos expira em 1 hora, e o acesso à instância exige senha.

## Entregável 3

### 3.4 Direitos dos titulares

**Problema:** o texto diz que a seção "Meus dados" e o canal de e-mail ainda precisam ser implementados. A seção já existe.

**Texto sugerido (substitui o último período):**

> A seção "Meus dados" já está implementada na tela de perfil do aplicativo e permite ao titular consultar os dados da conta, corrigir nome e e-mail, trocar a senha, exportar uma cópia dos dados (JSON) e excluir a conta; as ocorrências, enquanto abertas, também podem ser editadas e excluídas. Esses direitos são atendidos de forma automatizada. Bloqueio, anonimização por desconformidade, informação sobre compartilhamento e revogação do consentimento são atendidos pelo canal de e-mail (privacidaderesolve@gmail.com), que consta na Política de Privacidade e na própria tela, nos prazos do art. 19 da LGPD.

### 3.6 Compartilhamento de dados com o Gestor responsável

**Problema:** o texto diz que o gestor tem acesso global e não há vínculo com órgão. O vínculo existe. Não existe distinção entre gestor servidor e terceirizado.

**Texto sugerido (substitui a frase "No código atual..."):**

> O controle por órgão está implementado: cada código de acesso de gestor é vinculado a um órgão, que define as categorias de ocorrência visíveis na listagem, no detalhe, na alteração de status e de prioridade, na exclusão e nos indicadores; uma ocorrência de outro órgão retorna 404. O sistema não diferencia servidores de colaboradores terceirizados: essa distinção, o vínculo com a empresa e a revisão periódica dos acessos são tratados no termo de cooperação (modelo em `TERMO_DE_COOPERACAO_MODELO.md`).

### 3.9 Recomendações

**Problema:** diz para implementar "Meus dados" e o fluxo de aceite, que já existem, e para elaborar o RIPD, que já tem rascunho.

**Texto sugerido:**

> Como próximos passos, recomenda-se: manter atualizado o mapeamento de dados tratados pelo RESOLVE (item 3.1); aprovar o RIPD, cujo rascunho já foi elaborado (item 3.7), com a designação do encarregado pelo órgão controlador; obter a revisão jurídica da Política de Privacidade e dos Termos de Uso; e formalizar, por escrito, os termos de compartilhamento de dados com cada órgão público que venha a utilizar a plataforma.

## Entregável 4

### 4.3 Proteção contra excesso de requisições

**Problema:** o texto diz que o login tem limite de 5 tentativas por IP e e-mail. O código bloqueia depois de **3** falhas seguidas, por **e-mail** (sem considerar o IP), e o texto contradiz o item 1.3 do Entregável 1. Além disso, existem limites que o texto não cita.

**Texto sugerido (substitui o primeiro parágrafo):**

> O Gateway aplica um limite global de 5.000 requisições a cada 15 minutos por IP e, nas rotas de autenticação (`/auth`), um limite mais baixo de 100 requisições a cada 15 minutos por IP. O login tem um bloqueio próprio no Auth: depois de 3 tentativas consecutivas sem sucesso, o acesso à conta é bloqueado por 15 minutos e a API responde HTTP 429. A contagem é por e-mail, gravada no banco, e vale também para e-mails que não existem, de modo que a resposta de bloqueio é igual para qualquer conta; um login bem-sucedido zera o contador. As rotas de recuperação de senha, de confirmação de e-mail e da segunda etapa da MFA têm um limite adicional de 10 chamadas a cada 15 minutos por IP, mantido no Redis. Esses limites reduzem o risco de força bruta descrito no item 1.3 do Entregável 1.

### 4.5 Proteção contra ataques à aplicação

**Texto sugerido (substitui a última frase do primeiro parágrafo):**

> No login, a resposta em caso de falha é sempre a mesma (credenciais inválidas), sem revelar se o e-mail existe, e a resposta de bloqueio por excesso de tentativas também é igual para qualquer conta.

**Texto sugerido (acrescentar ao segundo parágrafo):**

> As fotos enviadas com a ocorrência são validadas no servidor: só são aceitas imagens JPEG, PNG ou WEBP em base64, a assinatura do arquivo precisa corresponder ao tipo declarado (o que recusa texto, HTML, SVG ou executáveis disfarçados de imagem), cada foto pode ter até 2 MB e cada denúncia até 5 fotos.

### 4.6 Testes de segurança e disponibilidade

**Problema:** o texto cita só o workflow manual e os testes TS06 a TS09.

**Texto sugerido (acrescentar):**

> Os serviços possuem testes automatizados de segurança executados com um banco PostgreSQL: bloqueio de login (TS09), política de senha (TS10), recuperação de senha (TS11), sessões e Meus dados (TS12), escopo por órgão e auditoria (TS13), MFA (TS14), limite por IP no Redis (TS15), e-mail cifrado (TS16 no Auth e TS12 no Demand), confirmação de e-mail (TS17) e validação das fotos (UT13 e TS13 no Demand).

### 4.7 Recomendações

**Problema:** três das quatro recomendações já foram atendidas e uma foi atendida em parte.

**Texto sugerido (substitui o parágrafo):**

> Situação das recomendações: (1) atendida: em produção os serviços não sobem sem `JWT_SECRET`, o cadastro de gestor fica fechado sem os códigos de acesso (`GESTOR_ACCESS_CODES`) e não há mais valor padrão no código; (2) atendida: o CORS do Gateway e dos serviços vem fechado e só libera as origens listadas em `CORS_ORIGINS`; (3) atendida: o limite do corpo das requisições caiu de 50 MB para 10 MB e as fotos passaram a ser validadas quanto ao tipo, ao conteúdo, ao tamanho (2 MB) e à quantidade (5 por denúncia); como melhoria futura, as fotos poderiam sair do banco para um armazenamento de arquivos; (4) pendente: o workflow de regressão ainda é acionado apenas manualmente; recomenda-se acioná-lo a cada alteração e usá-lo como barreira de qualidade antes do merge.

### 4.1 Arquitetura e disponibilidade (observações)

**Para conferir pela equipe:**

- O texto diz que o banco fica no Supabase, e o `backend/.env.example` aponta para o Supabase; o `render.yaml` define bancos do próprio Render (`db_auth`, `db_demand`). Confirme qual dos dois é o ambiente real e mantenha o texto igual a ele.
- O compose de desenvolvimento usa `restart: always`; o de produção (`docker-compose.prod.yml`) usa `restart: unless-stopped`. O texto vale para o de desenvolvimento.
- O monitor externo (UptimeRobot) não faz parte do repositório e não foi verificado.
