// Versão vigente da Política de Privacidade e dos Termos de Uso.
// Precisa ser igual à variável TERMOS_VERSAO do auth-service. Ao mudar o texto,
// aumente a versão nos dois lugares: todos os usuários passam a ver o aceite de novo.
export const VERSAO_TERMOS = '1.0';

export const CONTATO_PRIVACIDADE = 'privacidaderesolve@gmail.com';

export interface SecaoTexto {
  titulo: string;
  paragrafos: string[];
}

export const POLITICA_PRIVACIDADE: SecaoTexto[] = [
  {
    titulo: '1. Quem trata os seus dados',
    paragrafos: [
      'O RESOLVE é uma plataforma para registrar e acompanhar demandas urbanas. O órgão público responsável pela sua demanda é o controlador dos dados da ocorrência. A equipe do RESOLVE atua como operadora, tratando os dados conforme as instruções do órgão.',
    ],
  },
  {
    titulo: '2. Quais dados coletamos',
    paragrafos: [
      'Cadastro: nome, e-mail e senha (guardada apenas como hash, nunca em texto).',
      'Ocorrência: título, descrição, categoria, região, endereço, localização aproximada obtida pelo GPS (quando você permite), fotos e o histórico de andamento.',
      'Segurança: registros de login, logout, troca de senha e tentativas de acesso, com data, IP e aparelho. Esses registros não guardam senhas.',
    ],
  },
  {
    titulo: '3. Para que usamos',
    paragrafos: [
      'Os dados são usados para registrar a sua demanda, encaminhá-la ao órgão responsável, informar o andamento e produzir indicadores estatísticos sem identificar você. A base legal é a execução de políticas públicas (art. 7º, III, da LGPD).',
    ],
  },
  {
    titulo: '4. Com quem compartilhamos',
    paragrafos: [
      'Os dados da ocorrência (localização, fotos, categoria, status e o e-mail de quem registrou) são vistos pelo gestor do órgão responsável por aquela categoria. Esse perfil pode ser operado por servidores ou por empresas contratadas pelo órgão. Gestores de outros órgãos não têm acesso.',
      'Outros cidadãos veem apenas o problema e o andamento, sem o seu nome ou e-mail e com a localização menos precisa.',
    ],
  },
  {
    titulo: '5. Por quanto tempo guardamos',
    paragrafos: [
      'As ocorrências resolvidas são mantidas por até 5 anos após a conclusão, prazo em que o órgão ainda pode ser responsabilizado pelo atendimento. Depois disso, são apagadas. Registros de segurança são mantidos por até 12 meses.',
    ],
  },
  {
    titulo: '6. Seus direitos',
    paragrafos: [
      'Na tela "Meus dados" você pode ver os dados da sua conta, corrigir nome e e-mail, exportar uma cópia dos seus dados e excluir a conta. Ao excluir, o seu e-mail e as suas fotos são apagados e as ocorrências ficam sem ligação com você, pelo prazo de retenção acima.',
      `Para outros pedidos (bloqueio, anonimização, informação sobre compartilhamento ou revogação), escreva para ${CONTATO_PRIVACIDADE}.`,
    ],
  },
  {
    titulo: '7. Segurança',
    paragrafos: [
      'A sessão fica guardada no armazenamento seguro do aparelho (Keychain no iOS, Keystore no Android) e é apagada ao sair. A comunicação com o servidor é criptografada e os dados ficam em banco com acesso restrito.',
    ],
  },
];

export const TERMOS_DE_USO: SecaoTexto[] = [
  {
    titulo: '1. Uso da plataforma',
    paragrafos: [
      'O RESOLVE deve ser usado para relatar problemas urbanos reais, com informações verdadeiras. Não envie conteúdo ofensivo, que exponha pessoas ou que não tenha relação com a demanda.',
    ],
  },
  {
    titulo: '2. Sua conta',
    paragrafos: [
      'Você é responsável por manter a senha em segredo. Use uma senha forte, com pelo menos 12 caracteres, e não a compartilhe. Se perceber uso indevido, troque a senha na tela "Meus dados".',
    ],
  },
  {
    titulo: '3. Fotos e localização',
    paragrafos: [
      'Ao anexar uma foto ou permitir o GPS, você concorda que essas informações sejam usadas para identificar e resolver o problema. Evite fotografar rostos, placas e documentos.',
    ],
  },
  {
    titulo: '4. Andamento das demandas',
    paragrafos: [
      'O prazo de atendimento depende do órgão responsável. O RESOLVE registra e encaminha a demanda, mas não garante o prazo de resolução.',
    ],
  },
  {
    titulo: '5. Alterações',
    paragrafos: [
      'Estes termos e a Política de Privacidade podem mudar. Quando isso acontecer, o app pedirá um novo aceite.',
    ],
  },
];
