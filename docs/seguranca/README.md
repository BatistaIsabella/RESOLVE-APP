# Segurança e LGPD no RESOLVE

Implementação dos Entregáveis 1 (autenticação e senhas), 2 (dados em repouso) e 3 (LGPD), na branch `feat/seguranca-lgpd`.

## Documentos

| Documento | Para quê |
|---|---|
| [RELATORIO_DE_ENTREGA.md](RELATORIO_DE_ENTREGA.md) | Visão completa: o que foi feito, o que não foi (com motivo, como fazer e se precisa no acadêmico) e o roteiro de testes |
| [IMPLEMENTACAO.md](IMPLEMENTACAO.md) | Detalhe técnico: situação de cada item dos entregáveis, endpoints, variáveis de ambiente, mapeamento dos dados e cuidados no deploy |
| [ROTEIRO_DE_TESTES.md](ROTEIRO_DE_TESTES.md) | Texto para a líder testar, com os passos e o resultado esperado |
| [RIPD.md](RIPD.md) | Relatório de Impacto à Proteção de Dados (3.7): dados, riscos, medidas e direitos dos titulares |
| [PROCEDIMENTO_INCIDENTES.md](PROCEDIMENTO_INCIDENTES.md) | Resposta a incidentes e comunicação à ANPD (3.8) |
| [TERMO_DE_COOPERACAO_MODELO.md](TERMO_DE_COOPERACAO_MODELO.md) | Modelo de termo com o órgão controlador, incluindo gestores terceirizados (3.6) |
| [AJUSTES_NOS_ENTREGAVEIS.md](AJUSTES_NOS_ENTREGAVEIS.md) | Texto sugerido para corrigir os trechos dos PDFs que não batem com o projeto |

## O que foi implementado

### Entregável 1: autenticação e senhas

| Item | Resumo | Código |
|---|---|---|
| 1.2 Senha forte | 12+ caracteres, maiúscula, minúscula, número e símbolo; recusa senha comum, que contenha o nome ou o e-mail, ou que já vazou (Have I Been Pwned) | [senha.ts](../../backend/auth-service/src/utils/senha.ts), [senhaVazada.ts](../../backend/auth-service/src/services/senhaVazada.ts) |
| 1.2 Hash com salt | bcrypt, custo 12 | [senhaService.ts](../../backend/auth-service/src/services/senhaService.ts) |
| 1.3 Bloqueio de login | 3 falhas seguidas bloqueiam por 15 minutos, por e-mail, inclusive os inexistentes | [tentativasLoginService.ts](../../backend/auth-service/src/services/tentativasLoginService.ts) |
| 1.4 Sessão | Token de 24h no Keychain/Keystore; troca de senha encerra as sessões antigas nos três serviços | [sessaoService.ts](../../backend/auth-service/src/services/sessaoService.ts), [secureStorage.ts](../../frontend/mobile/lib/secureStorage.ts) |
| 1.5 Recuperação de senha | Código de uso único, 30 minutos, enviado por e-mail | [recuperacaoSenhaService.ts](../../backend/auth-service/src/services/recuperacaoSenhaService.ts) |
| 1.6 Registro de acessos | Login, falha, bloqueio, logout, redefinição, troca de senha, aceite, MFA e exclusão, sem senha nem e-mail em texto | [auditoriaService.ts](../../backend/auth-service/src/services/auditoriaService.ts) |
| 1.7 MFA para gestores | Código TOTP do app autenticador, 8 códigos de recuperação, segredo cifrado. **Implementada, mas desligada por padrão** (`MFA_HABILITADO=false`): enquanto desligada, ninguém consegue ativar e o app esconde a opção | [mfaService.ts](../../backend/auth-service/src/services/mfaService.ts), [cifra.ts](../../backend/auth-service/src/utils/cifra.ts) |
| 1.3 Cadastro sem revelar e-mail | Com `CONFIRMACAO_EMAIL_HABILITADA=true` o cadastro responde igual para qualquer e-mail e a conta só entra após confirmar o código enviado por e-mail. **Desligado por padrão** | [confirmacaoEmailService.ts](../../backend/auth-service/src/services/confirmacaoEmailService.ts), [confirmar-email.tsx](../../frontend/mobile/app/confirmar-email.tsx) |

### Entregável 2: dados em repouso

| Item | Resumo | Código |
|---|---|---|
| 2.3 Redis | Senha obrigatória; fila expira em 1 hora; cache em 5 minutos | [docker-compose.prod.yml](../../backend/docker-compose.prod.yml), [redis.ts](../../backend/demand-service/src/config/redis.ts) |
| 2.2 Criptografia de coluna | E-mail do usuário e do solicitante cifrados com AES-256-GCM; busca do login por HMAC; migração automática. Chaves por variável de ambiente (sem KMS) | [emailProtegido.ts](../../backend/auth-service/src/utils/emailProtegido.ts), [lib/prisma.ts](../../backend/auth-service/src/lib/prisma.ts) |
| E4 Fotos | Só JPEG, PNG ou WEBP em base64, com conferência do conteúdo, até 2 MB por foto e 5 por denúncia | [imagem.ts](../../backend/demand-service/src/utils/imagem.ts) |
| 2.4 Dados no aparelho | Sessão no armazenamento seguro, apagada no logout | [secureStorage.ts](../../frontend/mobile/lib/secureStorage.ts) |
| 2.5 Indicadores | Só agregados, sem identificar o titular, e por órgão | [metricsService.ts](../../backend/metrics-service/src/services/metricsService.ts) |
| 2.6 Menor privilégio | Um usuário de banco por serviço em produção | [roles.sql](../../backend/postgres-init/sql/roles.sql) |
| 2.7 Retenção | Denúncias resolvidas há mais de 5 anos são apagadas todo dia | [retencao.ts](../../backend/demand-service/src/jobs/retencao.ts) |

