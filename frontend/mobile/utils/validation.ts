import { UserRole } from '@/types/auth';

/**
 * Regras de validação dos formulários. Funções puras: a tela só chama e pinta
 * a mensagem embaixo do campo.
 *
 * Os limites espelham o backend, para o erro aparecer no campo e não voltar
 * do servidor como "Erro interno": o e-mail é VarChar(35) e o nome VarChar(100)
 * no auth-service, e o título VarChar(50) no demand-service. O mínimo de
 * senha e os limites de descrição são regra do app, não do banco.
 */
export type FieldErrors<F extends string> = Partial<Record<F, string>>;

export const LIMITES = {
  nome: 100,
  email: 35,
  senhaMin: 6,
  titulo: 50,
  descricaoMin: 10,
  descricao: 1000,
} as const;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function hasErrors(errors: FieldErrors<string>): boolean {
  return Object.values(errors).some(Boolean);
}

function validateEmail(email: string): string | undefined {
  const value = email.trim();
  if (!value) return 'Informe o e-mail.';
  if (!EMAIL_REGEX.test(value)) return 'Digite um e-mail válido.';
  if (value.length > LIMITES.email) return `O e-mail deve ter no máximo ${LIMITES.email} caracteres.`;
  return undefined;
}

export function validateLogin(values: { email: string; senha: string }): FieldErrors<'email' | 'senha'> {
  return {
    email: validateEmail(values.email),
    senha: values.senha ? undefined : 'Informe a senha.',
  };
}

export type CadastroField = 'nome' | 'email' | 'senha' | 'confirmarSenha' | 'codigoAcesso';

export function validateCadastro(values: {
  nome: string;
  email: string;
  senha: string;
  confirmarSenha: string;
  papel: UserRole;
  codigoAcesso: string;
}): FieldErrors<CadastroField> {
  const nome = values.nome.trim();
  return {
    nome: !nome
      ? 'Informe seu nome.'
      : nome.length > LIMITES.nome
        ? `O nome deve ter no máximo ${LIMITES.nome} caracteres.`
        : undefined,
    email: validateEmail(values.email),
    senha: !values.senha
      ? 'Informe uma senha.'
      : values.senha.length < LIMITES.senhaMin
        ? `A senha deve ter pelo menos ${LIMITES.senhaMin} caracteres.`
        : undefined,
    confirmarSenha: !values.confirmarSenha
      ? 'Confirme a senha.'
      : values.confirmarSenha !== values.senha
        ? 'As senhas não coincidem.'
        : undefined,
    codigoAcesso:
      values.papel === 'gestor' && !values.codigoAcesso.trim()
        ? 'Informe o código de acesso de gestor.'
        : undefined,
  };
}

export type DemandStep = 'foto' | 'categoria' | 'localizacao' | 'descricao';
export type DemandField = 'categoria' | 'problema' | 'regiao' | 'endereco' | 'descricao';

/** Valida só os campos do passo atual do assistente de nova denúncia. */
export function validateDemandStep(
  step: DemandStep,
  values: { categoria: string; problema: string; regiao: string; endereco: string; descricao: string }
): FieldErrors<DemandField> {
  switch (step) {
    case 'categoria':
      return {
        categoria: values.categoria ? undefined : 'Selecione a categoria.',
        problema: !values.problema
          ? 'Selecione o problema.'
          : values.problema.length > LIMITES.titulo
            ? `O título deve ter no máximo ${LIMITES.titulo} caracteres.`
            : undefined,
        regiao: values.regiao ? undefined : 'Selecione a região.',
      };
    case 'localizacao':
      return {
        endereco: values.endereco.trim() ? undefined : 'Informe ou capture o endereço.',
      };
    case 'descricao': {
      const descricao = values.descricao.trim();
      return {
        descricao: !descricao
          ? 'Descreva o problema.'
          : descricao.length < LIMITES.descricaoMin
            ? `Descreva com pelo menos ${LIMITES.descricaoMin} caracteres.`
            : descricao.length > LIMITES.descricao
              ? `A descrição deve ter no máximo ${LIMITES.descricao} caracteres.`
              : undefined,
      };
    }
    default:
      return {};
  }
}
