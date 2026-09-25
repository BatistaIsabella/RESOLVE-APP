import { PrismaClient, Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const SECRET = process.env.JWT_SECRET || 'change-me';
const SALT_ROUNDS = 10;

const DEV_GESTOR_ACCESS_CODE = 'change-me-codigo-gestor';

function httpError(mensagem: string, status: number): Error & { status: number } {
  const err = new Error(mensagem) as Error & { status: number };
  err.status = status;
  return err;
}

/**
 * Código esperado para criar conta de gestor.
 *
 * Sem a variável definida, só fora de produção cai no padrão. Em produção o
 * cadastro de gestor fica fechado em vez de aceitar um código que está
 * versionado neste repositório.
 */
function gestorAccessCode(): string | null {
  const code = process.env.GESTOR_ACCESS_CODE;
  if (code) return code;
  return process.env.NODE_ENV === 'production' ? null : DEV_GESTOR_ACCESS_CODE;
}

export async function register(
  nome: string,
  email: string,
  senha: string,
  papel: 'cidadao' | 'gestor',
  codigoAcesso?: string
) {
  // A regra fica aqui, e não no controller, para valer para qualquer caminho
  // que chegue ao cadastro.
  if (papel === 'gestor') {
    const esperado = gestorAccessCode();
    if (!esperado || codigoAcesso !== esperado) {
      throw httpError('Código de acesso de gestor inválido', 403);
    }
  }

  const hash = await bcrypt.hash(senha, SALT_ROUNDS);
  const papelEnum = papel.toUpperCase() as 'CIDADAO' | 'GESTOR';

  try {
    const usuario = await prisma.usuario.create({
      data: {
        nome,
        email,
        senha: hash,
        papel: papelEnum,
      },
    });

    return { id: usuario.id, nome: usuario.nome, email: usuario.email, papel };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw httpError('E-mail já cadastrado', 409);
    }
    throw err;
  }
}

export async function login(email: string, senha: string) {
  const usuario = await prisma.usuario.findUnique({ where: { email } });

  if (!usuario) {
    throw httpError('Credenciais inválidas', 401);
  }

  const senhaValida = await bcrypt.compare(senha, usuario.senha);

  if (!senhaValida) {
    throw httpError('Credenciais inválidas', 401);
  }

  const papel = usuario.papel.toLowerCase() as 'cidadao' | 'gestor';
  const token = jwt.sign({ userId: usuario.id, papel, email: usuario.email }, SECRET, { expiresIn: '24h' });

  return { token, papel, userId: usuario.id, nome: usuario.nome };
}