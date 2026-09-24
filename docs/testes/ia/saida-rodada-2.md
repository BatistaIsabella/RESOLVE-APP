Com esses insumos, dá para corrigir as principais lacunas. O ponto mais importante é que **não devo inventar critérios de aceite que não estejam no requisito ou no código/documentação**.

 Também há uma pequena inconsistência a tratar: você diz que não há integração com outras aplicações, então aqui “teste de integração” deve ser entendido como **integração entre componentes do próprio sistema Node/mobile** (por exemplo, tela → API → persistência), e não integração com terceiros.

 ### Matriz revisada

 | ID | Requisito | Escopo | Integração | E2E | Técnica de modelagem |
| --- | --- | --- | --- | --- | --- |
| CT-01 | Cidadão solicita uma nova demanda urbana | Sim | Sim | Sim | Partição de equivalência |
| CT-02 | Cidadão tenta submeter o formulário de demanda em branco | Sim | Sim | Sim | Partição de equivalência |
| CT-03 | Cidadão usa a busca global por palavra-chave | Sim | Sim | Sim | Partição de equivalência |
| CT-04 | Cidadão navega pelas páginas da listagem de solicitações | Sim | Sim | Sim | Valor-limite |
| CT-05 | Cidadão visualiza os detalhes de uma demanda | Sim | Sim | Sim | Partição de equivalência |
| CT-06 | Gestor Público altera a prioridade de uma demanda | Sim | Sim | Sim | Tabela de decisão |
| CT-07 | Gestor Público acessa o Painel Administrativo | Sim | Sim | Sim | Partição de equivalência |
| CT-08 | Cidadão não autorizado tenta acessar o Painel do Gestor | Sim | Sim | Sim | Tabela de decisão |
| CT-09 | Usuário encerra a sessão (Logout) | Sim | Sim | Sim | Transição de estados |

### O que ainda falta para eu escrever os casos detalhados

 Mesmo com essas limitações, ainda **não temos os critérios de aceite suficientes** para determinar alguns resultados esperados sem inferência.

 Por exemplo, em **“Gestor Público altera a prioridade de uma demanda”**, sabemos que a ação existe, mas não sabemos:

 - quais prioridades existem;
- se existe uma ordem entre elas;
- quais perfis podem alterá-las;
- se toda prioridade pode ser alterada para qualquer outra;
- o que acontece se a alteração falhar.

 Em vez de inventar isso, eu registraria:

 > **Critério de aceite pendente:** valores permitidos e regras de transição da prioridade não foram fornecidos.

 O mesmo vale para paginação: sabemos que existe navegação pelas páginas, mas não devemos assumir, por exemplo, que a primeira página tem 10 registros ou que a última página se comporta de determinada maneira.

 ### Um ponto importante sobre “Busca por palavra”

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