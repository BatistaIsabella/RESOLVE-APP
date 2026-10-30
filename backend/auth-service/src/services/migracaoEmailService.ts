import { prisma } from '../lib/prisma';
import { emailEstaProtegido, hashDoEmail, protegerEmail, revelarEmail } from '../utils/emailProtegido';

// Contas criadas antes da criptografia têm o e-mail em texto e não têm email_hash. Roda ao subir o
// serviço, antes de aceitar requisições, e é seguro repetir: só toca em quem ainda não foi migrado.
export async function migrarEmailsLegados(): Promise<number> {
  const pendentes = await prisma.usuario.findMany({
    where: { email_hash: null },
    select: { id: true, email_cifrado: true },
  });

  for (const { id, email_cifrado } of pendentes) {
    const email = revelarEmail(email_cifrado);
    await prisma.usuario.update({
      where: { id },
      data: { email_hash: hashDoEmail(email), email_cifrado: emailEstaProtegido(email_cifrado) ? email_cifrado : protegerEmail(email) },
    });
  }
  return pendentes.length;
}
