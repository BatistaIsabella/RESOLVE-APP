import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';

import { useAuth } from '@/hooks/useAuth';
import { useDemandStore } from '@/stores/useDemandStore';
import { DemandPriority, DemandStatus } from '@/types/demand';
import { formatPriorityLabel } from '@/utils/demandMapper';
import { ApiError } from '@/lib/api';
import { useExcluirDenuncia } from '@/viewmodels/useExcluirDenuncia';

/**
 * ViewModel da tela de gerenciamento de uma demanda pelo gestor
 * (app/gestor/[id].tsx): busca a demanda, muda status e prioridade e exclui.
 */
export function useGestorDemandaViewModel(id: string | undefined) {
  const router = useRouter();
  const { userName, logout } = useAuth();

  const fetchDemandById = useDemandStore((s) => s.fetchDemandById);
  const updateDemandStatus = useDemandStore((s) => s.updateDemandStatus);
  const updateDemandPriority = useDemandStore((s) => s.updateDemandPriority);
  const isLoading = useDemandStore((s) => s.loadingDetail);
  const storeError = useDemandStore((s) => s.detailError);

  // Lida do store: o otimismo e o rollback vivem la, nao aqui.
  const demand = useDemandStore((s) => s.demands.find((d) => d.id === id) ?? null);
  const [erro, setErro] = useState('');
  const { confirmarExclusao, excluindo, excluida, erroExclusao } = useExcluirDenuncia(
    id,
    '/gestor'
  );

  useEffect(() => {
    if (id) {
      fetchDemandById(id);
    }
  }, [id, fetchDemandById]);

  const changeStatus = async (value: string) => {
    if (!id || !demand || value === demand.status) return;
    setErro('');
    try {
      await updateDemandStatus(id, value as DemandStatus);
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : 'Erro ao atualizar status');
    }
  };

  const changePriority = async (value: string) => {
    if (!id || !demand) return;
    const priority = (value === 'Média' ? 'Media' : value) as DemandPriority;
    if (priority === demand.priority) return;
    setErro('');
    try {
      await updateDemandPriority(id, priority);
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : 'Erro ao atualizar prioridade');
    }
  };

  const handleLogout = () => {
    logout();
    router.replace('/');
  };

  return {
    userName,
    demand,
    priorityLabel: demand ? formatPriorityLabel(demand.priority) : '',
    showLoadingScreen: isLoading && !demand,
    notFoundMessage: storeError ?? 'Demanda não encontrada.',
    erro,
    changeStatus,
    changePriority,

    excluida,
    excluindo,
    erroExclusao,
    confirmarExclusao,

    goBack: () => router.back(),
    handleLogout,
  };
}
