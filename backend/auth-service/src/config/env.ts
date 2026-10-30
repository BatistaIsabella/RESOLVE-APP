// Configuração lida do ambiente. As funções leem process.env a cada chamada
// para que os testes consigam alterar valores sem recarregar módulos.

const SEGREDO_TESTE = 'segredo-somente-para-testes';

export function getJwtSecret(): string {
  const segredo = process.env.JWT_SECRET;
  if (segredo) return segredo;
  if (process.env.NODE_ENV === 'test') return SEGREDO_TESTE;
  throw new Error('JWT_SECRET não definido');
}

export function isProducao(): boolean {
  return process.env.NODE_ENV === 'production';
}

// A verificação em duas etapas vem desligada: sem MFA_HABILITADO=true ninguém consegue ativá-la
// e o app esconde a opção. Contas que já a tenham ativa continuam sendo desafiadas no login.
export function mfaHabilitada(): boolean {
  return process.env.MFA_HABILITADO === 'true';
}

// Confirmação de e-mail no cadastro. Vem desligada: com CONFIRMACAO_EMAIL_HABILITADA=true o cadastro passa a
// responder igual para qualquer e-mail (existente ou não) e a conta só entra depois de confirmar o código
// enviado por e-mail. Precisa de SMTP configurado.
export function confirmacaoEmailHabilitada(): boolean {
  return process.env.CONFIRMACAO_EMAIL_HABILITADA === 'true';
}

export function versaoTermosAtual(): string {
  return process.env.TERMOS_VERSAO || '1.0';
}

function numeroDoAmbiente(nome: string, padrao: number): number {
  const valor = Number(process.env[nome]);
  return Number.isFinite(valor) && valor > 0 ? valor : padrao;
}

export const config = {
  bcryptRounds: () => numeroDoAmbiente('BCRYPT_ROUNDS', 12),
  loginMaxFalhas: () => numeroDoAmbiente('LOGIN_MAX_FALHAS', 3),
  loginBloqueioMinutos: () => numeroDoAmbiente('LOGIN_BLOQUEIO_MINUTOS', 15),
  tokenRedefinicaoMinutos: () => numeroDoAmbiente('TOKEN_REDEFINICAO_MINUTOS', 30),
  tokenConfirmacaoHoras: () => numeroDoAmbiente('TOKEN_CONFIRMACAO_HORAS', 24),
  contaNaoConfirmadaDias: () => numeroDoAmbiente('CONTA_NAO_CONFIRMADA_DIAS', 3),
  logRetencaoDias: () => numeroDoAmbiente('LOG_RETENCAO_DIAS', 365),
  jwtExpiracao: () => process.env.JWT_EXPIRES_IN || '24h',
};

// Falha na inicialização do serviço quando algo essencial não está configurado.
export function validarConfiguracao(): void {
  getJwtSecret();

  // Sem estas chaves o e-mail não pode ser gravado nem buscado, então em produção o serviço não sobe.
  if (isProducao()) {
    for (const nome of ['DADOS_ENCRYPTION_KEY', 'EMAIL_HASH_KEY']) {
      if (!process.env[nome]) throw new Error(`${nome} não definida`);
    }
  }
}
