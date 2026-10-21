# Segurança e LGPD no RESOLVE: relatório de entrega

Entregáveis 1 (autenticação e senhas), 2 (dados em repouso) e 3 (LGPD).
Branch: `feat/seguranca-lgpd`.

Este documento tem três partes: o que foi implementado, o que não foi (com o motivo, como fazer e se vale a pena no contexto acadêmico) e o roteiro de testes.

---

## 1. O que foi implementado

| # | Requisito (item do entregável) | O que foi feito | Onde está |
|---|---|---|---|
| 1 | Senha forte (1.2) | 12+ caracteres, maiúscula, minúscula, número e símbolo, validado no servidor e no app (lista de requisitos que vai marcando enquanto digita) | `auth-service/src/utils/senha.ts`, `mobile/utils/senha.ts` |
| 2 | Evitar senhas comuns ou vazadas (1.2) | Lista de senhas comuns e consulta ao Have I Been Pwned (só 5 caracteres do hash saem do servidor) | `senhasComuns.ts`, `senhaVazada.ts` |
| 3 | Hash com salt (1.2) | bcrypt com custo 12 | `senhaService.ts` |
| 4 | Bloqueio após 3 tentativas (1.3) | 3 falhas seguidas bloqueiam o login por 15 minutos, por e-mail, gravado no banco. Vale também para e-mail que não existe | `tentativasLoginService.ts` |
| 5 | Mensagens genéricas no login (1.3) | "Credenciais inválidas" para qualquer erro, e a resposta de bloqueio é igual para qualquer e-mail | `authService.ts` |
| 6 | Token com validade e sem exposição (1.4) | JWT de 24h, guardado no Keychain/Keystore do aparelho e apagado no logout | `mobile/lib/secureStorage.ts` |
| 7 | Invalidar sessões ao trocar a senha (1.4) | A troca ou redefinição de senha encerra os tokens anteriores nos três serviços (via Redis) | `sessaoService.ts` (auth, demand, metrics) |
| 8 | Recuperação de senha (1.5) | Código temporário (30 min), uso único, enviado por e-mail; só o hash fica no banco; resposta igual para e-mail existente ou não | `recuperacaoSenhaService.ts`, telas `esqueci-senha` e `redefinir-senha` |
| 9 | Registro dos acessos (1.6) | Tabela `auth.eventos_auth` com cadastro, login, falha, bloqueio, logout, redefinição, troca de senha, alteração de dados, aceite e exclusão. Sem senha, token ou e-mail em texto | `auditoriaService.ts` |
| 10 | Segredos obrigatórios | Os serviços não sobem sem `JWT_SECRET`, e o cadastro de gestor fica fechado em produção sem código configurado | `config/env.ts`, `codigosGestor.ts` |
| 11 | Redis protegido (2.3) | Senha obrigatória, fila de eventos expira em 1 hora, cache de indicadores em 5 minutos | `docker-compose*.yml`, `config/redis.ts` |
| 12 | Dados no aparelho (2.4) | Sessão no armazenamento seguro, apagada ao sair; o app não guarda denúncias localmente | `mobile/lib/secureStorage.ts` |
| 13 | Indicadores sem identificar o titular (2.5) | Já era assim: só contagens por categoria, região e status | `metrics-service` |
| 14 | Menor privilégio no banco (2.6) | Em produção, um usuário de banco por serviço, cada um só no seu schema; o metrics só lê | `postgres-init/` |
| 15 | Retenção de 5 anos (2.7) | Rotina diária apaga denúncias resolvidas há mais de 5 anos, com fotos e histórico; a data de conclusão passou a ser gravada | `demand-service/src/jobs/retencao.ts` |
| 16 | Direitos do titular (3.4) | Tela "Meus dados": ver, corrigir nome e e-mail, trocar senha, exportar uma cópia (JSON) e excluir a conta | `mobile/app/perfil.tsx`, `/auth/me`, `/demands/me/*` |
| 17 | Descarte a pedido do titular (2.7, 3.4) | Na exclusão, o e-mail e as fotos são apagados, as ocorrências ficam sem ligação com a pessoa pelo prazo de retenção, e os registros de segurança dela são anonimizados | `titularService.ts`, `auditoriaService.ts` |
| 18 | Consentimento e transparência (3.5) | Aceite obrigatório da Política de Privacidade e dos Termos no cadastro, gravado com data e versão. Contas antigas e novas versões pedem novo aceite | `mobile/app/aceite-termos.tsx`, `privacidade.tsx` |
| 19 | Gestor só vê o seu órgão (3.6) | Cada código de acesso liga o gestor a um órgão, que define as categorias visíveis (lista, detalhe, status, prioridade, exclusão e indicadores). Outro órgão responde 404 | `auth-service/src/config/orgaos.ts` |
| 20 | Cidadão não vê dados de outros (3.6) | O feed devolvia e-mail e identificador de quem registrou; agora não devolve, e as coordenadas saem com menos precisão | `denunciaService.ts` |
| 21 | Mapeamento dos dados (3.1) | Tabela de dados, finalidade, retenção e proteção | [IMPLEMENTACAO.md](IMPLEMENTACAO.md), seção 4 |
| 22 | MFA para administradores (1.7) | Verificação em duas etapas por código TOTP para gestores, com 8 códigos de recuperação de uso único, proteção contra repetição do código e segredo cifrado. Opcional por padrão, ou obrigatória com `MFA_OBRIGATORIO_GESTOR=true` | `mfaService.ts`, `cifra.ts`, telas `mfa` e `mfa-configurar`, cartão em "Meus dados" |

