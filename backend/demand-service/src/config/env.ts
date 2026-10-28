const SEGREDO_TESTE = 'segredo-somente-para-testes';

export function getJwtSecret(): string {
  const segredo = process.env.JWT_SECRET;
  if (segredo) return segredo;
  if (process.env.NODE_ENV === 'test') return SEGREDO_TESTE;
  throw new Error('JWT_SECRET não definido');
}

export function validarConfiguracao(): void {
  getJwtSecret();

  // Sem a chave o e-mail do solicitante não pode ser gravado nem lido, então em produção o serviço não sobe.
  if (process.env.NODE_ENV === 'production' && !process.env.DADOS_ENCRYPTION_KEY) {
    throw new Error('DADOS_ENCRYPTION_KEY não definida');
  }
}

export function isProducao(): boolean {
  return process.env.NODE_ENV === 'production';
}

export function retencaoAnos(): number {
  const valor = Number(process.env.RETENCAO_ANOS);
  return Number.isFinite(valor) && valor > 0 ? valor : 5;
}
