import { prisma } from '../lib/prisma';
import { emailEstaProtegido, protegerEmail } from '../utils/emailProtegido';

// Ocorrências criadas antes da criptografia têm o e-mail do solicitante em texto. Roda ao subir o serviço
// e é seguro repetir: só toca no que ainda não foi cifrado.
export async function migrarEmailsSolicitante(): Promise<number> {
  const pendentes = await prisma.denuncia.findMany({
    where: { email_solicitante_cifrado: { not: null }, NOT: { email_solicitante_cifrado: { startsWith: 'enc:v1:' } } },
    select: { id_denuncia: true, email_solicitante_cifrado: true },
  });

  let migrados = 0;
  for (const { id_denuncia, email_solicitante_cifrado } of pendentes) {
    if (!email_solicitante_cifrado || emailEstaProtegido(email_solicitante_cifrado)) continue;
    await prisma.denuncia.update({
      where: { id_denuncia },
      data: { email_solicitante_cifrado: protegerEmail(email_solicitante_cifrado) },
    });
    migrados++;
  }
  return migrados;
}
