// Regras de e-mail compartilhadas pelo login, cadastro, confirmação, recuperação de senha e perfil.
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// O servidor compara e-mails em minúsculas e sem espaços nas pontas.
export function normalizarEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isEmailValido(email: string): boolean {
  return EMAIL_REGEX.test(normalizarEmail(email));
}
