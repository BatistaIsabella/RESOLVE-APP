# Segurança e LGPD: roteiro de testes

Oi! Terminei a parte de segurança e LGPD dos Entregáveis 1, 2 e 3 no app e no backend. Está na branch `feat/seguranca-lgpd`, ainda sem subir para a `main`. Você consegue testar antes de eu abrir o PR? Preciso principalmente de olhos no app, porque as telas novas eu só consegui conferir por tipagem, lint e geração do bundle, **não abri em celular**.

O que mudou, item por item, está em [IMPLEMENTACAO.md](IMPLEMENTACAO.md). Aqui está só o que precisa ser testado e o que deve acontecer.

## Como preparar o ambiente

1. Subir o backend (`backend/`, `docker compose up -d --build`). Em desenvolvimento o Redis agora tem senha, e o `docker-compose.yml` já traz um valor padrão.
2. Para testar gestores por órgão, definir no `.env` do backend, por exemplo:
   `GESTOR_ACCESS_CODES=GERAL=geral-123;ILUMINACAO=luz-123;OBRAS_E_SANEAMENTO=obras-123`
3. Para o bloqueio de login não demorar 15 minutos nos testes, dá para usar `LOGIN_BLOQUEIO_MINUTOS=1`.
4. Sem SMTP configurado, o e-mail de redefinição de senha não sai. Em desenvolvimento o link aparece no log do auth-service (`docker compose logs auth-service`). Se quiser testar o e-mail de verdade, preencher `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` e `SMTP_FROM`.
5. Rodar o app (`cd frontend/mobile && npm install && npm start`) apontando `EXPO_PUBLIC_API_GATEWAY_URL` para o gateway.

Se alguma coisa não bater, anota o passo, o que apareceu na tela e, se der, o print.

## 1. Cadastro e senha

| # | O que fazer | O que deve acontecer | OK? |
|---|---|---|---|
| 1.1 | Abrir o cadastro e digitar uma senha aos poucos | A lista abaixo do campo vai marcando cada requisito (12 caracteres, maiúscula, minúscula, número, símbolo) | [ ] |
| 1.2 | Tentar cadastrar com `senha123` | Mensagem dizendo o que falta, sem criar a conta | [ ] |
| 1.3 | Tentar uma senha que cumpre as regras mas é comum (ex.: `Senha@123456`) | O servidor recusa dizendo que a senha é muito comum | [ ] |
| 1.4 | Tentar uma senha que contém o seu nome | O servidor recusa | [ ] |
| 1.5 | Preencher tudo certo, mas sem marcar o aceite | Mensagem pedindo para aceitar a Política e os Termos | [ ] |
| 1.6 | Tocar no link da política no cadastro | Abre a tela com a Política de Privacidade e os Termos de Uso, e dá para voltar | [ ] |
| 1.7 | Marcar o aceite e criar a conta | Conta criada e login automático | [ ] |
| 1.8 | Cadastrar de novo o mesmo e-mail, trocando maiúsculas e minúsculas | Recusa informando que o e-mail já existe | [ ] |

## 2. Login, bloqueio e sessão

| # | O que fazer | O que deve acontecer | OK? |
|---|---|---|---|
| 2.1 | Entrar com senha errada, com e-mail que existe e com e-mail que não existe | A mensagem é a mesma nos dois casos ("Credenciais inválidas" ou equivalente) | [ ] |
| 2.2 | Errar a senha 3 vezes seguidas e tentar uma 4ª vez, agora com a senha certa | A 4ª tentativa é bloqueada com mensagem de "muitas tentativas" | [ ] |
| 2.3 | Esperar o fim do bloqueio e entrar | Entra normalmente | [ ] |
| 2.4 | Errar 2 vezes, acertar, errar mais 2 | Não bloqueia (o acerto zera a contagem) | [ ] |
| 2.5 | Fazer login, fechar o app por completo e abrir de novo (com "Mantenha-me conectado") | Continua logado | [ ] |
| 2.6 | Tocar em "Sair" e abrir o app | Volta para a tela inicial, sem sessão | [ ] |

