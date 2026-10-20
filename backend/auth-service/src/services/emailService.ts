import nodemailer from 'nodemailer';
import { isProducao } from '../config/env';

function smtpConfigurado(): boolean {
  return Boolean(process.env.SMTP_HOST);
}

function criarTransporte() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });
}

export async function enviarEmailRedefinicao(destino: string, token: string, validadeMinutos: number): Promise<void> {
  const link = `${process.env.APP_DEEPLINK ?? 'resolve://'}redefinir-senha?token=${encodeURIComponent(token)}`;

  if (!smtpConfigurado()) {
    if (isProducao()) {
      console.error('[auth] SMTP_HOST não configurado: e-mail de redefinição de senha não enviado');
    } else {
      // Só em desenvolvimento: sem SMTP o link aparece no console para permitir testar o fluxo.
      console.log(`[auth] (desenvolvimento) redefinição de senha para ${destino}: ${link}`);
    }
    return;
  }

  await criarTransporte().sendMail({
    from: process.env.SMTP_FROM ?? 'RESOLVE <nao-responda@resolve.app>',
    to: destino,
    subject: 'Redefinição de senha - RESOLVE',
    text: [
      'Recebemos um pedido para redefinir a senha da sua conta no RESOLVE.',
      '',
      `Abra este link no celular em que o app está instalado: ${link}`,
      '',
      `Se preferir, informe este código na tela "Redefinir senha" do app: ${token}`,
      '',
      `O código vale por ${validadeMinutos} minutos e só pode ser usado uma vez.`,
      'Se você não fez esse pedido, ignore este e-mail. Sua senha continua a mesma.',
    ].join('\n'),
  });
}
