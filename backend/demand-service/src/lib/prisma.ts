import { PrismaClient } from '@prisma/client';
import { revelarEmail } from '../utils/emailProtegido';

// No banco o e-mail do solicitante fica cifrado em `email_solicitante_cifrado`; o campo `email_solicitante`
// devolvido pelo cliente já vem decifrado. Para gravar, use `email_solicitante_cifrado` com `protegerEmail`.
export const prisma = new PrismaClient().$extends({
  result: {
    denuncia: {
      email_solicitante: {
        needs: { email_solicitante_cifrado: true },
        compute: (denuncia) =>
          denuncia.email_solicitante_cifrado ? revelarEmail(denuncia.email_solicitante_cifrado) : null,
      },
    },
  },
});
