# Pipeline de CI e Quality Gate

## Política de execução

O workflow [`../../.github/workflows/regressao.yml`](../../.github/workflows/regressao.yml)
tem um único job obrigatório, `Quality Gate`. As suites são executadas em
sequência e os resultados são reunidos no resumo do GitHub Actions.

Os unitários mobile usam apenas Node.js e rodam antes de qualquer instalação
de pacotes. Em seguida, o pipeline instala os pacotes do `demand-service`
necessários ao executor Vitest e aos módulos importados e roda os unitários
backend com mocks de Prisma e Redis, sem o setup de integração. PostgreSQL,
Redis, preparação de tabelas, instalação do `auth-service` e checkout e
preparação do sistema E2E só acontecem depois dos unitários.
Na configuração unitária, `JWT_SECRET` usa o mesmo valor dos tokens de teste,
independentemente do segredo configurado para a integração no CI.

| Evento | Suites executadas |
|---|---|
| Push em qualquer branch | Testes unitários do `demand-service`, testes unitários mobile e testes de API de `auth-service` e `demand-service` |
| Pull request para `main` | As mesmas suites de unitários e API, seguidas pelos smoke E2E dos cenários C1 e C2 |
| Diário (`30 4 * * *` UTC) | Unitários, API e todos os testes E2E; o horário planejado é 01:30 em Recife (UTC-3), sujeito à política best-effort do GitHub |
| Execução manual | Regressão completa, igual à execução diária |

As etapas de teste não interrompem as etapas seguintes quando uma suite falha.
Ao final, uma etapa de validação reprova o job se qualquer suite executada
falhou. Assim, a regressão diária produz evidências das demais suites sem
deixar uma execução com falhas terminar como aprovada. Falhas de instalação
ou de infraestrutura também reprovam o job.

## Métricas e relatórios

Em toda execução, inclusive quando testes falham, o workflow tenta gerar
`quality-reports/metrics.json`, `technical-report.html` e
`business-report.html` antes de publicar os artefatos. XML JUnit é produzido
pelas suites mobile, backend e E2E; a cobertura é coletada somente para os
arquivos instrumentados pelo `vitest.unit.config.ts` do `demand-service`.
Relatórios e evidências são publicados por 14 dias. Suites que não fazem parte
do evento (por exemplo, E2E em um push) aparecem como não executadas, não como
aprovadas.

As métricas automáticas são taxa de sucesso por suite, contagens de testes
aprovados/falhos/ignorados, duração e cobertura instrumentada. A taxa de
sucesso é `passed / (passed + failed)`; casos ignorados não entram no
denominador e a taxa fica indisponível quando não há testes executados. A
cobertura não representa o sistema inteiro: seu escopo atual é o conjunto de
utilitários, serviços e middlewares listado na configuração unitária do
`demand-service`.

Não medimos densidade de defeitos por linha de código porque o repositório não
mantém uma fonte de defeitos vinculada ao tamanho do código, nem cobertura
global porque não há instrumentação de todas as camadas. Riscos e lacunas de
automação são informações complementares, mantidas em
`.github/quality-context.json`, e exibidas no relatório de negócio; não são
tratadas como métricas calculadas pelo pipeline.

O relatório técnico detalha resultados e erros por caso de teste. O relatório
de negócio consolida os resultados e a cobertura disponível, explicita suites
não executadas e lista os riscos complementares. Issues são abertas somente
quando uma etapa de testes reporta falha; erros de instalação ou infraestrutura
continuam reprovando o job, mas não são classificados como falha de teste. A
criação de issue pode ser restringida pelo GitHub em pull requests originados
de forks, embora o check e a publicação dos relatórios continuem disponíveis.
O repositório ou a organização também precisa permitir que o `GITHUB_TOKEN`
receba `issues: write`; se essa permissão for bloqueada, a etapa de issue não
interrompe a publicação dos relatórios nem altera a reprovação do Quality Gate.

## Alinhamento entre backlog e execução

