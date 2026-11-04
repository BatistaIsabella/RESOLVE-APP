# Métricas de Qualidade — seleção e justificativas

Este documento registra quais métricas o pipeline monitora, por que foram
escolhidas e por que outras foram descartadas. A coleta é automática: o script
[`generate_quality_reports.py`](../../.github/scripts/generate_quality_reports.py)
lê os XMLs JUnit e o resumo de cobertura a cada execução do workflow
[`regressao.yml`](../../.github/workflows/regressao.yml) e grava
`quality-reports/metrics.json`, `technical-report.html` e `business-report.html`.

## Contexto e objetivos

O RESOLVE é um sistema de demandas urbanas com serviços de autenticação e
demandas, front-end web e app mobile. A equipe é pequena, os testes são
automatizados em quatro camadas (unitário, API, E2E web e unitário mobile) e há
funcionalidades ainda pendentes. Os objetivos do monitoramento são:

1. **Detectar regressões cedo**, a cada push e pull request.
2. **Dar visibilidade ao risco** para quem não lê código (gestão e professores).
3. **Evitar falsa sensação de qualidade**, deixando claro o que não é testado.

## Métricas selecionadas

| Métrica | Como é calculada | Objetivo atendido | Por que foi escolhida |
|---|---|---|---|
| Testes aprovados / falhos / ignorados | Contagem de `testcase` no JUnit, por suite | 1 | Resposta direta e objetiva sobre o estado do produto; base para as demais métricas. |
| Taxa de sucesso | `passed / (passed + failed)`; ignorados ficam fora do denominador | 1 e 2 | Indicador único e comparável entre suites. Excluir ignorados evita inflar ou reduzir a taxa por testes `fixme`. |
| Duração da execução | `time` do JUnit (soma dos casos quando ausente) | 1 | Um pipeline lento deixa de ser usado; permite perceber degradação do tempo de feedback. |
| Cobertura de código (statements, branches, functions, linhas) | `coverage-summary.json` do Vitest (demand-service) | 3 | Mostra quanto do código instrumentado é exercitado. O relatório declara que o escopo é parcial. |
| Execução por camada | Estado de cada suite: aprovada, com falhas, não executada ou sem resultado | 2 e 3 | Distingue "passou" de "nem rodou" (ex.: E2E não roda em push), evitando falso positivo. |
| Veredito de qualidade (semáforo) | Regras abaixo, calculadas pelo script | 2 | Traduz as métricas técnicas em uma conclusão para stakeholders. |
| Pendências conhecidas | Lista em `.github/quality-context.json` (C3, C5, C6, C9, C10) | 2 e 3 | Testes `test.fail()` e `test.fixme()` não reprovam o pipeline; sem esta lista pareceriam entregas concluídas. |

### Regras do veredito

| Cor | Condição | Mensagem |
|---|---|---|
| Vermelho | Qualquer suite com falha ou erro de execução | Não recomendado para release |
| Amarelo | Sem falhas, mas com suite não executada, sem relatório legível ou cobertura de linhas abaixo de 80% (ou indisponível) | Aprovado com ressalvas |
| Verde | Todas as suites passaram, todas foram executadas e a cobertura atinge a meta | Apto para release |
| Cinza | Nenhuma suite executada | Sem dados suficientes |

A meta de 80% de cobertura de linhas é um valor de referência comum da
disciplina e pode ser ajustada em `COVERAGE_TARGET` no script. Em push, o E2E não
roda, então o veredito máximo é amarelo; isso é intencional, porque a verificação
de ponta a ponta não aconteceu.

## Métricas descartadas

| Métrica | Motivo da exclusão | Quando reconsiderar |
|---|---|---|
| Densidade de defeitos (defeitos por KLOC) | Não há fonte de defeitos ligada ao tamanho do código; os bugs ficam em `RELATORIO_BUGS.md` sem vínculo com módulos ou commits. | Quando os bugs forem registrados como issues com rótulo de módulo. |
| Cobertura global do sistema | Só o `demand-service` tem instrumentação. Um número "global" seria enganoso. | Ao instrumentar `auth-service`, front-end web e mobile. |
| Taxa de testes instáveis (flakiness) | Exige várias execuções do mesmo commit e retentativas; o Playwright não repete testes no CI atual. | Se `retries` for habilitado ou o histórico de execuções for guardado. |
| Tendência histórica entre execuções | Os artefatos duram 14 dias e não há armazenamento do histórico. A equipe não tem um repositório de métricas. | Ao publicar `metrics.json` em uma branch dedicada ou GitHub Pages. |
| Tempo médio para corrigir falha (MTTR) | Depende de histórico de issues abertas e fechadas, ainda sem volume suficiente. | Depois de várias issues `ci-failure` fechadas. |
| Complexidade ciclomática e dívida técnica | Medem manutenibilidade do código, não o resultado dos testes, que é o foco deste pipeline. | Se a equipe adotar ferramenta de análise estática. |
| Cobertura de requisitos (cenários do backlog automatizados) | Hoje o alinhamento é manual, na tabela de `PIPELINE_CI_QUALITY_GATE.md`. Automatizar exige ligar cada teste a um ID de requisito. | Ao marcar testes com tags de requisito. |

## Atualização das métricas

As métricas são recalculadas em todo push, pull request para `main`, execução
diária e execução manual, sem intervenção. A etapa roda com `if: always()`, então
os relatórios também são gerados quando há falhas. Os resultados ficam no artefato
`evidencias-testes-<run_id>`.

## Limitações conhecidas

- Cada relatório mostra apenas a execução atual, sem comparação com a anterior.
- A cobertura vale só para os arquivos listados em `vitest.unit.config.ts`.
- Pendências e riscos são mantidos à mão em `quality-context.json` e precisam ser
  atualizados quando um cenário deixar de ser falha esperada.
