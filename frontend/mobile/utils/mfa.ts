// Mostra o segredo do autenticador em grupos de 4 letras, que é mais fácil de digitar à mão.
export function formatarSegredo(segredo: string): string {
  return segredo.replace(/\s/g, '').replace(/(.{4})/g, '$1 ').trim();
}

const CODIGO_APP = /^\d{6}$/;
const CODIGO_RECUPERACAO = /^[0-9a-f]{5}-?[0-9a-f]{5}$/i;

// O campo aceita o código de 6 dígitos do app autenticador ou um código de recuperação (xxxxx-xxxxx).
export function codigoMfaValido(texto: string): boolean {
  const limpo = texto.trim();
  return CODIGO_APP.test(limpo) || CODIGO_RECUPERACAO.test(limpo);
}

export function codigoDoAppValido(texto: string): boolean {
  return CODIGO_APP.test(texto.trim());
}
