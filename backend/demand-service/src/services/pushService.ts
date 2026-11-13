import { StatusDenuncia } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { httpError } from '../utils/httpError';

const EXPO_PUSH_URL = process.env.EXPO_PUSH_URL ?? 'https://exp.host/--/api/v2/push/send';
const TEMPO_LIMITE_ENVIO_MS = 5000;

// Formato dos tokens emitidos pelo Expo: ExponentPushToken[xxxx] ou ExpoPushToken[xxxx].
const TOKEN_EXPO = /^Expo(nent)?PushToken\[[A-Za-z0-9_-]{10,}\]$/;

const ROTULO_STATUS: Record<StatusDenuncia, string> = {
  ABERTA: 'aberta',
  EM_ANALISE: 'em análise',
  RESOLVIDA: 'resolvida',
};

export function validarTokenPush(valor: unknown): string {
  if (typeof valor !== 'string' || !TOKEN_EXPO.test(valor.trim())) {
    throw httpError('token de notificação inválido', 400);
  }
  return valor.trim();
}

// Se o aparelho já estava registrado por outra conta (troca de login no mesmo celular), o token passa a valer só para a atual.
export async function registrarDispositivo(usuarioId: number, token: string) {
  await prisma.dispositivoPush.upsert({
    where: { token },
    update: { usuario_id: usuarioId },
    create: { usuario_id: usuarioId, token },
  });
}

export async function removerDispositivo(usuarioId: number, token: string) {
  await prisma.dispositivoPush.deleteMany({ where: { token, usuario_id: usuarioId } });
}

export async function removerDispositivosDoUsuario(usuarioId: number) {
  await prisma.dispositivoPush.deleteMany({ where: { usuario_id: usuarioId } });
}

interface MudancaDeStatus {
  cidadaoId: number;
  denunciaId: number;
  titulo: string;
  statusNovo: StatusDenuncia;
}

interface BilheteExpo {
  status: 'ok' | 'error';
  details?: { error?: string };
}

// Avisa o cidadão que o status da denúncia mudou. Nunca lança: a mudança de status já foi gravada
// e uma falha no push (Expo fora do ar, sem aparelho) não pode desfazê-la nem quebrar a resposta ao gestor.
export async function notificarMudancaStatus({ cidadaoId, denunciaId, titulo, statusNovo }: MudancaDeStatus) {
  try {
    const cidadao = await prisma.cidadao.findUnique({ where: { id_cidadao: cidadaoId } });
    // usuario_id negativo marca um titular que pediu a eliminação dos dados.
    if (!cidadao || cidadao.usuario_id <= 0) return;

    const dispositivos = await prisma.dispositivoPush.findMany({ where: { usuario_id: cidadao.usuario_id } });
    if (dispositivos.length === 0) return;

    const mensagens = dispositivos.map((d) => ({
      to: d.token,
      sound: 'default',
      title: 'Sua denúncia foi atualizada',
      body: `"${titulo}" agora está ${ROTULO_STATUS[statusNovo]}.`,
      data: { denunciaId, status: statusNovo },
    }));

    const resposta = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(mensagens),
      signal: AbortSignal.timeout(TEMPO_LIMITE_ENVIO_MS),
    });
    if (!resposta.ok) {
      console.error('[demand] Expo Push respondeu', resposta.status);
      return;
    }

    // Aparelho desinstalado ou token vencido: o Expo avisa, e o token é descartado para não insistir.
    const corpo = (await resposta.json()) as { data?: BilheteExpo[] };
    const invalidos = (corpo.data ?? []).flatMap((bilhete, i) =>
      bilhete.status === 'error' && bilhete.details?.error === 'DeviceNotRegistered' ? [dispositivos[i].token] : []
    );
    if (invalidos.length > 0) {
      await prisma.dispositivoPush.deleteMany({ where: { token: { in: invalidos } } });
    }
  } catch (err) {
    console.error('[demand] Falha ao enviar notificação push:', err);
  }
}
