import { PrismaClient, Usuario } from '@prisma/client';
import { revelarEmail } from '../utils/emailProtegido';

// Cliente compartilhado. No banco o e-mail fica cifrado em `email_cifrado`; o campo `email`
// devolvido pelo cliente já vem decifrado, então o resto do código lê `usuario.email` normalmente.
// Para buscar por e-mail use `email_hash` (ver utils/emailProtegido.ts).
export const prisma = new PrismaClient().$extends({
  result: {
    usuario: {
      email: {
        needs: { email_cifrado: true },
        compute: (usuario) => revelarEmail(usuario.email_cifrado),
      },
    },
  },
});

export type UsuarioLegivel = Usuario & { email: string };
