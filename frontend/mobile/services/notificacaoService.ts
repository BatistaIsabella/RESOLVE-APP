import { api } from '@/lib/api';

// Registro do aparelho para notificação push. O backend só aceita contas de cidadão,
// que são quem acompanha a mudança de status das próprias denúncias.
export const notificacaoService = {
  async registrar(token: string): Promise<void> {
    await api.post('/demands/devices', { token });
  },

  // O token da sessão vai à parte porque, ao sair, a sessão local já foi apagada quando o pedido é enviado.
  async remover(token: string, sessaoToken: string): Promise<void> {
    await api.delete('/demands/devices', {
      data: { token },
      headers: { Authorization: `Bearer ${sessaoToken}` },
    });
  },
};
