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

async function entregar(destino: string, assunto: string, linhas: string[], rotuloDev: string, linkDev?: string) {
  if (!smtpConfigurado()) {
    if (isProducao()) {
      console.error(`[auth] SMTP_HOST não configurado: e-mail "${assunto}" não enviado`);
    } else {
      // Só em desenvolvimento: sem SMTP o conteúdo aparece no console para permitir testar o fluxo.
      console.log(`[auth] (desenvolvimento) ${rotuloDev} para ${destino}${linkDev ? `: ${linkDev}` : ''}`);
    }
    return;
  }

  await criarTransporte().sendMail({
    from: process.env.SMTP_FROM ?? 'RESOLVE <nao-responda@resolve.app>',
    to: destino,
    subject: assunto,
    text: linhas.join('\n'),
  });
}

export async function enviarEmailConfirmacao(destino: string, token: string, validadeHoras: number): Promise<void> {
  const link = `${process.env.APP_DEEPLINK ?? 'resolve://'}confirmar-email?token=${encodeURIComponent(token)}`;

  await entregar(
    destino,
    'Confirme seu e-mail - RESOLVE',
    [
      'Recebemos um cadastro no RESOLVE com este e-mail.',
      '',
      `Abra este link no celular em que o app está instalado: ${link}`,
      '',
      `Se preferir, informe este código na tela "Confirmar e-mail" do app: ${token}`,
      '',
      `O código vale por ${validadeHoras} horas e só pode ser usado uma vez.`,
      'Se você não fez esse cadastro, ignore este e-mail. Nenhuma conta será ativada.',
    ],
    'confirmação de e-mail',
    link
  );
}

// Enviado quando alguém tenta cadastrar um e-mail que já tem conta. A tela do cadastro responde igual
// nos dois casos, então é por aqui que a pessoa dona do e-mail fica sabendo.
export async function enviarEmailContaExistente(destino: string): Promise<void> {
  await entregar(
    destino,
    'Cadastro no RESOLVE - você já tem uma conta',
    [
      'Recebemos um pedido de cadastro no RESOLVE com este e-mail, mas ele já tem uma conta.',
      '',
      'Se foi você, entre normalmente. Se esqueceu a senha, use "Esqueci minha senha" na tela de login.',
      'Se não foi você, ignore este e-mail. Sua conta e sua senha continuam as mesmas.',
    ],
    'aviso de conta existente'
  );
}
