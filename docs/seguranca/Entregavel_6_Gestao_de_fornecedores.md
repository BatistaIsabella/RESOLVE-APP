# Entregável 6 – Gestão de fornecedores

**CESAR School · Segurança da Informação · Projeto Integrador RESOLVE**

Alunos: José Leandro, Alvaro Silva, Thays Barbosa, Icaro Leonardo, Arthur Estevão, Cecília Medeiros, Isabella Batista, Gabriel Souza, Beatriz Paredes, Melissa Vitória e Aquiles Pereira

Data de entrega: 11/12/2026

## 6. Gestão de fornecedores

### 6.1 Inventário dos fornecedores

O RESOLVE não tem infraestrutura própria: banco, aplicação, código, notificações e backups ficam em serviços de terceiros, a maioria em planos gratuitos. A criticidade de cada fornecedor considera o que ele acessa e o impacto caso falhe ou seja comprometido.

**Render (aplicação, banco PostgreSQL e Redis):** Alta. Executa os serviços, guarda os dados dos usuários e das ocorrências e mantém as chaves e segredos em variáveis de ambiente. Por concentrar banco, aplicação e chaves, o comprometimento da conta no Render dá acesso a tudo de uma vez, e a perda da conta leva junto a base e as chaves (item 5.3 do Entregável 5).

**GitHub (código e Actions):** Alta. Guarda o código e os secrets e executa os testes e o backup diário. Como o repositório é público, nenhum dado ou segredo pode ficar em artefatos ou logs dos fluxos.

**Bucket externo do backup:** Alta. Recebe o dump cifrado do banco (item 5.2 do Entregável 5).

**Expo (atualizações e notificações do app):** Alta. Publica atualizações no aplicativo e envia as notificações de mudança de status. Uma atualização indevida publicada por ele chegaria diretamente aos aparelhos dos usuários.

**Provedor de e-mail (SMTP):** Média. Recebe o e-mail do usuário para envio do token de recuperação de senha (item 1.5 do Entregável 1).

**Google (Gmail):** Média. Recebe as solicitações dos titulares no e-mail privacidaderesolve@gmail.com (item 3.4 do Entregável 3).

**MongoDB Atlas e Neon (análise):** Média. Recebem cópias pseudonimizadas das ocorrências (item 4.3 do Entregável 4).

**UptimeRobot e Prefect:** Baixa. Acessam apenas rotas da API, sem acesso ao banco.

### 6.2 Critérios de seleção

Antes de adotar um fornecedor que trate dados pessoais, a equipe deve verificar se ele oferece criptografia em trânsito e em repouso, autenticação multifator (MFA) nas contas, certificações reconhecidas (como ISO/IEC 27001 ou SOC 2), país onde os dados ficam armazenados, termo de processamento de dados (DPA) e exportação dos dados em formato padrão, para permitir a troca de fornecedor sem perda de dados. Os fornecedores já em uso foram adotados antes desses critérios e devem ser avaliados por eles, registrando o resultado no mapeamento do item 3.1 do Entregável 3.

### 6.3 Requisitos contratuais e LGPD

Hoje o projeto usa os termos padrão dos planos gratuitos. Em uma operação com órgão público, o órgão é o controlador e a equipe é a operadora (item 3.1 do Entregável 3), e os fornecedores passam a atuar como suboperadores, seguindo as instruções do controlador (art. 39 da LGPD). Nesse cenário, os contratos devem prever a finalidade do tratamento, a proibição de uso dos dados pelo fornecedor, medidas de segurança (art. 46), a exclusão dos dados ao fim do contrato e o aviso rápido de incidentes, já que o controlador tem três dias úteis para comunicar a ANPD (Resolução CD/ANPD nº 15/2024). Os contratos também devem exigir autorização prévia para que o fornecedor repasse os dados a terceiros e indicar o país onde os dados ficam armazenados. Quando esse país for estrangeiro, como ocorre hoje com o banco, hospedado nos Estados Unidos, a transferência internacional precisa de um dos mecanismos do art. 33 da LGPD, como as cláusulas-padrão contratuais aprovadas pela Resolução CD/ANPD nº 19/2024.

### 6.4 Controle de acesso