Extras: limite de 100 chamadas por 15 minutos em `/auth` no gateway, CORS fechado por padrão, IP real repassado aos serviços e corpo máximo de 10 MB (era 50 MB).

---

## 2. O que não foi implementado

Na coluna "Precisa no acadêmico?": **Não** significa que pode ficar como está, explicado no texto; **Recomendo** significa que vale fazer.

### 2.1 Documentos (não são código)

| Item | Por que não foi feito | Como fazer | Precisa no acadêmico? |
|---|---|---|---|
| RIPD (3.7) | É um documento a ser escrito com a equipe, não funcionalidade | Seguir o guia da ANPD: descrever os dados tratados, os riscos (ex.: reidentificação pela localização) e as medidas já adotadas, que estão no relatório acima | **Recomendo.** Costuma ser o que o professor espera ver. Posso redigir um rascunho |
| Procedimento de resposta a incidentes (3.8) | Também é documento | Uma página com: quem decide, como identificar o que foi afetado (consultas abaixo, na seção 3), prazo e modelo de aviso à ANPD e aos titulares (art. 48) | **Recomendo**, é curto |
| Termo de cooperação com o órgão (3.6) | Depende do órgão público contratante, não da equipe | Modelo com finalidade, escopo dos dados e responsabilidades de cada parte | **Não.** Basta citar que existiria em um uso real |
| Revisão jurídica dos textos da política e dos termos | Os textos são um rascunho nosso | Passar para o orientador ou para o jurídico do órgão antes de uso real | **Não.** Basta indicar que é rascunho |

### 2.2 Código ou infraestrutura

| Item | Por que não foi feito | Como fazer | Precisa no acadêmico? |
|---|---|---|---|
| Criptografia de disco (2.2) | Não é feita pelo código; depende de onde o banco roda | Usar um provedor que já faz (Supabase, Render) ou criptografar o disco do servidor (LUKS). Registrar qual foi o escolhido | **Não.** Basta documentar o provedor |
| Criptografia de coluna e KMS (2.2) | O e-mail é a chave de busca do login, então não dá para cifrar direto sem quebrar o login | Guardar o e-mail cifrado (AES-GCM) mais um hash para busca (HMAC), com a chave em um cofre de segredos. Mexe em cadastro, login e troca de e-mail, então são alguns dias de trabalho | **Não.** O próprio documento já aceita não cifrar a geolocalização por motivo parecido. Basta justificar |
| Cadastro que revela e-mail existente (1.3) | Responder igual exigiria confirmar o e-mail por mensagem, o que depende do SMTP e muda o fluxo de cadastro | Cadastro sempre responde "verifique seu e-mail" e a conta só é ativada pelo link | **Não.** Pode ficar como risco aceito, descrito |
| Tela ou alerta para revisar os registros (1.7) | Os registros existem, falta a interface | Consultas SQL (seção 3) servem para o acadêmico. Em produção: painel ou alerta quando houver muitos bloqueios | **Não** |
| Criptografia ponta a ponta das fotos (2.8) | Melhoria futura na própria documentação, e o gestor precisa ver as fotos | Cifrar no app com chave do órgão. As fotos hoje ficam no banco em base64; o ideal seria mover para um armazenamento de arquivos | **Não** |
| Diferenciar gestor servidor de terceirizado (3.6) | Hoje só existe o vínculo ao órgão, pelo código | Uma coluna de vínculo (servidor ou terceirizado) e a empresa, com um código por empresa | **Não.** Basta descrever |
| Bloqueio, anonimização por pedido, informação de compartilhamento e revogação, automatizados (3.4) | O documento pede um canal simples por e-mail (privacidaderesolve@gmail.com), que está na política e na tela | Tela de solicitação com fila para a equipe responder | **Não** |
| Remoção dos dados nos backups do banco (2.7) | Depende da rotação de backup do provedor | Configurar a retenção dos backups para um prazo definido e documentar | **Não** |
| Sessões antigas continuam valendo se o Redis cair (1.4) | Decisão de projeto: preferi o sistema continuar de pé. A própria documentação diz "quando o mecanismo permitir" | Trocar a regra para recusar o token quando o Redis não responde, ou guardar a versão da sessão no banco | **Não** |
| Tokens antigos valem até 24h depois da atualização | Não há como invalidar tokens que não têm a versão da sessão | Esperar 24h após o deploy ou trocar o `JWT_SECRET` (desloga todo mundo) | **Não** |
| Limite de recuperação de senha em memória | Zera quando o auth-service reinicia | Guardar o contador no Redis | **Não** |
| `render.yaml` com variáveis diferentes das do código | Já era assim antes; não mexi para não alterar o que funciona | Alinhar `DATABASE_URL_AUTH` e `DATABASE_URL_DEMAND` com o que o código lê (`DATABASE_URL`) | **Não**, só se for fazer deploy no Render |