## 3. Esqueci minha senha

| # | O que fazer | O que deve acontecer | OK? |
|---|---|---|---|
| 3.1 | No login, tocar em "Esqueci minha senha" e informar um e-mail cadastrado | Mensagem genérica de que, se o e-mail existir, as instruções serão enviadas | [ ] |
| 3.2 | Repetir com um e-mail que não existe | Exatamente a mesma mensagem | [ ] |
| 3.3 | Pegar o código (no e-mail ou no log) e usar em "Redefinir senha" com uma senha forte | Senha trocada, e o login com a senha nova funciona | [ ] |
| 3.4 | Tentar redefinir com uma senha fraca | Recusa explicando o motivo, e o código continua valendo | [ ] |
| 3.5 | Usar o mesmo código uma segunda vez | Recusa ("inválido ou expirado") | [ ] |
| 3.6 | Pedir o código e esperar mais de 30 minutos (ou usar `TOKEN_REDEFINICAO_MINUTOS=1`) | Código expirado é recusado | [ ] |
| 3.7 | Bloquear uma conta com 3 senhas erradas e depois redefinir a senha | O login volta a funcionar logo após a redefinição | [ ] |

## 4. Termos de uso (contas antigas e nova versão)

| # | O que fazer | O que deve acontecer | OK? |
|---|---|---|---|
| 4.1 | Entrar com uma conta criada antes desta versão (que nunca aceitou os termos) | O app mostra a tela "Privacidade e termos" antes de liberar as telas | [ ] |
| 4.2 | Tocar em "Li e aceito" | Entra na tela normal, e não pergunta de novo no próximo login | [ ] |
| 4.3 | Tocar em "Sair" nessa tela | Volta para a tela inicial, sem sessão | [ ] |

## 5. Meus dados (toque no nome no topo da lista de denúncias ou do painel do gestor)

| # | O que fazer | O que deve acontecer | OK? |
|---|---|---|---|
| 5.1 | Abrir a tela | Mostra nome, e-mail, tipo de conta (e órgão, se for gestor) | [ ] |
| 5.2 | Mudar o nome e salvar | Salva; o nome novo aparece no topo das telas | [ ] |
| 5.3 | Mudar o e-mail e salvar, depois sair e entrar com o e-mail novo | Funciona; com um e-mail que já existe em outra conta, recusa | [ ] |
| 5.4 | Trocar a senha informando a senha atual errada | Recusa | [ ] |
| 5.5 | Trocar a senha corretamente, estando logado em dois aparelhos/emuladores | Este continua logado; no outro, a próxima ação pede login de novo | [ ] |
| 5.6 | Tocar em "Exportar meus dados" | Abre a folha de compartilhamento com um JSON com os dados da conta e das denúncias (fotos só contadas) | [ ] |
| 5.7 | Tocar em "Ler Política de Privacidade e Termos de Uso" | Abre a tela de leitura | [ ] |
| 5.8 | Criar uma conta de teste com uma denúncia com foto e excluir a conta (pede a senha) | Volta para a tela inicial; o login com essa conta deixa de funcionar | [ ] |
| 5.9 | Depois disso, entrar como gestor e abrir aquela denúncia | A denúncia continua lá, sem e-mail de solicitante e sem foto | [ ] |

## 6. Gestor por órgão

