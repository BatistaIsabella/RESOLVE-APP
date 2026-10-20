import { PrismaClient } from '@prisma/client';
import { config } from '../config/env';
import { hashIdentificador } from './auditoriaService';

const prisma = new PrismaClient();

const MS_MINUTO = 60 * 1000;

// A contagem vale por e-mail, inclusive e-mails que não existem. Assim a resposta
// de bloqueio é igual para qualquer conta e não revela quem está cadastrado.
export function chaveDoEmail(email: string): string {
  return hashIdentificador(email);
}

export async function bloqueadoAte(chave: string): Promise<Date | null> {
  const linha = await prisma.tentativaLogin.findUnique({ where: { chave } });
  if (!linha?.bloqueado_ate) return null;

  if (linha.bloqueado_ate.getTime() <= Date.now()) {
    await prisma.tentativaLogin.deleteMany({ where: { chave } });
    return null;
  }
  return linha.bloqueado_ate;
}

export async function registrarFalha(chave: string): Promise<{ bloqueado: boolean }> {
  const janela = config.loginBloqueioMinutos() * MS_MINUTO;
  const atual = await prisma.tentativaLogin.findUnique({ where: { chave } });

  // Só contam tentativas consecutivas dentro da janela; falhas antigas são esquecidas.
  const recomeca = !atual || Date.now() - atual.atualizado_em.getTime() > janela;
  const falhas = recomeca ? 1 : atual.falhas + 1;
  const bloquear = falhas >= config.loginMaxFalhas();

  const dados = {
    falhas: bloquear ? 0 : falhas,
    bloqueado_ate: bloquear ? new Date(Date.now() + janela) : null,
  };

  await prisma.tentativaLogin.upsert({
    where: { chave },
    create: { chave, ...dados },
    update: dados,
  });

  return { bloqueado: bloquear };
}

export async function limparTentativas(chave: string): Promise<void> {
  await prisma.tentativaLogin.deleteMany({ where: { chave } });
}

export async function removerTentativasAntigas(): Promise<number> {
  const limite = new Date(Date.now() - 24 * 60 * MS_MINUTO);
  const { count } = await prisma.tentativaLogin.deleteMany({ where: { atualizado_em: { lt: limite } } });
  return count;
}