### Entregável 3: LGPD

| Item | Resumo | Código |
|---|---|---|
| 3.4 Direitos do titular | Tela "Meus dados": ver, corrigir, exportar e excluir a conta | [perfil.tsx](../../frontend/mobile/app/perfil.tsx), [contaService.ts](../../backend/auth-service/src/services/contaService.ts), [titularService.ts](../../backend/demand-service/src/services/titularService.ts) |
| 3.4 / 2.7 Exclusão | Apaga e-mail e fotos, desliga o vínculo das ocorrências e anonimiza os registros de segurança | [titularService.ts](../../backend/demand-service/src/services/titularService.ts), [auditoriaService.ts](../../backend/auth-service/src/services/auditoriaService.ts) |
| 3.5 Consentimento | Aceite obrigatório da política e dos termos, com data e versão | [aceite-termos.tsx](../../frontend/mobile/app/aceite-termos.tsx), [privacidade.tsx](../../frontend/mobile/app/privacidade.tsx), [termos.ts](../../frontend/mobile/constants/termos.ts) |
| 3.6 Gestor por órgão | O código de acesso define o órgão e as categorias visíveis | [orgaos.ts](../../backend/auth-service/src/config/orgaos.ts), [denunciaService.ts](../../backend/demand-service/src/services/denunciaService.ts) |
| 3.6 Privacidade entre cidadãos | O feed deixou de expor e-mail e identificador, e as coordenadas saem com menos precisão | [denunciaService.ts](../../backend/demand-service/src/services/denunciaService.ts) |
| 3.1 Mapeamento dos dados | Tabela de dados, finalidade, retenção e proteção | [IMPLEMENTACAO.md](IMPLEMENTACAO.md#4-mapeamento-dos-dados-item-31) |

Também foram ajustados: segredos obrigatórios (os serviços não sobem sem `JWT_SECRET`), cadastro de gestor fechado em produção sem código, limite de 100 chamadas por 15 minutos em `/auth` no gateway, CORS fechado por padrão e corpo máximo de 10 MB.

## O que não foi implementado

O motivo, como fazer e se precisa no contexto acadêmico de cada item estão em [RELATORIO_DE_ENTREGA.md, seção 2](RELATORIO_DE_ENTREGA.md#2-o-que-não-foi-implementado).

| Item | Resumo do motivo |
|---|---|
| Preenchimento do RIPD e do termo de cooperação (3.6, 3.7) | Os rascunhos existem; encarregado, órgão, aprovação e revisão jurídica dependem do controlador |
| Criptografia de disco (2.2) | Depende do provedor onde o banco roda |
| KMS para as chaves (2.2) | A criptografia de coluna do e-mail foi feita; as chaves vêm de variáveis de ambiente, não de um KMS |
| Criptografia das fotos ponta a ponta (2.8) | Melhoria futura na própria documentação |
| Confirmação de e-mail ligada (1.3) | Está implementada, mas desligada por padrão: exige SMTP, e só o app mobile foi adaptado |
| Tela ou alerta para revisar registros (1.7) | Os registros existem e há consultas SQL prontas no relatório |
| Gestor servidor x terceirizado (3.6) | Hoje só existe o vínculo ao órgão |
| Pedidos de bloqueio, anonimização e revogação automatizados (3.4) | Atendidos por e-mail, como o documento pede |

Limites conhecidos (Redis fora do ar, tokens antigos por 24h, limite de recuperação em memória, `render.yaml`) estão na mesma seção do relatório.

## O que não foi testado

Telas do app em celular ou emulador, envio real de e-mail (SMTP) e deploy em produção. Os passos para testar estão no roteiro.

## Como rodar os testes

```bash
cd backend/auth-service    && DATABASE_URL=".../postgres?schema=auth"   npx prisma db push && npx vitest run
cd backend/demand-service  && DATABASE_URL=".../postgres?schema=demand" npx prisma db push && npx vitest run
cd backend/metrics-service && npx vitest run
cd frontend/mobile         && npm test && npx tsc --noEmit
```

Resultado da última execução: auth 192, demand 370, metrics 14 e app 18 testes passando (auth e demand em um Postgres 16 local). Os dois roteiros de ponta a ponta (45 verificações gerais e 26 de MFA) foram feitos antes da criptografia de coluna e da confirmação de e-mail e não foram repetidos depois. Os testes de demand apagam denúncias resolvidas há mais de 5 anos do banco apontado, então não devem rodar contra um banco com dados reais.
