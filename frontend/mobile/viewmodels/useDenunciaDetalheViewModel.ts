import { useEffect } from 'react';
import { useRouter } from 'expo-router';

import { useAuth } from '@/hooks/useAuth';
import { useDemandContext } from '@/contexts/DemandContext';
import { useExcluirDenuncia } from '@/viewmodels/useExcluirDenuncia';

export function useDenunciaDetalheViewModel(id: string | undefined) {
  const router = useRouter();
  const { userName, logout } = useAuth();
  const fetchDemandById = useDemandContext((s) => s.fetchDemandById);
  const isLoading = useDemandContext((s) => s.loadingDetail);
  const error = useDemandContext((s) => s.detailError);

  const demand = useDemandContext((s) => s.demands.find((d) => d.id === id) ?? null);
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
