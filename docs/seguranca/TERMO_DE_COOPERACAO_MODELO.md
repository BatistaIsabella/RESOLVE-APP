# Modelo de termo de cooperação para compartilhamento de dados

Referência: Entregável 3, item 3.6, e arts. 23 a 30 da LGPD. Modelo para quando o RESOLVE for adotado por um ou mais órgãos públicos. Os campos entre colchetes são preenchidos pelo órgão. **Este texto é um modelo da equipe e precisa de revisão jurídica antes de ser assinado.**

---

**TERMO DE COOPERAÇÃO PARA TRATAMENTO DE DADOS PESSOAIS Nº [ ]/[ano]**

**Controlador:** [Órgão público], CNPJ [ ], representado por [nome e cargo].
**Operador:** [Equipe ou entidade responsável pelo RESOLVE], representada por [nome e cargo].

## Cláusula 1. Objeto

Disciplinar o tratamento de dados pessoais realizado por meio da plataforma RESOLVE para o atendimento de demandas urbanas na jurisdição do Controlador.

## Cláusula 2. Finalidade e base legal

O tratamento tem a finalidade exclusiva de receber, encaminhar e resolver as demandas registradas pelos cidadãos, com base no art. 7º, III, e nos arts. 23 a 30 da LGPD. É vedado o uso dos dados para finalidade diversa, inclusive publicidade e perfilamento.

## Cláusula 3. Dados e titulares

| Dado | Titular | Compartilhado com o Gestor? |
|---|---|---|
| Nome e e-mail | Cidadão e gestor | Não (o gestor vê só o e-mail do solicitante, quando informado) |
| Localização, descrição, categoria, região e status da ocorrência | Cidadão | Sim, do órgão responsável pela categoria |
| Fotos da ocorrência | Cidadão | Sim, do órgão responsável pela categoria |
| E-mail do solicitante | Cidadão | Sim, para contato sobre a demanda |
| Registros de segurança | Cidadão e gestor | Não |

## Cláusula 4. Obrigações do Controlador

1. Definir quais servidores e colaboradores terão perfil de Gestor Público e o órgão (categorias) de cada um.
2. Solicitar a criação, a alteração e a revogação de acessos, inclusive de colaboradores de empresas terceirizadas, com a indicação da empresa e do contrato.
3. Revisar a lista de gestores ativos pelo menos a cada [6] meses e revogar o acesso de quem se desligou.
4. Designar o encarregado e atender os titulares, com apoio do Operador.
5. Comunicar a ANPD e os titulares em caso de incidente (art. 48), com os dados fornecidos pelo Operador.

## Cláusula 5. Obrigações do Operador

1. Tratar os dados somente conforme as instruções do Controlador e a Cláusula 2.
2. Manter as medidas de segurança descritas no RIPD, entre elas: senha com hash, MFA para gestores, bloqueio de tentativas, escopo de acesso por órgão, criptografia de disco no provedor, banco com um usuário por serviço, registros de segurança sem dados de credencial.
3. Garantir o acesso mínimo: cada gestor só vê as ocorrências das categorias do seu órgão.
4. Informar o Controlador, em até [24 horas] da confirmação, sobre qualquer incidente que envolva dados pessoais, seguindo o procedimento de resposta a incidentes.
5. Auxiliar o Controlador no atendimento aos direitos dos titulares e na elaboração e revisão do RIPD.
6. Eliminar os dados ao término do vínculo ou nos prazos da Cláusula 7.

## Cláusula 6. Gestores terceirizados

Colaboradores de empresas contratadas pelo Controlador que operarem o perfil de Gestor Público:

1. Atuam em nome do Controlador e sob sua responsabilidade.
2. Devem assinar termo de confidencialidade e receber orientação sobre a LGPD.
3. Têm acesso individual e intransferível (um código de acesso e uma conta por pessoa; **proibido compartilhar login**), com MFA ativa.
4. Têm o acesso revogado em até [2 dias úteis] do fim do contrato ou do vínculo.

## Cláusula 7. Retenção e descarte

As ocorrências são mantidas por até **5 anos após sua conclusão**, tomando como referência a prescrição quinquenal do Decreto nº 20.910/1932, e depois eliminadas, incluindo cópias em cache, filas e registros. A pedido do titular, o e-mail e as fotos são eliminados, e a ocorrência permanece sem ligação com a pessoa pelo prazo de retenção. Os registros de segurança são mantidos por 12 meses.

## Cláusula 8. Subcontratação e transferência

O Operador só pode usar subprocessadores (hospedagem, banco de dados, envio de e-mail) com garantias equivalentes e deve informar ao Controlador quais são. Transferência internacional depende de autorização do Controlador e das salvaguardas do art. 33 da LGPD. Subprocessadores atuais: [provedor de hospedagem], [provedor de SMTP].

## Cláusula 9. Responsabilidades

Cada parte responde nos termos dos arts. 42 a 45 da LGPD. O Operador responde solidariamente quando descumprir a legislação ou as instruções lícitas do Controlador.

## Cláusula 10. Vigência e rescisão

Vigência de [ ] meses, renovável. Ao término, o Operador devolve ou elimina os dados conforme a orientação do Controlador, em até [30] dias, e entrega declaração de eliminação.

[Local], [data].

| Controlador | Operador |
|---|---|
| | |
