import { useEffect } from 'react';
import { useRouter } from 'expo-router';

import { useAuth } from '@/hooks/useAuth';
import { useDemandStore } from '@/stores/useDemandStore';
import { useExcluirDenuncia } from '@/viewmodels/useExcluirDenuncia';

/**
 * ViewModel do detalhe da denúncia do cidadão (app/denuncias/[id].tsx):
 * busca a denúncia, diz se ela ainda pode ser alterada e expõe editar/excluir.
 */
export function useDenunciaDetalheViewModel(id: string | undefined) {
  const router = useRouter();
  const { userName, logout } = useAuth();
  const fetchDemandById = useDemandStore((s) => s.fetchDemandById);
  const isLoading = useDemandStore((s) => s.loadingDetail);
  const error = useDemandStore((s) => s.detailError);

  // Lida do store: nada de copia local, para a tela nao divergir da lista.
  const demand = useDemandStore((s) => s.demands.find((d) => d.id === id) ?? null);
  const { confirmarExclusao, excluindo, excluida, erroExclusao } = useExcluirDenuncia(
    id,
    '/denuncias'
  );

  useEffect(() => {
    if (id) {
      fetchDemandById(id);
    }
  }, [id, fetchDemandById]);

  const handleLogout = () => {
    logout();
    router.replace('/');
  };

  const editar = () => {
    if (demand) router.push(`/denuncias/editar/${demand.id}`);
  };

  return {
    userName,
    demand,
    error,
    showLoadingScreen: isLoading && !demand,
    // A API só aceita editar/excluir enquanto ninguém começou a analisar.
    podeAlterar: demand?.status === 'Aberta',

    excluida,
    excluindo,
    erroExclusao,
    confirmarExclusao,
    editar,

    goBack: () => router.back(),
    handleLogout,
  };
}