### 2.3 O que eu não consegui testar

| Item | Motivo | Como testar |
|---|---|---|
| Telas novas em celular ou emulador | Não abri o app em aparelho. Só conferi tipagem, lint e geração do bundle | Roteiro da seção 3 |
| Envio real de e-mail | Sem SMTP configurado | Preencher `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` e `SMTP_FROM` e pedir uma redefinição |
| Deploy em produção | Não tenho acesso aos ambientes | Itens 8.x do roteiro |
| Redis fora do ar em produção | Só simulei | Parar o Redis e conferir que o login ainda funciona |

### 2.4 Trechos dos documentos dos entregáveis que não batem com o projeto

Vale corrigir o texto antes de entregar:

1. **2.4:** o app não usa React Query nem AsyncStorage e não guarda denúncias no aparelho. Só a sessão fica no armazenamento seguro.
2. **2.2:** não existe coluna de geolocalização. O GPS vai como texto dentro do campo de endereço e não há consulta espacial.
3. **3.3:** o cadastro coleta também o nome, e não só e-mail e senha.
4. **2.3:** não há notificações push. O Redis serve para atualizar os indicadores.
5. **3.6:** o gestor por órgão passou a existir (item 19 acima).

---

## 3. Roteiro de testes

Para a líder testar. Se algo não bater, anotar o passo, o que apareceu na tela e, se der, o print.

### Preparação

1. Subir o backend (`backend/`, `docker compose up -d --build`).
2. No `.env` do backend, para testar gestores por órgão: `GESTOR_ACCESS_CODES=GERAL=geral-123;ILUMINACAO=luz-123;OBRAS_E_SANEAMENTO=obras-123`.
3. Para o bloqueio de login não demorar 15 minutos: `LOGIN_BLOQUEIO_MINUTOS=1`.
4. Sem SMTP, o código de redefinição de senha aparece no log (`docker compose logs auth-service`).
5. Rodar o app: `cd frontend/mobile && npm install && npm start`, com `EXPO_PUBLIC_API_GATEWAY_URL` apontando para o gateway.

### Cadastro e senha

| # | O que fazer | O que deve acontecer | OK? |
|---|---|---|---|
| 1 | Digitar uma senha aos poucos no cadastro | A lista abaixo do campo marca cada requisito | [ ] |
| 2 | Cadastrar com `senha123` | Recusa dizendo o que falta | [ ] |
| 3 | Cadastrar com senha comum que cumpre as regras (ex.: `Senha@123456`) | Recusa dizendo que é muito comum | [ ] |
| 4 | Cadastrar com uma senha que contém o seu nome | Recusa | [ ] |
| 5 | Preencher tudo sem marcar o aceite | Pede para aceitar a Política e os Termos | [ ] |
| 6 | Tocar no link da política | Abre a tela de leitura e dá para voltar | [ ] |
| 7 | Marcar o aceite e criar a conta | Conta criada e login automático | [ ] |
| 8 | Cadastrar o mesmo e-mail trocando maiúsculas | Recusa, e-mail já existe | [ ] |