| # | O que fazer | O que deve acontecer | OK? |
|---|---|---|---|
| 6.1 | Cadastrar um gestor com um código inválido | Recusa ("código de acesso inválido") | [ ] |
| 6.2 | Cadastrar um gestor com o código de `ILUMINACAO` | Cadastra; na tela "Meus dados" aparece o órgão | [ ] |
| 6.3 | Com cidadãos, criar denúncias de iluminação, de lixo e de vias | As denúncias são criadas | [ ] |
| 6.4 | Entrar como gestor de iluminação | A lista e o painel mostram só denúncias de iluminação, e os números do painel batem com isso | [ ] |
| 6.5 | Entrar como gestor geral | Vê todas as categorias, e os números do painel somam tudo | [ ] |
| 6.6 | Como gestor de iluminação, tentar mudar o status de uma denúncia de outra categoria (pela API, se quiser: `PATCH /demands/gestor/{id}/status`) | Responde 404 e nada muda | [ ] |
| 6.7 | Mudar o status de uma denúncia para "Resolvida" e depois voltar para "Aberta" | Funciona nas duas direções | [ ] |

## 7. Privacidade entre cidadãos (pela API)

| # | O que fazer | O que deve acontecer | OK? |
|---|---|---|---|
| 7.1 | Com o token do cidadão B, chamar `GET /demands/feed` | As denúncias do cidadão A aparecem sem `email_solicitante` e sem `cidadao_id`, com coordenadas de 3 casas | [ ] |
| 7.2 | Com o token do cidadão B, chamar `GET /demands/{id da denúncia do A}` | 404 | [ ] |
| 7.3 | Chamar `GET /demands/gestor` com o token de um cidadão | 403 | [ ] |

## 8. Infraestrutura (para quem faz o deploy)

| # | O que conferir | O que deve acontecer | OK? |
|---|---|---|---|
| 8.1 | Subir um serviço sem `JWT_SECRET` | O serviço não sobe e avisa o motivo | [ ] |
| 8.2 | Tentar conectar no Redis sem senha | Recusa (NOAUTH) | [ ] |
| 8.3 | No `docker-compose.prod.yml`, entrar no banco com cada usuário (`auth_svc`, `demand_svc`, `metrics_svc`) | Cada um só enxerga o próprio schema, e o `metrics_svc` só consegue ler | [ ] |
| 8.4 | Em produção, sem `GESTOR_ACCESS_CODES`, cadastrar um gestor | Recusa (403) | [ ] |
| 8.5 | Mais de 100 chamadas em `/auth` em 15 minutos pelo mesmo IP | O gateway começa a responder 429 | [ ] |

## O que eu já testei

- Testes automáticos: auth 115, demand 322, metrics 14 e app 12, todos passando.
- Um roteiro de 45 verificações com os serviços rodando juntos (gateway, auth, demand, metrics, Postgres e um Redis com senha): cadastro, senha, bloqueio, órgão, feed, troca e recuperação de senha, exportação e exclusão da conta.
- App: tipagem, lint e geração do bundle Android.

## O que eu não consegui testar (por favor, olhem com mais atenção)

- As telas novas em celular ou emulador (cadastro, esqueci/redefinir senha, termos, Meus dados). Principalmente o visual e o compartilhamento do JSON.
- O envio de e-mail real (SMTP).
- O deploy no Render e no Docker de produção. O script dos usuários de banco foi testado em um Postgres local nos dois cenários (banco novo e banco existente), mas não no servidor de vocês.
- O comportamento com o Redis fora do ar em produção. A ideia é o sistema continuar funcionando e só deixar de encerrar as sessões antigas.

## O que ficou de fora

- Criptografia de coluna e KMS (o e-mail é a chave de busca do login), MFA para gestores e criptografia das fotos: a documentação trata os dois últimos como melhorias futuras.
- RIPD, procedimento escrito de resposta a incidentes e termo de cooperação com o órgão: são documentos, não código.
- Os textos da Política de Privacidade e dos Termos de Uso são um rascunho meu, e precisam de revisão antes de ir para produção.
- O cadastro ainda diz "E-mail já cadastrado", o que permite descobrir se um e-mail existe.
- Alguns trechos dos documentos dos entregáveis não batem com o que o projeto tem (por exemplo, AsyncStorage e geolocalização em coluna própria). Estão listados na seção 5 do IMPLEMENTACAO.md.

Obrigado por testar! Qualquer coisa estranha, me chama.
