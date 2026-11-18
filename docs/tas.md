# Política de Manutenção da TAS (Test Automation Solution) — RESOLVE

| | |
|---|---|
| **Versão** | 1.0 |
| **Data** | 2026-11-18 |
| **Escopo** | Toda a automação de testes do RESOLVE (definida na seção 0) |
| **Acompanhamento** | Issue #48, "Relatório de qualidade, métricas e manutenção da suíte de testes" |
| **Revisão da política** | A cada revisão quinzenal da TAS (seção 4) |

Este documento é a política oficial de manutenção da automação de testes. Ele responde aos cinco pontos da atividade:

1. [Tratamento e classificação de falhas](#1-tratamento-e-classificação-de-falhas)
2. [Prioridades, responsáveis e prazos](#2-prioridades-responsáveis-e-prazos)
3. [Gestão de testes instáveis](#3-gestão-de-testes-instáveis)
4. [Revisão periódica](#4-revisão-periódica)
5. [Critérios e processo de remoção de testes](#5-critérios-e-processo-de-remoção-de-testes)

As seções 6 a 9 tratam do registro no GitHub, das exceções vigentes, do caso demonstrativo (BUG-04) e da vigência. Cada decisão traz a justificativa no contexto real do RESOLVE.

---

## 0. Objetivo, escopo e princípios

**SUT** (sistema sob teste): o RESOLVE, isto é, o frontend web, o app mobile e os serviços `auth-service`, `demand-service`, `metrics-service` e `api-gateway`.

**TAS**: tudo o que executa e relata testes.

- Testes unitários do mobile e do `demand-service`, e testes de API do `auth-service` e do `demand-service`.
- Os 11 specs E2E do Playwright (cenários C1 a C11) e o receptor que imita o Expo Push (`e2e/support/expo-push-mock.mjs`).
- O compose de testes (`backend/docker-compose.e2e.yml`).
- O workflow `Pipeline de Qualidade` (Quality Gate) e o gerador de relatórios (`.github/scripts/`).

Documentos relacionados: [`PIPELINE_CI_QUALITY_GATE.md`](testes/PIPELINE_CI_QUALITY_GATE.md), [`METRICAS_QUALIDADE.md`](testes/METRICAS_QUALIDADE.md), [`RELATORIO_BUGS.md`](testes/RELATORIO_BUGS.md) e [`SUITE_TESTES_BACKEND.md`](testes/SUITE_TESTES_BACKEND.md).

**Princípios**

1. Uma falha permanece visível até ser classificada. Nada é escondido por reexecução automática nem por marcador.
2. Nenhuma regra do SUT, de segurança, de autenticação, de MFA ou de confirmação de e-mail é enfraquecida para o teste passar.
3. Toda exceção (`test.fail`, `test.fixme`, `test.skip`, espera fixa) tem classe, responsável, prazo e issue.
4. Toda decisão fica registrada com a sua justificativa.

*Justificativa:* o RESOLVE é mantido por uma equipe pequena, com entregas semanais, e já tem um Quality Gate que reprova o job e publica evidências. A política acrescenta o que faltava: classificar, atribuir dono e prazo e revisar de forma regular.

---

## 1. Tratamento e classificação de falhas

### 1.1 Fluxo

1. **Detecção.** O Quality Gate fica vermelho. Se uma suite de testes falhou, o workflow abre uma issue com os rótulos `ci-failure` e `needs-triage` (ou comenta na issue aberta, para não duplicar) e inclui um bloco de triagem.
2. **Triagem.** O responsável define **classe, prioridade, responsável e prazo** (seção 2).
3. **Ação** na camada certa: corrigir o SUT, o spec ou o ambiente, ou registrar a variação esperada.
4. **Revalidação** por nova execução do Quality Gate.
5. **Encerramento** da issue com a evidência da revalidação.

*Justificativa:* o pipeline já faz a detecção e o registro (issue automática com deduplicação). Faltava a classificação, e a issue #59 mostrou o risco: acumulou, num único tópico, falhas de causas diferentes, todas sem classe.

### 1.2 Classes

| Classe | Definição | Sinais típicos |
|---|---|---|
| **SUT** | Defeito ou comportamento inadequado do sistema sob teste | O teste expressa corretamente o requisito e o sistema o viola; o mesmo comportamento é reproduzível manualmente. |
| **TAS** | Problema na automação, spec, seletor, payload, expectativa ou código de suporte | O sistema mudou de forma legítima e o teste ainda espera o comportamento antigo; seletor ou payload errado; premissa incorreta; espera inadequada. |
| **Ambiente** | CI, Docker, CORS, banco, Redis, configuração ou indisponibilidade externa | A falha some ao corrigir configuração, infraestrutura ou serviço externo, sem mudar o SUT nem o spec. |
| **Variação esperada** | Limitação conhecida e explicitamente acompanhada | Funcionalidade ainda inexistente, com teste marcado (`test.fail` ou `test.fixme`), issue, dono e prazo de revisão. |

### 1.3 Como decidir a classe

| Pergunta | Se a resposta for "sim" |
|---|---|
| O requisito está sendo violado e o teste o expressa corretamente? | **SUT** |
| O SUT mudou por decisão legítima (contrato, regra, política) e o teste continua esperando o antigo, ou há erro de seletor, payload, espera ou helper? | **TAS** |
| A falha desaparece mudando CI, Docker, CORS, banco, Redis, variáveis ou um serviço externo? | **Ambiente** |
| É uma limitação já conhecida, com issue e marcador no teste? | **Variação esperada** (um *unexpected pass* indica que ela acabou) |

Se a causa não for conclusiva em 1 dia útil, adota-se a classe mais provável e reclassifica-se na triagem, com o histórico na própria issue.

### 1.4 Exemplos reais do RESOLVE

| # | Sintoma | Classe | Causa e ação | Evidência |
|---|---|---|---|---|
| 1 | Cadastro rejeitado: "É necessário aceitar a Política de Privacidade e os Termos de Uso" nos specs E2E | **TAS** | O backend (LGPD) exige `aceiteTermos` e `versaoTermos`, e 10 dos 11 specs usavam o payload antigo. Os specs foram corrigidos, sem enfraquecer o aceite. | Execução #74; commit `f3b8358` |
| 2 | Login pela tela permanecia em `/login` (specs 01 e 02) | **Ambiente** | O gateway só libera CORS para origens listadas em `CORS_ORIGINS`, vazio por padrão. O compose de E2E libera apenas `http://localhost:3000`. | Execução #76; commit `bd292d3` |
| 3 | `Build frontend` falhou: "Cannot find module 'expo-router'" | **SUT** | O `tsconfig` do frontend web incluía `frontend/mobile`. Correção: `exclude: ["node_modules", "mobile"]`. | Execução #72; commit `7d2f12e` |
| 4 | O pipeline validava o frontend e o backend de outro repositório (`Cecimedeiros/RESOLVE`) | **Ambiente** (configuração do CI) | O E2E passou a subir e testar este repositório. Efeito prático: a correção do BUG-04 ficou 12 dias sem ser exercitada (seção 8). | Commit `f146758` |
| 5 | Spec 09: total, categoria e região em 0 depois de registrar demandas (regressão) | **TAS** | Premissa errada: registrar demanda não invalida o cache de KPIs (TTL de 5 minutos). O teste passou a forçar a renovação com `POST /metrics/refresh`. A invalidação na criação ficou como melhoria de produto (P3). | Execução #79; commit `18cbf1d` |
| 6 | Spec 10: esperava `/logingestor` e recebeu `/telaUsuario` para cidadão autenticado | **TAS** | Expectativa desatualizada: o `AuthGuard` envia quem tem sessão de outro perfil para a tela inicial do próprio perfil. O teste foi atualizado e manteve as garantias de segurança. | Execução #79; commit `5a45653` |
| 7 | Spec 10: "Expected to fail, but passed" no F5 do gestor | **Variação esperada**, que terminou | O defeito do SUT (BUG-04) foi corrigido. O `test.fail()` foi removido. | Seção 8 |
| 8 | Busca (C3), paginação (C5) e histórico (C6) | **Variação esperada** | Funcionalidades inexistentes, marcadas com `test.fail` ou `test.fixme`. Constam na seção 7. | Specs 03, 05 e 06 |

### 1.5 Regras de tratamento

- **Uma issue por causa.** Se uma falha tiver causa diferente das já registradas numa issue, abre-se outra com o modelo "Falha ou manutenção da TAS".
- **Falhas sem teste falhando** (instalação, Docker, health check) reprovam o job, mas o workflow **não** abre issue para elas. Devem ser registradas manualmente com o modelo e classificadas como **Ambiente**.
- **Correção na camada certa:** defeito do SUT, corrige-se o SUT (e mantém-se o teste); spec desatualizado, corrige-se o spec; ambiente, corrige-se a configuração, de preferência no override exclusivo de E2E.
- **Nunca** enfraquecer uma regra do SUT para o teste passar. No exemplo 1, o aceite dos termos foi mantido e o spec foi corrigido.

---

## 2. Prioridades, responsáveis e prazos

### 2.1 Prioridades e prazos

| Prioridade | Quando se aplica | Triagem | Correção |
|---|---|---|---|
| **P1** | Quality Gate bloqueado, regressão do SUT ou ambiente da TAS indisponível | 1 dia útil | até 3 dias úteis |
| **P2** | Teste instável, spec desatualizado ou teste em quarentena | até 3 dias úteis | até 5 dias úteis |
| **P3** | Duplicação, lentidão, refatoração ou melhoria | avaliação na revisão quinzenal | planejamento para o próximo ciclo |

Os prazos contam em dias úteis a partir da abertura da issue ou do primeiro Quality Gate vermelho, o que ocorrer primeiro. A **triagem** está concluída quando classe, prioridade, responsável e prazo estão preenchidos. A prioridade pode ser alterada na triagem ou na revisão, com o motivo registrado.

*Justificativa:* o Quality Gate é o único workflow de verificação do projeto e é a referência para integrar mudanças. Quando ele bloqueia (P1), a equipe inteira para de integrar, então o prazo é curto. Teste instável e spec desatualizado (P2) corroem a confiança sem bloquear, e cabem no ciclo semanal de entregas. Duplicação e lentidão (P3) não afetam o veredito e entram no planejamento.

### 2.2 Campos obrigatórios

Toda demanda de manutenção possui **classe + prioridade + responsável + prazo + evidência + decisão/encaminhamento**. Eles são exigidos pelos modelos de issue em `.github/ISSUE_TEMPLATE/` e aparecem no bloco de triagem da issue automática do Quality Gate.

### 2.3 Responsabilidades por papel

As responsabilidades são definidas por papel, para não dependerem de nomes. Em toda issue, o responsável é **designado explicitamente**.

| Papel | Quem exerce | Responsabilidades |
|---|---|---|
| **Responsável pelo cenário/TAS** | Quem foi designado ao cenário (C1 a C11), identificado no cabeçalho do spec e no quadro de cenários | Corrigir specs, seletores, payloads, expectativas e helpers; manter as exceções do cenário na seção 7; propor quarentena ou remoção. |
| **Responsável pela funcionalidade/SUT** | Dono da área (web, mobile, `auth-service`, `demand-service`, `metrics-service`, gateway) | Corrigir defeitos do SUT; decidir se um comportamento é intencional (como o redirecionamento do `AuthGuard`); responder por melhorias de produto surgidas da manutenção (como a invalidação do cache de KPIs). |
| **Responsável pelo ambiente/CI** | Quem mantém o workflow, o compose de E2E, o receptor do Expo e os relatórios, e acompanha a issue #48 | Corrigir o ambiente; conduzir a revisão quinzenal; designar responsável quando uma issue ficar sem dono. |
| **Responsável designado na issue** | Quem consta em Assignees e no campo "Responsável" | Responde pelo prazo daquela issue. Pode exercer qualquer um dos papéis acima. |

*Justificativa:* os nomes mudam ao longo do semestre, e o papel permanece. Um cenário sem dono é item obrigatório da revisão (seção 4), para que nenhuma falha fique sem responsável.

### 2.4 Prazo vencido

Na revisão quinzenal, ou antes dela, o responsável registra na issue uma nova data com justificativa. Se o item bloquear o Quality Gate, passa a **P1**.

### 2.5 Rótulos

| Rótulo | Uso | Quem aplica | Situação em 2026-11-18 |
|---|---|---|---|
| `ci-failure` | Falha detectada pelo Quality Gate | Workflow | Existe |
| `needs-triage` | Aguardando classe, prioridade, responsável e prazo | Workflow e modelos de issue (retirado na triagem) | Será criado pelo workflow na próxima falha |
| `classe:sut` | Classe SUT | Triagem | **Criar manualmente** |
| `classe:tas` | Classe TAS | Triagem | **Criar manualmente** |
| `classe:ambiente` | Classe Ambiente | Triagem | **Criar manualmente** |
| `classe:variacao-esperada` | Classe Variação esperada | Triagem | **Criar manualmente** |
| `prio:p1` | Prioridade P1 | Triagem | **Criar manualmente** |
| `prio:p2` | Prioridade P2 | Triagem | **Criar manualmente** |
| `prio:p3` | Prioridade P3 | Triagem | **Criar manualmente** |
| `flaky` | Teste instável ou em investigação de instabilidade | Triagem | **Criar manualmente** |

---

## 3. Gestão de testes instáveis

### 3.1 Política de retentativas: `retries: 0`

O Playwright roda com `retries: 0`, no Quality Gate e localmente (`e2e/playwright.config.ts`). A evidência da falha vem do trace da própria execução (`trace: 'retain-on-failure'`).

*Justificativa:*
- Com uma retentativa automática, um teste intermitente falha, passa na segunda tentativa e vira sucesso, **sem rastro**: o JUnit não registra a retentativa e o relatório de qualidade não a mostra. A instabilidade ficaria invisível justamente na regressão diária, que roda sozinha.
- Uma falha deve permanecer visível até ser classificada.
- O `trace: 'on-first-retry'` anterior nunca seria gravado com `retries: 0`, por isso passou a `retain-on-failure`.

**Reexecução para investigação** é permitida, mas deliberada e registrada. Usa-se "Re-run" no GitHub Actions ou `workflow_dispatch`, e a issue registra:
- o link da execução original;
- o link da reexecução;
- o motivo;
- o resultado;
- quem executou.

Uma reexecução verde **não fecha** a falha, nem substitui a classificação, nem torna o teste "estável".

### 3.2 Critério objetivo de teste instável

Um teste é considerado **instável** quando:
- no **mesmo commit** e sem mudança de ambiente, apresenta resultados diferentes em execuções ou reexecuções registradas (passa e falha); **ou**
- falha em **2 ou mais** de **10 execuções consecutivas** da regressão (diária ou manual), sem mudança do SUT ou da TAS relacionada a ele entre elas.

Uma falha isolada **não** classifica o teste como instável. Ela segue o fluxo da seção 1.

*Justificativa:* o critério é mensurável com o que já existe (execuções diárias e manuais, issues e artefatos de 14 dias), sem exigir histórico automático de métricas, que o projeto não mantém (ver `METRICAS_QUALIDADE.md`).

### 3.3 Processo de investigação

1. Abrir a issue com o modelo, o rótulo `flaky` e prioridade **P2**.
2. Reunir evidências: trace, vídeo e captura de tela (artefato `evidencias-testes-<id>`), `stack-e2e.log` e `frontend-e2e.log`.
3. Reexecutar de forma deliberada (até 3 vezes) para confirmar o padrão, registrando cada reexecução (seção 3.1).
4. Classificar a causa:
   - **TAS:** espera inadequada, seletor frágil, dados compartilhados entre testes.
   - **Ambiente:** ordem de subida dos serviços, recurso limitado, cache com prazo de expiração.
   - **SUT:** condição de corrida, como a do BUG-04.
5. Corrigir na camada certa, **sem** esperas fixas e **sem** aumentar timeout de forma arbitrária.
6. Revalidar conforme o critério de saída (seção 3.4).

*Exemplo real:* o teste de indicadores do spec 09 dependia da fase do cron de 5 minutos do cache de KPIs, o que o tornava intermitente por premissa. A correção foi determinística (renovação explícita), e não uma espera maior.

### 3.4 Quarentena

**Quando pode ser usada**
- Teste **instável** com causa ainda não corrigida, depois da triagem.
- **Variação esperada** acompanhada (funcionalidade ausente).

**Quando não pode:** para esconder falha de SUT não acompanhada, para deixar o pipeline verde, ou sem issue.

**Como:** o teste recebe `test.fixme(true, 'quarentena #<issue> até AAAA-MM-DD: <motivo>')` no corpo, a issue usa o modelo "Quarentena ou remoção de teste" (rótulo `flaky`, prioridade P2), e o PR referencia a issue.

**Duração máxima: 10 dias úteis.** Prorrogação única de até 5 dias úteis, aprovada na revisão quinzenal e registrada na issue. Depois disso o teste é corrigido, removido (seção 5) ou a issue passa a **P1**.

*Justificativa:* 10 dias úteis são o dobro do prazo de correção P2 (5 dias úteis) e cabem em uma quinzena, o ciclo de revisão. Uma quarentena aberta além disso vira cobertura permanentemente desligada, o que reduz a cobertura real da suíte.

**Variação esperada (funcionalidade ausente):** não tem o prazo de 10 dias, mas exige issue, responsável e revisão a cada quinzena. Sai quando a funcionalidade for implementada.

**Critério de saída**
- *Teste instável:* causa raiz corrigida e **3 execuções consecutivas da regressão completa** (diária ou manual) sem falha desse teste. Depois disso retira-se o marcador e fecha-se a issue com as evidências.
- *Variação esperada:* funcionalidade implementada. O Playwright acusa *unexpected pass* e o marcador é removido em até **5 dias úteis** (P2), com a documentação atualizada.

*Justificativa das 3 execuções:* a regressão completa é cara (stack Docker, build do frontend e 11 specs), então 3 execuções consecutivas equilibram confiança e custo, usando a execução diária (04:30 UTC) mais as manuais.

### 3.5 Uso de `test.fail`, `test.fixme` e `test.skip`

Eles **não podem ser usados somente para deixar o pipeline verde.**

| Marcador | Uso permitido | Exigências |
|---|---|---|
| `test.fail()` | Defeito de SUT ou funcionalidade ausente conhecidos, em que o teste descreve o comportamento correto | Issue vinculada, responsável, revisão quinzenal. *Unexpected pass* é tratado como P2 (remoção em até 5 dias úteis). |
| `test.fixme()` | Quarentena (seção 3.4) ou funcionalidade ausente em que o teste ainda não pode executar | Issue, prazo e critério de saída. Mensagem com o número da issue. |
| `test.skip()` | Somente condição de ambiente **explícita e descrita** (por exemplo, o spec 09 sem `E2E_EXPO_MOCK_URL`) | No CI, a condição deve estar satisfeita. Nunca para esconder falha. |

### 3.6 Esperas fixas (`waitForTimeout`)

`waitForTimeout` é **proibido em testes novos**. Usa-se condição determinística: `expect`, `expect.poll`, `waitForResponse`, `waitForURL` ou estado observável da interface. Não se troca uma espera fixa por um timeout maior.

Situação em 2026-11-18 (3 ocorrências):
- **Spec 10 (F5 do gestor):** a espera de 3 s foi **substituída** por estado observável. O painel precisa estar visível (só renderiza depois da reidratação e da autorização do `AuthGuard`), a rede precisa ficar ociosa e o teste confere que nenhuma navegação para `/logingestor` aconteceu.
- **Spec 05 (2 ocorrências):** **exceção documentada.** As esperas estão dentro de `test.fixme()`, em testes que não executam porque não existe paginação. Não há estado observável para esperar nem como validar a mudança. Ao implementar a paginação, elas devem ser trocadas por `expect` sobre a lista antes de remover o `test.fixme()`. Cada ocorrência tem um comentário no código com essa exceção.

---

## 4. Revisão periódica

### 4.1 Cadência

**Quinzenal** (a cada 15 dias corridos), em 30 minutos, conduzida pelo responsável pelo ambiente/CI, com os responsáveis pelos cenários e pelo SUT que tiverem pendências. O registro é uma issue "Revisão da TAS — AAAA-MM-DD" com o checklist abaixo.

*Justificativa:* a cadência acompanha o ritmo de entregas, coincide com o prazo máximo de quarentena e casa com a retenção de **14 dias** dos artefatos do Quality Gate: a revisão cobre exatamente a janela de evidências disponível. A regressão diária (`cron: '30 4 * * *'`, UTC) fornece os dados.

### 4.2 Checklist

| Item | Como verificar | Referência | Ação se fora |
|---|---|---|---|
| Testes instáveis | Issues `flaky` abertas e execuções da quinzena (aba Actions), pelo critério da seção 3.2 | Nenhum teste instável sem issue | Abrir issue P2 |
| Duração | Relatório técnico do artefato (duração por suite e por caso) | Limites iniciais: caso individual acima de 30 s e regressão completa acima de 20 min são investigados | Item P3. **Os limites são iniciais e serão recalibrados na primeira revisão com dados.** |
| `test.fail` | Inventário da seção 7 | Todo marcador com issue, responsável e data | Vincular issue ou remover |
| `test.fixme` | Inventário da seção 7 | Quarentena com no máximo 10 dias úteis | Corrigir, remover ou escalar |
| `test.skip` | Inventário da seção 7 | Só condição de ambiente descrita | Remover o skip |
| Esperas fixas | `grep waitForTimeout` | Somente exceções documentadas | Substituir (seção 3.6) |
| Duplicação | Specs que redefinem `criarUsuario`/`criarCidadao`, `logarViaApi`, `SENHA_PADRAO`, `API_BASE_URL` | Em 2026-11-18: 11, 8, 11 e 11 specs | Item P3: módulo compartilhado de helpers |
| Rastreabilidade | Cada cenário C1 a C11 liga-se a spec, requisito (enunciado no cabeçalho) e responsável; IDs UT/TS ligam-se à documentação | Sem cenário órfão nem documento desatualizado | Corrigir os vínculos |
| Cenários sem dono | Quadro de cenários | Nenhum | Designar responsável |
| Issues P1 e P2 abertas | Rótulos `prio:p1` e `prio:p2` | Nenhuma com prazo vencido | Replanejar com justificativa (seção 2.4) |
| Testes removidos ou em quarentena | Seções 3.4, 5 e 7 | Todos com issue e vínculo | Concluir a quarentena ou a remoção |

### 4.3 Saída da revisão

Uma ata na issue da revisão (decisões, novos responsáveis e prazos) e a atualização das seções 7 e 9 deste documento, se houver mudança.

### 4.4 Comandos de inventário

```bash
# Marcadores de exceção e esperas fixas
grep -nE "test\.(fail|fixme|skip|slow)\(" e2e/tests/*.spec.ts
grep -n "waitForTimeout" e2e/tests/*.spec.ts

# Política de retentativas (esperado: retries: 0)
grep -n "retries" e2e/playwright.config.ts

# Duplicação de helpers (quantidade de specs)
for p in "async function criarUsuario|async function criarCidadao" "async function logarViaApi" "SENHA_PADRAO =" "const API_BASE_URL"; do
  echo "$p: $(grep -lE "$p" e2e/tests/*.spec.ts | wc -l) specs"
done
```

---

## 5. Critérios e processo de remoção de testes

### 5.1 Quando um teste pode ser removido

Somente com **justificativa objetiva**:

| Critério | O que comprova |
|---|---|
| Requisito removido | A decisão de produto que retirou o requisito |
| Cenário substituído | O teste que o substitui e que cobre o mesmo requisito |
| Cobertura equivalente comprovada | A comparação entre os testes (mesmas condições e mesmas asserções) |
| Duplicação comprovada | O teste que repete exatamente a mesma verificação |
| Funcionalidade retirada | A remoção da funcionalidade do SUT |

### 5.2 O que **não** justifica a remoção

- Instabilidade: segue a seção 3.
- Lentidão: é item P3 de otimização.
- Falha incômoda de um defeito real do SUT.
- Dificuldade de manutenção ou falta de dono (designa-se um responsável).
- Deixar o pipeline verde.

### 5.3 Processo

1. Abrir uma issue com o modelo "Quarentena ou remoção de teste" (ação "Remover teste"), com **justificativa, responsável, impacto e evidência da cobertura remanescente**.
2. Abrir um PR que remove o teste, referencia a issue e atualiza a documentação afetada (backlog de cenários e as tabelas das seções 7 e 8).
3. Aprovar com revisão de **pessoa diferente do autor** (responsável pelo cenário ou pelo ambiente/CI).
4. O Quality Gate do PR deve estar verde.
5. Registrar o teste removido na seção 8.1.
6. Fechar a issue com o link do PR. A reversão é possível pelo histórico do Git.

*Justificativa:* issue e PR reaproveitam os mecanismos que o projeto já usa, e a revisão por outra pessoa evita remoções unilaterais que reduzam a cobertura sem ninguém perceber.

---

## 6. Registro e acompanhamento no GitHub

| Mecanismo | Uso | Onde |
|---|---|---|
| Issue automática do Quality Gate | Registra falhas de suites de testes, com deduplicação e bloco de triagem | `.github/workflows/regressao.yml`, passo "Abrir issue para falhas reais de testes" |
| Modelo "Falha ou manutenção da TAS" | Falhas e demandas de manutenção | `.github/ISSUE_TEMPLATE/falha-ou-manutencao-tas.yml` |
| Modelo "Quarentena ou remoção de teste" | Quarentena, saída da quarentena e remoção | `.github/ISSUE_TEMPLATE/quarentena-ou-remocao-de-teste.yml` |
| Rótulos | Classe, prioridade e instabilidade | Seção 2.5 |
| PR com `Closes #N` ou `Refs #N` | Vincula a mudança à issue | Pull requests |
| Artefatos e relatórios | Evidência (trace, vídeo, `stack-e2e.log`, relatórios técnico e de negócio) | `evidencias-testes-<id>`, retidos por 14 dias |
| Issue #48 | Acompanhamento desta política | GitHub Issues |

---

## 7. Registro de exceções vigentes (2026-11-18)

`retries: 0` é a configuração padrão (seção 3.1), e não uma exceção. A coluna "Issue" mostra **pendência de implantação**: as issues das exceções ainda precisam ser abertas com o modelo, o que exige criação manual no GitHub.

| Tipo | Local | Classe | Motivo | Issue | Revisão |
|---|---|---|---|---|---|
| `test.fail` | Spec 03 (C3), busca por palavra-chave | Variação esperada | Busca por texto livre não implementada no frontend | **A abrir** | Próxima quinzenal |
| `test.fail` | Spec 06 (C6), histórico da demanda | Variação esperada | Seção de histórico não implementada no frontend | **A abrir** | Próxima quinzenal |
| `test.fixme` | Spec 05 (C5), "deve navegar entre páginas e carregar registros corretamente" | Variação esperada | Paginação não implementada (a lista carrega `page=1&limit=100`) | **A abrir** (a mesma dos dois casos de C5) | Próxima quinzenal |
| `test.fixme` | Spec 05 (C5), "deve permanecer estável quando ocorrer falha na paginação" | Variação esperada | Paginação não implementada | **A abrir** | Próxima quinzenal |
| `test.skip` condicional | Spec 09, teste de notificação push | Ambiente (local) | Só ocorre sem `E2E_EXPO_MOCK_URL`; o CI define a variável | Não se aplica | Não se aplica |
| `waitForTimeout` | Spec 05, duas ocorrências | Exceção documentada | Dentro de `test.fixme()`; não há estado observável (seção 3.6) | Junto à de C5 | Ao implementar a paginação |

### 7.1 Testes removidos

Nenhum até esta data.

---

## 8. Caso demonstrativo: BUG-04

O BUG-04 ("usuário logado é expulso para o login ao dar F5") percorreu o ciclo completo e é o caso oficial desta política. Ele também revelou um problema de **TAS/ambiente**: durante um período, o pipeline validava o frontend de **outro repositório**, o que atrasou a descoberta de que o defeito já estava corrigido.

| Etapa | Data | O que aconteceu | Evidência |
|---|---|---|---|
| 1. Identificação | 2026-09-15 | Ao escrever o cenário C10, a suíte revelou que o guard roda antes de o Zustand reidratar a sessão: um gestor legítimo era expulso ao dar F5. | Commit `e0f0132` (spec 10) |
| 2. Classificação | Setembro a outubro | **SUT** (defeito), severidade Alta, reprodução 100% (12/12). O teste do comportamento correto ficou como `test.fail()`, ou seja, **variação esperada** acompanhada. | `RELATORIO_BUGS.md` (BUG-04) |
| 3. Acompanhamento | Setembro a novembro | `test.fail()` no spec 10, status "Aberto" no relatório de bugs e a pendência "C10" no `PIPELINE_CI_QUALITY_GATE.md`. | Spec 10 e documentação |
| 4. Correção | 2026-11-06 | O `AuthGuard` central passou a esperar `_hasHydrated` antes de redirecionar. | Commit `d80b181` |
| 5. Problema de TAS/ambiente | 2026-11-06 a 2026-11-17 | O pipeline testava o frontend e o backend de `Cecimedeiros/RESOLVE`, então a correção deste repositório **não era exercitada** (12 dias sem revalidação). O E2E foi alinhado a este repositório em 2026-11-17. | Commit `f146758` |
| 6. *Unexpected pass* | 2026-11-18 | A regressão #79 acusou "Expected to fail, but passed" no teste do F5 do gestor: o `test.fail()` cumpriu o papel de alarme. | Execução #79 |
| 7. Remoção do `test.fail()` e atualização da documentação | 2026-11-18 | O `test.fail()` foi removido, os comentários do spec 10 foram atualizados, o `RELATORIO_BUGS.md` passou a "Corrigido" com a evidência e a pendência de C10 saiu do `PIPELINE_CI_QUALITY_GATE.md`. | Commit `5a45653` |
| 8. Revalidação | 2026-11-18 | A regressão completa #82 (`workflow_dispatch`, commit `5a45653`) concluiu com sucesso. | Execução #82 |

**O que a política muda neste ciclo**
- A etapa 2 teria uma issue com classe, responsável e prazo, e não apenas uma linha no relatório de bugs.
- Na etapa 4, a correção do SUT dispararia uma revalidação com prazo de até 5 dias úteis, e não 12 dias de espera.
- A etapa 5 teria sido P1 (ambiente da TAS incorreto), com triagem em 1 dia útil.
- A remoção do `test.fail()` (etapa 7) segue o critério de saída da seção 3.4 e o tratamento de *unexpected pass* da seção 3.5.

---

## 9. Vigência e histórico

| Versão | Data | Mudança |
|---|---|---|
| 1.0 | 2026-11-18 | Criação da política |

Esta política é revista a cada revisão quinzenal (seção 4). Mudanças são feitas por PR e registradas na tabela acima.

**Pendências de implantação**
- Criar manualmente os rótulos `classe:sut`, `classe:tas`, `classe:ambiente`, `classe:variacao-esperada`, `prio:p1`, `prio:p2`, `prio:p3` e `flaky` (o `needs-triage` é criado pelo workflow).
- Abrir as issues das exceções da seção 7.
- Registrar o mapa nominal papel → pessoa na issue #48.