### Login, bloqueio e sessão

| # | O que fazer | O que deve acontecer | OK? |
|---|---|---|---|
| 9 | Errar a senha com e-mail que existe e com e-mail que não existe | Mesma mensagem nos dois casos | [ ] |
| 10 | Errar 3 vezes seguidas e tentar a 4ª com a senha certa | A 4ª é bloqueada ("muitas tentativas") | [ ] |
| 11 | Esperar o bloqueio acabar e entrar | Entra | [ ] |
| 12 | Errar 2 vezes, acertar, errar mais 2 | Não bloqueia | [ ] |
| 13 | Fechar o app por completo e abrir de novo (com "Mantenha-me conectado") | Continua logado | [ ] |
| 14 | Tocar em "Sair" e abrir o app | Volta para a tela inicial, sem sessão | [ ] |

### Esqueci minha senha

| # | O que fazer | O que deve acontecer | OK? |
|---|---|---|---|
| 15 | "Esqueci minha senha" com e-mail cadastrado | Mensagem genérica de que, se existir, será enviado | [ ] |
| 16 | O mesmo com e-mail que não existe | Exatamente a mesma mensagem | [ ] |
| 17 | Usar o código com uma senha forte | Senha trocada e o login com a nova funciona | [ ] |
| 18 | Usar com senha fraca | Recusa explicando, e o código continua valendo | [ ] |
| 19 | Usar o mesmo código de novo | Recusa ("inválido ou expirado") | [ ] |
| 20 | Usar um código com mais de 30 minutos | Recusa | [ ] |
| 21 | Bloquear uma conta e depois redefinir a senha | O login volta a funcionar | [ ] |

### Termos de uso

| # | O que fazer | O que deve acontecer | OK? |
|---|---|---|---|
| 22 | Entrar com uma conta criada antes desta versão | Aparece a tela de aceite antes das demais | [ ] |
| 23 | Tocar em "Li e aceito" | Entra e não pergunta de novo | [ ] |
| 24 | Tocar em "Sair" na tela de aceite | Volta para o início, sem sessão | [ ] |

### Meus dados (tocar no nome no topo da lista de denúncias ou do painel do gestor)

| # | O que fazer | O que deve acontecer | OK? |
|---|---|---|---|
| 25 | Abrir a tela | Mostra nome, e-mail, tipo de conta (e órgão, no gestor) | [ ] |
| 26 | Mudar o nome | Salva e aparece no topo | [ ] |
| 27 | Mudar o e-mail e entrar com o novo | Funciona; com e-mail de outra conta, recusa | [ ] |
| 28 | Trocar a senha com a senha atual errada | Recusa | [ ] |
| 29 | Trocar a senha estando logado em dois aparelhos | Este continua logado; no outro, a próxima ação pede login | [ ] |
| 30 | "Exportar meus dados" | Abre o compartilhamento com um JSON (fotos só contadas) | [ ] |
| 31 | Excluir uma conta de teste que tenha denúncia com foto | Volta ao início; o login com essa conta falha | [ ] |
| 32 | Como gestor, abrir aquela denúncia | Continua lá, sem e-mail de solicitante e sem foto | [ ] |

### Gestor por órgão

| # | O que fazer | O que deve acontecer | OK? |
|---|---|---|---|
| 33 | Cadastrar gestor com código inválido | Recusa | [ ] |
| 34 | Cadastrar gestor com o código de `ILUMINACAO` | Cadastra, e "Meus dados" mostra o órgão | [ ] |
| 35 | Criar denúncias de iluminação, lixo e vias com cidadãos | Criadas | [ ] |
| 36 | Entrar como gestor de iluminação | Lista e painel só com iluminação, e os números batem | [ ] |
| 37 | Entrar como gestor geral | Vê todas, e o painel soma tudo | [ ] |
| 38 | Como gestor de iluminação, mudar o status de denúncia de outra categoria (pela API: `PATCH /demands/gestor/{id}/status`) | 404 e nada muda | [ ] |
| 39 | Marcar uma denúncia como Resolvida e voltar para Aberta | Funciona nos dois sentidos | [ ] |

### Privacidade entre cidadãos (pela API)