| Camada | Implementação encontrada | Push | Pull request | Diário/manual |
|---|---|---:|---:|---:|
| Unitários backend | `demand-service/src/tests/unit/UT01` a `UT11` | Sim | Sim | Sim |
| Unitários mobile | `frontend/mobile/utils/__tests__/extractBairro.test.mjs` (7 casos) | Sim | Sim | Sim |
| API auth | `auth-service/src/tests/TS01`, `TS03`, `TS07` e `TS09` | Sim | Sim | Sim |
| API demand | `demand-service/src/tests/TS02`, TS02 BDD, `TS04` a `TS06`, `TS08` e `TS09` | Sim | Sim | Sim |
| E2E web | 11 arquivos C1–C11 em `e2e/tests/` | Não | C1 e C2 (smoke) | Todos |
| E2E mobile nativo | Planejado no plano de QA, sem suite automatizada encontrada | Não | Não | Não |

As suites Vitest completas executam todos os arquivos de API de cada serviço,
incluindo a versão BDD do TS02. Os 11 cenários web do backlog têm arquivos
correspondentes na pasta E2E. Os smoke tests C1 e C2 verificam o caminho de
criação de demanda e a validação de campos obrigatórios, respectivamente.

### Pendências conhecidas do backlog

Ter um arquivo de teste não significa que a funcionalidade esteja concluída.
O backlog E2E documenta cenários ainda pendentes ou marcados como falha
esperada:

- C3: busca por palavra-chave (`test.fail()`).
- C5: paginação ainda não disponível (`test.fixme()`).
- C6: histórico da demanda ainda não disponível (`test.fail()`).
- C9: indicadores por status pendentes (`test.fail()`); há também um teste
  marcado `test.fixme()` por instabilidade do painel.
- C10: recarga do painel por gestor marcada como falha esperada para o BUG-04.

O Playwright reporta `test.fixme()` como ignorado e considera `test.fail()`
uma falha esperada quando o teste realmente falha. Portanto, esses estados não
reprovam o Quality Gate. Devem continuar visíveis no relatório e no backlog;
não devem ser apresentados como funcionalidades aprovadas.

O plano de QA também prevê automação mobile nativa, mas não foi encontrado
teste Appium/Detox no repositório. A regressão executa os testes unitários
mobile existentes, não testes de interface em dispositivo/emulador.

## Ativar a proteção de `main` no GitHub

O workflow executa as verificações de CI, mas não consegue proteger a branch
por si só: a regra é uma configuração do repositório GitHub e requer permissão
de administrador. Após a primeira execução do workflow:

1. Abra **Settings → Rules → Rulesets** no repositório
   `BatistaIsabella/RESOLVE-APP` e crie um ruleset para branches.
2. Selecione `main` como branch alvo e deixe o ruleset ativo.
3. Habilite **Require a pull request before merging**.
4. Habilite **Require status checks to pass** e selecione o check **Quality
   Gate**.
5. Não permita bypass da regra para a branch principal; mantenha bloqueados
   force pushes e exclusão da branch.

Se a interface estiver usando regras clássicas, configure o equivalente em
**Settings → Branches → Branch protection rules**. A regra deve exigir pull
request e o check `Quality Gate` antes do merge.

## Evidências para apresentação

- Em **Actions → Pipeline de Qualidade**, abrir uma execução e mostrar o
  resumo das suites, os resultados por camada e o artefato
  `evidencias-testes-<run_id>`.
- Para demonstrar o bloqueio, usar uma branch de teste e um pull request
  temporário com uma falha controlada em uma asserção de teste. Registrar o
  check `Quality Gate` reprovado e o merge bloqueado pela regra de `main`;
  depois fechar o pull request e remover a alteração experimental.
- Para demonstrar a execução diária, apresentar a execução com evento
  `schedule`. O agendamento é best-effort; se ainda não tiver ocorrido, usar
  `workflow_dispatch` para evidenciar a regressão completa e explicar a
  diferença do evento.
