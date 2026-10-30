# Relatório de Impacto à Proteção de Dados Pessoais (RIPD): RESOLVE

Referência: art. 38 da Lei nº 13.709/2018 (LGPD) e Guia Orientativo da ANPD para elaboração de RIPD (Entregável 3, item 3.7).

| | |
|---|---|
| Versão | 1.0 (rascunho para revisão) |
| Controlador | Órgão público que contrata a plataforma, por meio do perfil Gestor Público (a preencher) |
| Operador | Equipe de desenvolvimento e operação do RESOLVE |
| Encarregado (DPO) | A designar pelo controlador. Canal de atendimento ao titular: privacidaderesolve@gmail.com |
| Revisão prevista | A cada mudança relevante no tratamento e, no mínimo, uma vez por ano |

> Este RIPD descreve o sistema como ele está implementado na branch `feat/seguranca-lgpd`. Os campos entre colchetes dependem do órgão que vier a operar a plataforma e devem ser preenchidos por ele antes de uma operação em produção.

## 1. Descrição do tratamento

### 1.1 Finalidade e base legal

O RESOLVE recebe do cidadão registros de problemas urbanos (iluminação, limpeza, vias, trânsito e outros) e os encaminha ao órgão responsável. A finalidade é a prestação do serviço público de atendimento a demandas urbanas.

Base legal: execução de políticas públicas previstas em lei ou regulamento (art. 7º, III, e arts. 23 a 30 da LGPD). Não há tratamento baseado em consentimento para o funcionamento da plataforma. O aceite da Política de Privacidade e dos Termos de Uso serve à transparência (art. 9º) e fica registrado com data e versão.

### 1.2 Dados tratados

| Dado | Titular | Serviço | Classificação | Retenção |
|---|---|---|---|---|
| Nome, e-mail (e-mail cifrado no banco) | Cidadão e gestor | Auth | Confidencial | Até a exclusão da conta |
| Senha (hash bcrypt) | Cidadão e gestor | Auth | Restrito | Até a exclusão da conta |
| Segredo e códigos de recuperação da MFA | Gestor | Auth | Restrito | Enquanto a MFA estiver ativa |
| Aceite de termos (data e versão) | Cidadão e gestor | Auth | Uso interno | Até a exclusão da conta |
| Registros de segurança (tipo, data, IP, aparelho) | Cidadão e gestor | Auth | Confidencial | 12 meses; anonimizados na exclusão da conta |
| Título, descrição, categoria, região, endereço (com GPS em texto) | Cidadão | Demand | Confidencial | 5 anos após a conclusão |
| E-mail do solicitante (cifrado no banco) | Cidadão | Demand | Confidencial | Idem; apagado na exclusão da conta |
| Fotos da ocorrência | Cidadão e terceiros que apareçam nelas | Demand | Confidencial | Idem; apagadas na exclusão da conta |
| Histórico de status | Cidadão | Demand | Uso interno | Idem |
| Indicadores | Nenhum (agregados) | Metrics | Uso interno | Cache de 5 minutos |

Não são coletados CPF, telefone, data de nascimento nem dados pessoais sensíveis (art. 5º, II). Nada impede, porém, que uma foto ou a descrição de uma ocorrência revele informação sensível ou de terceiros; ver o risco R5.

### 1.3 Ciclo de vida

1. **Coleta:** cadastro (nome, e-mail, senha) e registro de ocorrência (texto, endereço, fotos), pelo aplicativo móvel.
2. **Armazenamento:** PostgreSQL, com um schema por serviço. Redis só para sessão, fila de eventos e cache de indicadores, sem dados pessoais. No aparelho fica apenas a sessão, no Keychain/Keystore.
3. **Compartilhamento:** com o Gestor Público do órgão responsável pela categoria da ocorrência (ver item 3.6 do Entregável 3). Não há compartilhamento com terceiros comerciais nem transferência internacional, exceto o envio de e-mail pelo provedor SMTP contratado [a definir] e a consulta de senha vazada ao Have I Been Pwned (só 5 caracteres do hash SHA-1 saem do servidor, sem identificar o titular).
4. **Eliminação:** a pedido do titular (tela "Meus dados") ou 5 anos após a conclusão da ocorrência, por rotina diária (`retencao.ts`). Registros de segurança são apagados após 12 meses.

