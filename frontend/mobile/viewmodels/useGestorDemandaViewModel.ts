import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';

import { useAuth } from '@/hooks/useAuth';
import { useDemandContext } from '@/contexts/DemandContext';
import { DemandStatus } from '@/types/demand';
import { formatPriorityLabel, parsePriorityLabel } from '@/utils/demandMapper';
import { getErrorMessage } from '@/lib/api';
import { useExcluirDenuncia } from '@/viewmodels/useExcluirDenuncia';

export function useGestorDemandaViewModel(id: string | undefined) {
  const router = useRouter();
  const { userName, signOut: handleLogout } = useAuth();

  const fetchDemandById = useDemandContext((s) => s.fetchDemandById);
  const updateDemandStatus = useDemandContext((s) => s.updateDemandStatus);
  const updateDemandPriority = useDemandContext((s) => s.updateDemandPriority);
  const isLoading = useDemandContext((s) => s.loadingDetail);
  const storeError = useDemandContext((s) => s.detailError);

  const demand = useDemandContext((s) => s.demands.find((d) => d.id === id) ?? null);
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
      setErro(getErrorMessage(err, 'Erro ao atualizar status'));
    }
  };

  const changePriority = async (value: string) => {
    if (!id || !demand) return;
    const priority = parsePriorityLabel(value);
    if (priority === demand.priority) return;
    setErro('');
    try {
      await updateDemandPriority(id, priority);
    } catch (err) {
      setErro(getErrorMessage(err, 'Erro ao atualizar prioridade'));
    }
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
