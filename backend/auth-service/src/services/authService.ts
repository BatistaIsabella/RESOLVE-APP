import { PrismaClient, Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const SECRET = process.env.JWT_SECRET || 'change-me';
const SALT_ROUNDS = 10;

function httpError(mensagem: string, status: number): Error & { status: number } {
  const err = new Error(mensagem) as Error & { status: number };
  err.status = status;
  return err;
}

export async function register(
  nome: string,
  email: string,
  senha: string,
  papel: 'cidadao' | 'gestor'
) {
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