## 2. Necessidade e proporcionalidade

| Princípio (art. 6º) | Como é atendido |
|---|---|
| Finalidade e adequação | Cada dado tem finalidade única, descrita na Política de Privacidade e na tabela acima |
| Necessidade | Cadastro mínimo (nome, e-mail, senha); sem CPF ou telefone |
| Livre acesso | Tela "Meus dados": ver, corrigir, exportar (JSON) e excluir a conta |
| Qualidade dos dados | Correção de nome e e-mail pelo próprio titular |
| Transparência | Política de Privacidade e Termos de Uso com aceite explícito, versionado |
| Segurança | Controles do item 4 |
| Prevenção | Gestor restrito ao seu órgão, feed sem identificação, retenção limitada |
| Não discriminação | Os dados não são usados para perfilamento nem para decisões automatizadas |
| Responsabilização | Registros de segurança, este RIPD e o mapeamento de dados |

## 3. Riscos identificados

Probabilidade (P) e impacto (I) em três níveis: baixo, médio e alto. O risco é o resultado da combinação. A avaliação é da equipe e deve ser revista pelo controlador.

| # | Risco | P | I | Risco |
|---|---|---|---|---|
| R1 | Acesso indevido a contas (força bruta, reutilização de senha, phishing) | Médio | Alto | Alto |
| R2 | Reidentificação do cidadão pela localização e pelo texto da ocorrência | Médio | Alto | Alto |
| R3 | Gestor ou colaborador terceirizado acessar ocorrências de outro órgão ou além da necessidade | Médio | Alto | Alto |
| R4 | Vazamento do banco ou de backup (acesso ao disco, credencial exposta) | Baixo | Alto | Médio |
| R5 | Fotos e descrições com dados de terceiros ou dados sensíveis | Alto | Médio | Alto |
| R6 | Descoberta de e-mails cadastrados pelo formulário de cadastro | Alto | Baixo | Médio |
| R7 | Retenção além do necessário, inclusive em backups, cache e logs | Médio | Médio | Médio |
| R8 | Perda de sessão invalidada quando o Redis cai (token antigo continua valendo) | Baixo | Médio | Baixo |
| R9 | Titular não conseguir exercer seus direitos no prazo | Médio | Médio | Médio |
| R10 | Incidente não detectado ou comunicado fora do prazo | Médio | Alto | Alto |
| R11 | Mudança de finalidade (uso dos dados de ocorrência para outro fim) | Baixo | Alto | Médio |

## 4. Medidas de mitigação

