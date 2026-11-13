import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';

import { useAuth } from '@/hooks/useAuth';
import { registrarDispositivo } from '@/lib/pushRegistration';
import { rotaDaNotificacao } from '@/utils/notificacaoRota';

// Notificações de status de denúncia: registra o aparelho do cidadão logado e leva à denúncia quando ele toca no aviso.
export function useNotificacoes() {
  const router = useRouter();
  const { token, role, termosPendentes, hasHydrated } = useAuth();

  const ativo = hasHydrated && !!token && role === 'cidadao' && !termosPendentes;

  useEffect(() => {
    if (ativo) registrarDispositivo();
  }, [ativo, token]);

  // Toque com o app aberto ou em segundo plano.
  useEffect(() => {
    if (!ativo) return;
    const assinatura = Notifications.addNotificationResponseReceivedListener((resposta) => {
      const rota = rotaDaNotificacao(resposta.notification.request.content.data);
      if (rota) router.push(rota as never);
    });
    return () => assinatura.remove();
  }, [ativo, router]);

  // Toque que abriu o app do zero.
  const ultimaResposta = Notifications.useLastNotificationResponse();
  useEffect(() => {
    if (!ativo || !ultimaResposta) return;
    const rota = rotaDaNotificacao(ultimaResposta.notification.request.content.data);
    if (rota) router.push(rota as never);
  }, [ativo, ultimaResposta, router]);
}
