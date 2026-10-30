# Procedimento de resposta a incidentes de segurança com dados pessoais

Referência: art. 48 da LGPD e Entregável 3, item 3.8. Integra os registros de autenticação (Entregável 1, item 1.6) e os controles do Entregável 2.

> Os prazos da ANPD abaixo vêm do Regulamento de Comunicação de Incidente de Segurança (Resolução CD/ANPD nº 15/2024). Confirme se continuam vigentes antes de usar este procedimento em uma operação real.

## 1. Papéis

| Papel | Quem | Responsabilidade |
|---|---|---|
| Coordenador do incidente | Líder da equipe RESOLVE (operador) | Conduz a resposta, decide contenção e mantém o registro |
| Equipe técnica | Desenvolvedores de plantão | Investiga, contém e corrige |
| Controlador | Órgão público contratante | Decide sobre a comunicação à ANPD e aos titulares |
| Encarregado (DPO) | Designado pelo controlador | Faz a comunicação à ANPD e atende os titulares |

Como operador, a equipe **informa o controlador sem demora** (sugerido: em até 24 horas da confirmação) e fornece os dados para a comunicação. A decisão e o envio à ANPD são do controlador.

## 2. O que é um incidente

Qualquer evento que comprometa a confidencialidade, integridade ou disponibilidade de dados pessoais. Exemplos neste sistema:

- Acesso a contas de cidadão ou gestor por terceiros (credencial vazada, força bruta bem-sucedida).
- Gestor lendo ocorrências de outro órgão por falha de autorização.
- Vazamento do banco, de um backup ou de uma credencial (`JWT_SECRET`, senha do banco ou do Redis, `MFA_ENCRYPTION_KEY`).
- Exposição de e-mail ou identificador de cidadãos por uma rota da API.
- Perda ou apagamento indevido de dados.

## 3. Fluxo de resposta

| Etapa | O que fazer | Prazo sugerido |
|---|---|---|
| 1. Detecção e registro | Abrir o registro do incidente (modelo no item 7) com data, quem detectou e como | Imediato |
| 2. Triagem | Confirmar se há dados pessoais envolvidos e classificar a gravidade (item 4) | 4 horas |
| 3. Contenção | Isolar a causa: ver ações por cenário (item 5) | 4 horas após a triagem |
| 4. Avaliação do alcance | Identificar quais titulares e quais tipos de dados foram afetados (item 6) | 24 horas |
| 5. Comunicação ao controlador | Enviar ao controlador o registro com o alcance | 24 horas da confirmação |
| 6. Comunicação à ANPD e aos titulares | Se houver risco ou dano relevante aos titulares (item 8), o controlador comunica | 3 dias úteis do conhecimento do incidente |
| 7. Erradicação e recuperação | Corrigir a causa, restaurar o serviço, rodar os testes | Conforme a gravidade |
| 8. Pós-incidente | Reunião de lições aprendidas, atualização do RIPD e dos controles | 10 dias |

## 4. Classificação

| Nível | Critério | Exemplo |
|---|---|---|
| Crítico | Dados de muitos titulares expostos ou credencial mestra vazada | Banco ou `JWT_SECRET` vazado |
| Alto | Dados de poucos titulares expostos, ou conta de gestor comprometida | Gestor invadido, falha de escopo entre órgãos |
| Médio | Tentativa em massa sem acesso confirmado | Pico de `LOGIN_BLOQUEADO` |
| Baixo | Sem dados pessoais envolvidos | Falha de disponibilidade |

## 5. Contenção por cenário

| Cenário | Ações |
|---|---|
| Conta comprometida | Redefinir a senha da conta (encerra as sessões antigas nos três serviços); desativar a MFA e exigir nova ativação se ela foi o alvo; revisar o histórico da conta (item 6) |
| `JWT_SECRET` vazado | Trocar o segredo nos três serviços ao mesmo tempo (todas as sessões caem e todos precisam entrar de novo) |
| Credencial de banco ou Redis vazada | Rotacionar a senha do usuário (`auth_svc`, `demand_svc`, `metrics_svc` ou Redis) e atualizar os serviços; revisar os acessos |
| `MFA_ENCRYPTION_KEY` vazada | Os segredos de MFA cifrados devem ser considerados expostos: desativar a MFA de todos os gestores, trocar a chave e pedir nova ativação |
| `DADOS_ENCRYPTION_KEY` vazada | Os e-mails gravados cifrados devem ser considerados expostos para quem também tenha o banco ou um backup. Gerar uma chave nova, decifrar com a antiga e regravar todos os e-mails (auth e demand) antes de descartar a antiga; tratar como vazamento de dados pessoais se o banco também foi acessado |
| `EMAIL_HASH_KEY` vazada | Permite testar se um e-mail conhecido consta no banco (não decifra nada). Gerar uma chave nova e refazer o valor de busca (`email_hash`) de todas as contas, o que exige a `DADOS_ENCRYPTION_KEY` para ler os e-mails; as contas não conseguem entrar enquanto isso não for feito |
| Código de acesso de gestor vazado | Trocar o valor em `GESTOR_ACCESS_CODES`; revisar os gestores criados no período |
| Falha de autorização em rota | Retirar a rota do ar ou aplicar o filtro de órgão; revisar os registros de acesso do gateway |
| Ataque em andamento | Reduzir `RECUPERACAO_MAX_POR_JANELA` e o limite do gateway; bloquear o IP na borda |

## 6. Identificar quem foi afetado