| Risco | Medidas já implementadas | Medidas pendentes |
|---|---|---|
| R1 | Senha de 12+ caracteres com todas as classes, bloqueio de comuns e vazadas, bcrypt custo 12, bloqueio de 15 min após 3 falhas (também para e-mails inexistentes), mensagens genéricas, limite por IP no gateway e na recuperação (guardado no Redis), recuperação por código de uso único e 30 min, MFA para gestores | Ligar a MFA (`MFA_HABILITADO=true`) e torná-la obrigatória para gestores (`MFA_OBRIGATORIO_GESTOR=true`) antes da produção |
| R2 | Indicadores só com contagens por região, categoria e status; feed entre cidadãos sem e-mail nem identificador e com coordenadas de 3 casas (cerca de 100 m); exclusão da conta desliga o vínculo das ocorrências ao titular | Avaliar generalizar o endereço exibido a outros cidadãos |
| R3 | Código de acesso liga o gestor a um órgão, que define as categorias visíveis em lista, detalhe, status, prioridade, exclusão e indicadores; outro órgão recebe 404; MFA para gestores | Código por empresa terceirizada, com vínculo registrado; revisão periódica de quem tem acesso (ver [TERMO_DE_COOPERACAO_MODELO.md](TERMO_DE_COOPERACAO_MODELO.md)) |
| R4 | Usuário de banco por serviço, só no próprio schema (metrics só lê); Redis com senha; segredos obrigatórios por ambiente; e-mail do usuário e do solicitante cifrados em coluna (AES-256-GCM), com busca por HMAC; segredo da MFA cifrado com AES-256-GCM; senhas e códigos só em hash | Criptografia de disco do provedor (AES-256) confirmada por escrito; chaves em um cofre de segredos (hoje são variáveis de ambiente, sem KMS); rotação de credenciais |
| R5 | Termos orientam a evitar fotografar rostos, placas e documentos; só são aceitas imagens JPEG, PNG ou WEBP (conteúdo conferido, até 2 MB, 5 por denúncia); fotos visíveis só ao dono e ao gestor do órgão; apagadas na exclusão da conta | Aviso no ponto de captura da foto; rotina de moderação ou remoção a pedido |
| R6 | O login nunca revela se o e-mail existe. A confirmação de e-mail no cadastro (`CONFIRMACAO_EMAIL_HABILITADA`) faz o cadastro responder igual para qualquer e-mail e avisa o dono do e-mail por mensagem | Ligar a confirmação junto com o SMTP. **Enquanto estiver desligada, o cadastro ainda responde "e-mail já cadastrado": risco aceito** |
| R7 | Rotina diária de retenção (`RETENCAO_ANOS`, padrão 5); logs de segurança por 12 meses (`LOG_RETENCAO_DIAS`); fila Redis com expiração de 1 h; cache de 5 min; anonimização dos registros na exclusão | Definir retenção dos backups no provedor e documentá-la |
| R8 | Sessão por versão no Redis, com os três serviços verificando; token de 24 h | Decisão de projeto: se o Redis cair, o serviço continua de pé. Avaliar recusar o token nesse caso se o risco for considerado alto |
| R9 | Autoatendimento em "Meus dados"; canal por e-mail | Registro e prazo interno de resposta (ver item 5) |
| R10 | Registros de autenticação e consultas prontas; [PROCEDIMENTO_INCIDENTES.md](PROCEDIMENTO_INCIDENTES.md) | Alerta automático para picos de bloqueios; exercício de simulação por ano |
| R11 | Política de Privacidade versionada, com novo aceite a cada mudança (`TERMOS_VERSAO`) | Revisão jurídica dos textos |

## 5. Atendimento aos direitos dos titulares (art. 18)

| Direito | Como o titular exerce | Prazo interno sugerido |
|---|---|---|
| Confirmação e acesso | "Meus dados" e exportação em JSON | Imediato |
| Correção | "Meus dados" (nome e e-mail) | Imediato |
| Eliminação | "Meus dados", excluir a conta (pede a senha) | Imediato; ocorrências ficam sem vínculo ao titular durante a retenção |
| Portabilidade | Exportação em JSON | Imediato |
| Bloqueio ou anonimização por desconformidade | E-mail privacidaderesolve@gmail.com | 15 dias |
| Informação sobre compartilhamento | Política de Privacidade; e-mail para detalhes | 15 dias |
| Revogação do consentimento | Não se aplica ao funcionamento da plataforma (base legal de política pública); eventual consentimento futuro será revogável na tela | Imediato |

O prazo de 15 dias é o previsto no art. 19, II, da LGPD para a declaração completa; pedidos simples devem ser respondidos mais rápido, conforme as boas práticas da ANPD.

## 6. Conclusão

Com as medidas já implementadas, os riscos R1, R2, R3 e R5 passam de altos para **médios**, e os demais permanecem médios ou baixos. Antes de operar em produção com dados reais, recomenda-se, nesta ordem:

1. Ligar e tornar obrigatória a MFA para gestores.
2. Confirmar a criptografia de disco e a retenção dos backups no provedor.
3. Revisão jurídica da Política de Privacidade e dos Termos de Uso.
4. Designar o encarregado e formalizar o termo de cooperação com o órgão.
5. Tratar os riscos R5 (aviso na captura de foto) e R6 (ligar a confirmação de e-mail no cadastro, que já está implementada).
6. Guardar `DADOS_ENCRYPTION_KEY` e `EMAIL_HASH_KEY` em um cofre de segredos, com cópia segura: sem elas os e-mails não podem ser lidos.

| Responsável | Nome | Data |
|---|---|---|
| Elaboração (equipe RESOLVE) | | |
| Aprovação (controlador) | | |
| Encarregado | | |
