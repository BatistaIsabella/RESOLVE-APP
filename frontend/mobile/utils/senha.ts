export const SENHA_TAMANHO_MINIMO = 12;

export interface RequisitoSenha {
  id: string;
  texto: string;
  atendido: (senha: string) => boolean;
}

// Mesmas regras do auth-service. Servem para orientar quem digita; quem decide é o servidor,
// que também recusa senhas muito comuns ou que já apareceram em vazamentos.
export const REQUISITOS_SENHA: RequisitoSenha[] = [
  { id: 'tamanho', texto: `Pelo menos ${SENHA_TAMANHO_MINIMO} caracteres`, atendido: (s) => s.length >= SENHA_TAMANHO_MINIMO },
  { id: 'maiuscula', texto: 'Uma letra maiúscula', atendido: (s) => /[A-Z]/.test(s) },
  { id: 'minuscula', texto: 'Uma letra minúscula', atendido: (s) => /[a-z]/.test(s) },
  { id: 'numero', texto: 'Um número', atendido: (s) => /[0-9]/.test(s) },
  { id: 'especial', texto: 'Um caractere especial (ex.: ! @ # ?)', atendido: (s) => /[^A-Za-z0-9]/.test(s) },
];

export function senhaAtendeRequisitos(senha: string): boolean {
  return REQUISITOS_SENHA.every((r) => r.atendido(senha));
}

export function primeiroRequisitoPendente(senha: string): string | null {
  const pendente = REQUISITOS_SENHA.find((r) => !r.atendido(senha));
  return pendente ? `A senha precisa ter: ${pendente.texto.toLowerCase()}` : null;
}