Consultas no banco (usuário com permissão de leitura, nunca exportando senhas ou hashes). Os registros em `auth.eventos_auth` não guardam senha, token nem e-mail em texto, apenas o identificador.

```sql
-- Falhas e bloqueios de login nas últimas 24h, por IP
SELECT ip, tipo, count(*) FROM auth.eventos_auth
WHERE tipo IN ('LOGIN_FALHA', 'LOGIN_BLOQUEADO') AND criado_em > now() - interval '24 hours'
GROUP BY ip, tipo ORDER BY count(*) DESC;

-- Histórico de uma conta
SELECT criado_em, tipo, ip, user_agent FROM auth.eventos_auth
WHERE usuario_id = :id ORDER BY criado_em DESC;

-- Contas com login bem-sucedido a partir de um IP suspeito
SELECT DISTINCT usuario_id FROM auth.eventos_auth
WHERE tipo = 'LOGIN_SUCESSO' AND ip = :ip AND criado_em BETWEEN :inicio AND :fim;

-- Trocas e redefinições de senha na última semana
SELECT criado_em, usuario_id, tipo FROM auth.eventos_auth
WHERE tipo IN ('SENHA_ALTERADA', 'SENHA_REDEFINIDA') AND criado_em > now() - interval '7 days';

-- Uso de códigos de recuperação de MFA e códigos recusados
SELECT criado_em, usuario_id, tipo, ip FROM auth.eventos_auth
WHERE tipo IN ('MFA_RECUPERACAO_USADA', 'MFA_CODIGO_RECUSADO') AND criado_em > now() - interval '7 days';
```

Para os dados de ocorrências, a quantidade de titulares afetados sai do volume exposto: contar `demand.denuncias` por `categoria` e período, e por `cidadao_id`. Para falha entre órgãos, cruzar as categorias acessadas com o órgão do gestor (`orgao` em `auth.usuarios`).

Tipos de eventos registrados: `CADASTRO`, `LOGIN_SUCESSO`, `LOGIN_FALHA`, `LOGIN_BLOQUEADO`, `LOGOUT`, `SENHA_REDEFINICAO_SOLICITADA`, `SENHA_REDEFINIDA`, `SENHA_ALTERADA`, `DADOS_ALTERADOS`, `TERMOS_ACEITOS`, `CONTA_EXCLUIDA`, `MFA_DESAFIO`, `MFA_ATIVADA`, `MFA_DESATIVADA`, `MFA_CODIGO_RECUSADO`, `MFA_RECUPERACAO_USADA` e, com a confirmação de e-mail ligada, `CADASTRO_EMAIL_EXISTENTE`, `EMAIL_CONFIRMADO`, `CONFIRMACAO_REENVIADA` e `LOGIN_EMAIL_NAO_CONFIRMADO`. O e-mail não aparece nos registros: quem não tem conta é identificado por um HMAC (`identificador`), que só se refaz com a `EMAIL_HASH_KEY`.

Os registros são mantidos por 12 meses (`LOG_RETENCAO_DIAS`). **Preservar as evidências do incidente** (exportar os registros relevantes antes de qualquer rotina de limpeza ou de anonimização por exclusão de conta).

## 7. Registro do incidente

| Campo | Conteúdo |
|---|---|
| Identificador e data/hora da detecção | |
| Quem detectou e como | |
| Descrição do que aconteceu | |
| Sistemas e serviços envolvidos | |
| Categorias de dados e quantidade de titulares afetados | |
| Dados sensíveis, crianças ou adolescentes envolvidos? | |
| Causa provável | |
| Medidas de contenção e hora de cada uma | |
| Risco aos titulares | |
| Comunicado ao controlador em | |
| Comunicado à ANPD em / protocolo | |
| Titulares comunicados em / canal | |
| Ações corretivas e responsável | |

## 8. Comunicação

**Quando comunicar:** quando o incidente puder acarretar risco ou dano relevante aos titulares (art. 48 da LGPD). Em caso de dúvida, o controlador deve tratar como relevante e documentar a decisão.

**Conteúdo mínimo (art. 48, §1º):**

1. Descrição da natureza dos dados pessoais afetados.
2. Informações sobre os titulares envolvidos.
3. Medidas técnicas e de segurança usadas para a proteção dos dados, observados os segredos comercial e industrial.
4. Riscos relacionados ao incidente.
5. Motivos da demora, se a comunicação não for imediata.
6. Medidas que foram ou serão adotadas para reverter ou mitigar os efeitos.

**Modelo de aviso ao titular:**

> Assunto: Aviso de segurança sobre seus dados no RESOLVE
>
> Identificamos em [data] um incidente de segurança que pode ter afetado [tipos de dados: ex.: seu nome e e-mail]. [Descrição curta do que ocorreu.] Seus dados de [o que não foi afetado, ex.: senha] não foram expostos. Já adotamos as seguintes medidas: [medidas]. Recomendamos que você [ação, ex.: troque sua senha]. Para dúvidas ou para exercer seus direitos, escreva para privacidaderesolve@gmail.com. [Nome do órgão controlador e do encarregado.]

## 9. Preparação

- Manter este procedimento, o RIPD e a lista de contatos (coordenador, equipe, controlador, encarregado) atualizados.
- Fazer uma simulação por ano, por exemplo "credencial de banco vazada", e registrar os ajustes.
- Revisar semanalmente os registros de autenticação em produção (consulta de falhas e bloqueios do item 6) e configurar alerta para picos.