| # | O que fazer | O que deve acontecer | OK? |
|---|---|---|---|
| 40 | Com o token do cidadão B, `GET /demands/feed` | Denúncias do A sem `email_solicitante` e sem `cidadao_id`, com coordenadas de 3 casas | [ ] |
| 41 | Com o token do B, `GET /demands/{id de uma denúncia do A}` | 404 | [ ] |
| 42 | Token de cidadão em `GET /demands/gestor` | 403 | [ ] |

### Infraestrutura (para quem faz o deploy)

| # | O que conferir | O que deve acontecer | OK? |
|---|---|---|---|
| 43 | Subir um serviço sem `JWT_SECRET` | Não sobe e avisa o motivo | [ ] |
| 44 | Conectar no Redis sem senha | Recusa (NOAUTH) | [ ] |
| 45 | No compose de produção, entrar no banco com `auth_svc`, `demand_svc` e `metrics_svc` | Cada um só vê o próprio schema, e o `metrics_svc` só lê | [ ] |
| 46 | Em produção, sem `GESTOR_ACCESS_CODES`, cadastrar gestor | Recusa (403) | [ ] |
| 47 | Mais de 100 chamadas em `/auth` em 15 minutos pelo mesmo IP | O gateway passa a responder 429 | [ ] |

### Verificação em duas etapas (gestor)

Para o primeiro teste, deixar `MFA_OBRIGATORIO_GESTOR=false`. Precisa de um app autenticador no celular (Google Authenticator, Microsoft Authenticator ou similar).

| # | O que fazer | O que deve acontecer | OK? |
|---|---|---|---|
| M1 | Como gestor, abrir "Meus dados" | Aparece o cartão "Verificação em duas etapas" com o botão "Ativar" (cidadão não vê o cartão) | [ ] |
| M2 | Tocar em "Ativar" | Mostra uma chave em grupos de 4 letras e o botão "Abrir no autenticador" | [ ] |
| M3 | Tocar em "Abrir no autenticador" (ou digitar a chave no app) | O app autenticador adiciona a conta "RESOLVE" | [ ] |
| M4 | Informar um código errado | Recusa | [ ] |
| M5 | Informar o código de 6 números do app | Ativa e mostra 8 códigos de recuperação, com o botão de compartilhar | [ ] |
| M6 | Sair e entrar de novo com e-mail e senha | Pede o código antes de abrir o painel | [ ] |
| M7 | Digitar o código do app | Entra no painel do gestor | [ ] |
| M8 | Sair, entrar de novo e tentar o mesmo código que acabou de usar | Recusa (cada código vale uma vez); esperar o próximo código do app resolve | [ ] |
| M9 | Entrar usando um código de recuperação (xxxxx-xxxxx) | Entra; usar o mesmo código de novo é recusado | [ ] |
| M10 | Errar o código 3 vezes seguidas | Bloqueia por 15 minutos, mesmo com um código certo depois | [ ] |
| M11 | Em "Meus dados", desativar informando a senha e um código | Desativa, volta para o login, e o login passa a ser só com a senha | [ ] |
| M12 | Com `MFA_OBRIGATORIO_GESTOR=true`, entrar como gestor que nunca ativou | O app leva direto para a configuração; só abre o painel depois de ativar e ver os códigos | [ ] |
| M13 | Com a MFA obrigatória ligada, entrar como cidadão | Entra normalmente, sem pedir código | [ ] |

### Consultas úteis para revisar os registros (item 1.7 e procedimento de incidentes)

```sql
-- tentativas de login que falharam ou foram bloqueadas nas últimas 24h, por IP
SELECT ip, tipo, count(*) FROM auth.eventos_auth
WHERE tipo IN ('LOGIN_FALHA', 'LOGIN_BLOQUEADO') AND criado_em > now() - interval '24 hours'
GROUP BY ip, tipo ORDER BY count(*) DESC;

-- histórico de uma conta
SELECT criado_em, tipo, ip FROM auth.eventos_auth WHERE usuario_id = 123 ORDER BY criado_em DESC;

-- trocas e redefinições de senha na última semana
SELECT criado_em, usuario_id, tipo FROM auth.eventos_auth
WHERE tipo IN ('SENHA_ALTERADA', 'SENHA_REDEFINIDA') AND criado_em > now() - interval '7 days';
```

### Resultado dos testes automáticos

auth 146, demand 322, metrics 14 e app 18 testes passando. Os serviços também foram executados juntos (gateway, auth, demand, metrics, Postgres e Redis com senha) em dois roteiros pelo gateway, todos passando: 45 verificações gerais e 26 de MFA.
