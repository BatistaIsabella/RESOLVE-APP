import { useCallback, useEffect } from 'react';
import { useDemandStore } from '@/stores/useDemandStore';

/**
 * ViewModel das telas de detalhe (cidadão e gestor): busca a demanda e a lê
 * da lista do store — nada de cópia local, para o detalhe não divergir da
 * lista nem do otimismo das alterações.
 */
export function useDemandDetail(id: string | undefined) {
  const fetchDemandById = useDemandStore((s) => s.fetchDemandById);
  const isLoading = useDemandStore((s) => s.isLoadingDemand);
  const error = useDemandStore((s) => s.demandError);
  const demand = useDemandStore((s) => s.demands.find((d) => d.id === id) ?? null);

  const reload = useCallback(() => {
    if (id) fetchDemandById(id);
  }, [id, fetchDemandById]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { demand, isLoading, error, reload };
}
