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
  logRetencaoDias: () => numeroDoAmbiente('LOG_RETENCAO_DIAS', 365),
  jwtExpiracao: () => process.env.JWT_EXPIRES_IN || '24h',
};

// Falha na inicialização do serviço quando algo essencial não está configurado.
export function validarConfiguracao(): void {
  getJwtSecret();
}
