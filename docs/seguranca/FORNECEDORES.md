# Registro e avaliação de fornecedores

Entregável 6 – Gestão de fornecedores (itens 6.1, 6.2 e 6.8). Este arquivo é o registro de cada fornecedor, com os dados que recebe, o país onde os guarda e o resultado da avaliação pelos critérios do item 6.2. Deve ser refletido no mapeamento do item 3.1 e na Política de Privacidade do item 3.5 do Entregável 3.

Legenda da avaliação: **Sim**, **Não**, **A confirmar** (verificar no painel ou na documentação do fornecedor e atualizar a linha). Nenhuma linha foi preenchida sem verificação: o que não foi conferido fica como "A confirmar".

## Inventário

| Fornecedor | Uso | Criticidade | Dados que recebe | País dos dados |
|---|---|---|---|---|
| Render | Aplicação, banco PostgreSQL e Redis | Alta | Usuários e ocorrências (banco), chaves e segredos (variáveis de ambiente) | Estados Unidos (Oregon, confirmado no painel) |
| GitHub | Código e Actions | Alta | Código, secrets, execução do backup | A confirmar |
| Bucket externo do backup | Backup do banco | Alta | Dump cifrado do banco | A confirmar |
| Expo | Atualizações e notificações | Alta | Tokens de notificação e conteúdo das notificações | A confirmar |
| Provedor de e-mail (SMTP) | Token de recuperação de senha | Média | E-mail do usuário | A confirmar |
| Google (Gmail) | Solicitações de titulares | Média | Dados enviados pelos titulares | A confirmar |
| MongoDB Atlas | Análise | Média | Ocorrências pseudonimizadas | A confirmar |
| Neon | Análise | Média | Ocorrências pseudonimizadas | A confirmar |
| UptimeRobot | Monitoramento | Baixa | Apenas rotas da API | A confirmar |
| Prefect | Orquestração da pipeline | Baixa | Apenas rotas da API | A confirmar |

## Avaliação pelos critérios do item 6.2

| Fornecedor | Criptografia (trânsito e repouso) | MFA nas contas | ISO 27001 ou SOC 2 | DPA | Exportação em formato padrão |
|---|---|---|---|---|---|
| Render | A confirmar | A confirmar | A confirmar | A confirmar | Sim (PostgreSQL, `pg_dump`) |
| GitHub | A confirmar | A confirmar | A confirmar | A confirmar | Sim (git) |
| Bucket externo do backup | A confirmar | A confirmar | A confirmar | A confirmar | Sim (objetos S3) |
| Expo | A confirmar | A confirmar | A confirmar | A confirmar | A confirmar |
| Provedor de e-mail (SMTP) | A confirmar | A confirmar | A confirmar | A confirmar | Não se aplica |
| Google (Gmail) | A confirmar | A confirmar | A confirmar | A confirmar | A confirmar |
| MongoDB Atlas | A confirmar | A confirmar | A confirmar | A confirmar | A confirmar |
| Neon | A confirmar | A confirmar | A confirmar | A confirmar | Sim (PostgreSQL) |
| UptimeRobot | A confirmar | A confirmar | A confirmar | A confirmar | Não se aplica |
| Prefect | A confirmar | A confirmar | A confirmar | A confirmar | Não se aplica |

## Acesso (item 6.4)

| Fornecedor | Responsável pela conta | MFA ativo | Última revisão de acessos | Última troca de segredos |
|---|---|---|---|---|
| (preencher para cada fornecedor) | | | | |

## Dependências de software (item 6.6)

- Node.js: versões travadas em `package-lock.json` e instaladas com `npm ci` (CI e Dockerfiles).
- Imagens Docker com tag de versão exata (`node`, `redis`, `postgres`, `cloudflared`).
- `npm audit` no Quality Gate (`.github/workflows/regressao.yml`) e Dependabot (`.github/dependabot.yml`).
- Python (pipeline Prefect): este repositório não contém a pipeline nem arquivo de requisitos. No repositório onde ela estiver, fixar as versões em `requirements.txt` com `==`.
- Pendência: o app mobile (`frontend/mobile`) ainda tem vulnerabilidades altas na cadeia de ferramentas do Expo, que dependem de atualizar o SDK. Ele não faz parte do `npm audit` do Quality Gate por esse motivo.
