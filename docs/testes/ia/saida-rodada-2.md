Sim. Vou manter as condições já derivadas, preservar as lacunas como **não especificadas** e garantir pelo menos um caso de **integração** e um de **E2E** para cada requisito dentro do escopo.

 ## 4.6 Casos de teste

 | ID | Caso de teste | Nível | Pré-condição | Passos | Resultado esperado |
| --- | --- | --- | --- | --- | --- |
| **TC01** | Solicitar nova demanda com dados válidos | Integração | Sistema disponível; cidadão identificado | 1\. Enviar uma solicitação válida pelo fluxo de criação. 2. Verificar o processamento pelos componentes internos. | A solicitação é processada pelo sistema sem erro. **Os campos obrigatórios e valores válidos não foram especificados.** |
| **TC02** | Solicitar nova demanda pelo fluxo completo | E2E | Cidadão apto a utilizar o sistema | 1\. Acessar a opção de nova demanda. 2. Preencher os dados necessários. 3. Submeter. | O fluxo de solicitação é concluído sem erro e a demanda é registrada. |
| **TC03** | Submeter formulário de demanda em branco | Integração | Formulário de demanda disponível | 1\. Enviar o formulário sem preencher dados. | O sistema não deve aceitar a solicitação em branco. |
| **TC04** | Submeter formulário de demanda em branco pelo mobile | E2E | Cidadão no aplicativo/mobile | 1\. Abrir nova demanda. 2. Não preencher nenhum campo. 3. Tentar enviar. | A solicitação em branco não é aceita pelo sistema. |
| **TC05** | Buscar demanda por palavra-chave válida | Integração | Existem dados que podem ser pesquisados | 1\. Informar uma palavra-chave. 2. Executar a busca. | O componente de busca processa a palavra-chave e retorna o resultado correspondente. |
| **TC06** | Utilizar busca global por palavra-chave | E2E | Cidadão no mobile; existem registros pesquisáveis | 1\. Acessar a busca global. 2. Informar uma palavra-chave. 3. Executar a busca. | Os resultados da busca são apresentados ao cidadão. |
| **TC07** | Navegar entre páginas da listagem | Integração | Listagem disponível com mais de uma página | 1\. Solicitar a primeira página. 2. Solicitar página seguinte. | O sistema processa corretamente a navegação entre páginas. **Quantidade de itens por página não especificada.** |
| **TC08** | Navegar pelas páginas da listagem pelo mobile | E2E | Listagem com mais de uma página | 1\. Abrir listagem. 2. Avançar para outra página. 3. Retornar à página anterior. | O cidadão consegue navegar pelas páginas da listagem. |
| **TC09** | Obter detalhes de uma demanda | Integração | Existe uma demanda disponível | 1\. Solicitar os detalhes da demanda. | O sistema processa a solicitação e retorna os detalhes da demanda. |
| **TC10** | Cidadão visualiza detalhes de uma demanda | E2E | Existe uma demanda disponível | 1\. Abrir a listagem. 2. Selecionar uma demanda. 3. Acessar seus detalhes. | Os detalhes da demanda são apresentados ao cidadão. |
| **TC11** | Gestor altera prioridade de uma demanda | Integração | Usuário gestor; demanda existente | 1\. Enviar solicitação de alteração de prioridade. | O sistema processa a alteração. **Valores permitidos de prioridade não foram especificados.** |
| **TC12** | Gestor altera prioridade pelo painel mobile | E2E | Gestor autenticado; demanda existente | 1\. Acessar painel. 2. Selecionar demanda. 3. Alterar prioridade. 4. Confirmar. | A alteração de prioridade é realizada pelo fluxo do sistema. |
| **TC13** | Acessar painel administrativo como gestor | Integração | Usuário com perfil de gestor | 1\. Solicitar acesso ao painel com credencial de gestor. | O sistema reconhece o acesso autorizado ao painel. |
| **TC14** | Gestor acessa painel administrativo | E2E | Gestor autenticado | 1\. Entrar no sistema. 2. Acessar o painel administrativo. | O painel administrativo é apresentado ao gestor. |
| **TC15** | Bloquear acesso de cidadão ao painel do gestor | Integração | Usuário cidadão autenticado | 1\. Tentar acessar o recurso protegido como cidadão. | O componente de autorização rejeita o acesso. |
| **TC16** | Cidadão tenta acessar painel do gestor | E2E | Cidadão autenticado | 1\. Tentar acessar o Painel do Gestor pelo mobile. | O cidadão não consegue acessar o painel administrativo. |
| **TC17** | Encerrar sessão | Integração | Usuário autenticado | 1\. Executar a operação de logout. 2. Verificar o estado de autenticação. | A sessão é encerrada pelo sistema. |
| **TC18** | Encerrar sessão pelo fluxo mobile | E2E | Usuário autenticado no mobile | 1\. Acessar opção de logout. 2. Confirmar/realizar logout. 3. Tentar acessar área autenticada. | A sessão é encerrada e o usuário não permanece autenticado. |

### Cobertura por requisito

 | Requisito | Integração | E2E |
| --- | --- | --- |
| Solicitar nova demanda urbana | TC01 | TC02 |
| Submeter formulário em branco | TC03 | TC04 |
| Busca global por palavra-chave | TC05 | TC06 |
| Navegação da listagem | TC07 | TC08 |
| Visualização de detalhes | TC09 | TC10 |
| Alteração de prioridade pelo gestor | TC11 | TC12 |
| Painel Administrativo do Gestor | TC13 | TC14 |
| Bloqueio do cidadão no painel | TC15 | TC16 |
| Logout | TC17 | TC18 |

**Observação importante:** os casos não definem valores específicos para campos, prioridades, quantidade de páginas ou mensagens de erro porque essas regras não foram fornecidas. Isso preserva a limitação de **não inventar regras por inferência**.

 Você classificou:

 > **Busca por palavra — Não**\
>  O filtro de busca é feito por listas de palavras pré-definidas.

 Eu manteria **fora do escopo** se o requisito realmente significa uma busca livre por qualquer palavra digitada. Porém, o requisito **“Cidadão usa a busca global por palavra-chave”** continua dentro do escopo porque aparentemente é uma funcionalidade diferente.

 Precisamos apenas distinguir claramente:

 - **Busca global por palavra-chave:** dentro do escopo.
- **Busca livre por palavra:** fora do escopo, pois o produto utiliza palavras pré-definidas.

 ### Limitação que eu aplicaria aos próximos casos

 Para cada requisito, eu estruturaria os casos assim:

 **Requisito → caso de integração → caso E2E → técnica de modelagem → resultado esperado baseado exclusivamente em evidência fornecida.**

 Quando faltar uma regra, em vez de preencher por plausibilidade, colocaria:

 > **“Critério não especificado — necessário fornecer requisito/regra de negócio.”**

 Isso resolve justamente a principal deficiência identificada na minha primeira saída.