Cada integração usa credenciais próprias e com o mínimo de permissão, seguindo o item 2.6 do Entregável 2: o backup usa um usuário de banco somente de leitura e a pipeline acessa os dados apenas pela API, ainda com um token de gestor até que seja criada a conta técnica somente de leitura prevista no item 4.8 do Entregável 4. As contas da equipe nos painéis dos fornecedores devem ter MFA, e o acesso deve ser removido quando um integrante deixar o projeto. Os segredos e tokens que ele conhecia também devem ser trocados, registrando a data de troca das chaves de criptografia conforme o item 5.3 do Entregável 5.

### 6.5 Minimização dos dados

Cada fornecedor recebe apenas o necessário. A pipeline remove os dados de usuários e as fotos e pseudonimiza o e-mail antes de enviar as ocorrências ao ambiente de análise, e o backup é cifrado antes de sair do GitHub Actions.

### 6.6 Dependências de software

O projeto usa pacotes de terceiros em Node.js e Python, que podem conter vulnerabilidades (OWASP A06:2021). As versões são travadas pelos arquivos package-lock.json e instaladas com npm ci, inclusive na construção das imagens Docker, garantindo que a aplicação use exatamente as versões testadas. Travar as versões evita mudanças inesperadas, mas não corrige vulnerabilidades já conhecidas; por isso, o Quality Gate do item 4.7 do Entregável 4 passou a executar o npm audit no aplicativo mobile, no backend e no frontend web, sinalizando vulnerabilidades altas ou críticas. No backend e no frontend web, uma vulnerabilidade alta ou crítica reprova o Quality Gate; no aplicativo mobile, o resultado é por enquanto apenas informativo, porque as vulnerabilidades restantes dependem da atualização da versão do SDK do Expo. O Dependabot verifica semanalmente as dependências npm, as imagens Docker e as GitHub Actions. No aplicativo mobile, os pacotes do Expo são atualizados em grupo, para manter a compatibilidade com a versão do SDK. As imagens base dos contêineres Docker, que também são componentes de terceiros, passaram a usar versões fixas, e as dependências Python da pipeline devem ser fixadas da mesma forma, em arquivo de requisitos com versões exatas.

### 6.7 Monitoramento e saída de fornecedores

A disponibilidade é acompanhada pelo endpoint /health do Gateway e pelos alertas do fluxo de backup. Esses sinais mostram falhas dos próprios serviços, mas não os incidentes dos fornecedores, por isso a equipe deve acompanhar também as páginas de status e os avisos de segurança de cada um, em especial os de criticidade alta. Ao trocar ou encerrar um fornecedor, a equipe deve exportar os dados, revogar as credenciais ligadas a ele e solicitar a exclusão das cópias mantidas pelo fornecedor, conforme o art. 16 da LGPD.

### 6.8 Recomendações

Como próximo passo, recomenda-se registrar cada fornecedor, com os dados que recebe e o país onde os guarda, no mapeamento do item 3.1 do Entregável 3 e na Política de Privacidade do item 3.5 do Entregável 3.

Como melhorias futuras, recomenda-se ativar MFA em todas as contas administrativas dos fornecedores, revisar periodicamente quem tem acesso a cada painel, atualizar as imagens do backend do Node.js 20, que deixou de receber correções de segurança em abril de 2026, para uma versão com suporte e, em operação com órgão público, contratar planos pagos com DPA assinado.

### 6.9 Referências

1. ISO/IEC 27001:2022 – Anexo A, controles 5.19 (relações com fornecedores), 5.20 (contratos com fornecedores), 5.21 (cadeia de suprimentos de TIC) e 5.22 (monitoramento dos serviços de fornecedores).
2. NIST SP 800-161 Rev. 1 – Cybersecurity Supply Chain Risk Management Practices for Systems and Organizations.
3. OWASP Top 10 (2021) – A06:2021, Vulnerable and Outdated Components.
4. Lei nº 13.709, de 14 de agosto de 2018 – Lei Geral de Proteção de Dados Pessoais (LGPD), art. 16, art. 33, art. 39, art. 46 e art. 48.
5. Resolução CD/ANPD nº 15, de 24 de abril de 2024 – Regulamento de Comunicação de Incidente de Segurança.
6. Resolução CD/ANPD nº 19, de 23 de agosto de 2024 – Regulamento de Transferência Internacional de Dados e conteúdo das cláusulas-padrão contratuais.
