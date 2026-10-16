import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import {
  Demand,
  DemandFilters,
  DemandPriority,
  DemandStatus,
  DemandUpdateInput,
  MetricsKpis,
} from '@/types/demand';
import { demandService } from '@/services/demandService';
import { metricsService } from '@/services/metricsService';
import { ApiError } from '@/lib/api';
import { getAuthSnapshot } from '@/lib/authToken';
import { useAuthContext } from '@/contexts/AuthContext';

export interface NovaDemandaInput {
  titulo: string;
  categoria: Demand['category'];
  regiao: Demand['region'];
  descricao: string;
  endereco: string;
  prioridade?: DemandPriority;
  imagemUri?: string | null;
}

interface DemandContextValue {
  demands: Demand[];
  filters: DemandFilters;
  metrics: MetricsKpis | null;
  loadingList: boolean;
  loadingMetrics: boolean;
  loadingDetail: boolean;
  saving: boolean;
  listError: string | null;
  metricsError: string | null;
  detailError: string | null;
  isLoading: boolean;
  error: string | null;
  fetchDemands: () => Promise<void>;
  fetchMetrics: () => Promise<void>;
  fetchDemandById: (id: string) => Promise<Demand | null>;
  createDemand: (input: NovaDemandaInput, onProgress?: (fracao: number) => void) => Promise<Demand>;
  updateDemandStatus: (id: string, status: DemandStatus) => Promise<void>;
  updateDemandPriority: (id: string, priority: DemandPriority) => Promise<void>;
  updateDemand: (id: string, input: DemandUpdateInput) => Promise<Demand>;
  deleteDemand: (id: string) => Promise<void>;
  setFilters: (filters: Partial<DemandFilters>) => void;
}

const DemandContext = createContext<DemandContextValue | null>(null);

const defaultFilters: DemandFilters = {
  status: '',
  category: '',
  region: '',
  priority: '',
  search: '',
};

function upsert(demands: Demand[], demand: Demand): Demand[] {
  const index = demands.findIndex((d) => d.id === demand.id);
  if (index === -1) return [demand, ...demands];
  const next = [...demands];
  next[index] = demand;
  return next;
}

function upsertMantendoFoto(demands: Demand[], updated: Demand): Demand[] {
  const anterior = demands.find((d) => d.id === updated.id);
  if (!anterior || updated.imagens.length > 0) return upsert(demands, updated);
  return upsert(demands, { ...updated, imagens: anterior.imagens, fotoUrl: anterior.fotoUrl });
}

function mensagem(err: unknown, padrao: string): string {
  return err instanceof ApiError ? err.message : padrao;
}

function mesmaSessao(token: string | null) {
  return getAuthSnapshot().token === token;
}

export function DemandProvider({ children }: { children: React.ReactNode }) {
  const { token } = useAuthContext();

  const [demands, setDemands] = useState<Demand[]>([]);
  const [filters, setFiltersState] = useState<DemandFilters>(defaultFilters);
  const [metrics, setMetrics] = useState<MetricsKpis | null>(null);
  const [loadingList, setLoadingList] = useState(false);
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [saving, setSaving] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [metricsError, setMetricsError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);

  const [tokenDosDados, setTokenDosDados] = useState(token);
  if (tokenDosDados !== token) {
    setTokenDosDados(token);
    setDemands([]);
    setFiltersState(defaultFilters);
    setMetrics(null);
    setLoadingList(false);
    setLoadingMetrics(false);
    setLoadingDetail(false);
    setSaving(false);
    setListError(null);
    setMetricsError(null);
    setDetailError(null);
  }

  const demandsRef = useRef(demands);
  const filtersRef = useRef(filters);
  const ultimaBusca = useRef(0);

  useEffect(() => {
    demandsRef.current = demands;
  }, [demands]);

  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

  const carregarLista = useCallback(async (mostrarLoading: boolean, search?: string) => {
    const busca = ++ultimaBusca.current;
    const { token: tokenInicial, role, userEmail } = getAuthSnapshot();
    if (mostrarLoading) {
      setLoadingList(true);
      setListError(null);
    }
    try {
      const options = { q: search ?? filtersRef.current.search };
      const lista =
        role === 'gestor'
          ? await demandService.getAllForGestor(options)
          : await demandService.getMyDemands(userEmail ?? '', options);
      if (busca !== ultimaBusca.current || !mesmaSessao(tokenInicial)) return;
      setDemands(lista);
      setListError(null);
    } catch (err) {
      if (busca !== ultimaBusca.current || !mesmaSessao(tokenInicial)) return;
      setListError(mensagem(err, 'Erro ao carregar demandas'));
    } finally {
      if (busca === ultimaBusca.current && mesmaSessao(tokenInicial)) setLoadingList(false);
    }
  }, []);

  const fetchDemands = useCallback(() => carregarLista(true), [carregarLista]);

  const fetchMetrics = useCallback(async () => {
    const tokenInicial = getAuthSnapshot().token;
    setLoadingMetrics(true);
    setMetricsError(null);
    try {
      const kpis = await metricsService.getKpis();
      if (!mesmaSessao(tokenInicial)) return;
      setMetrics(kpis);
    } catch (err) {
      if (!mesmaSessao(tokenInicial)) return;
      setMetricsError(mensagem(err, 'Erro ao carregar métricas'));
    } finally {
      if (mesmaSessao(tokenInicial)) setLoadingMetrics(false);
    }
  }, []);

  const fetchDemandById = useCallback(async (id: string) => {
    const { token: tokenInicial, role, userEmail } = getAuthSnapshot();
    setLoadingDetail(true);
    setDetailError(null);
    try {
      const demand =
        role === 'gestor'
          ? await demandService.getByIdForGestor(id)
          : await demandService.getById(id, userEmail ?? '');
      if (!mesmaSessao(tokenInicial)) return null;
      setDemands((atual) => upsert(atual, demand));
      return demand;
    } catch (err) {
      if (!mesmaSessao(tokenInicial)) return null;
      setDetailError(mensagem(err, 'Erro ao carregar demanda'));
      return null;
    } finally {
      if (mesmaSessao(tokenInicial)) setLoadingDetail(false);
    }
  }, []);

  const createDemand = useCallback(
    async (input: NovaDemandaInput, onProgress?: (fracao: number) => void) => {
      const { userEmail } = getAuthSnapshot();
      setSaving(true);
      try {
        const demand = await demandService.create(input, userEmail ?? '', onProgress);
        setDemands((atual) => [demand, ...atual]);
        return demand;
      } finally {
        setSaving(false);
      }
    },
    []
  );

  const atualizarComRollback = useCallback(
    async (id: string, otimista: Partial<Demand>, enviar: () => Promise<Demand>) => {
      const anterior = demandsRef.current.find((d) => d.id === id) ?? null;
      setDemands((atual) => atual.map((d) => (d.id === id ? { ...d, ...otimista } : d)));
      try {
        const updated = await enviar();
        setDemands((atual) => upsertMantendoFoto(atual, updated));
      } catch (err) {
        if (anterior) setDemands((atual) => upsert(atual, anterior));
        throw err;
      }
    },
    []
  );

  const updateDemandStatus = useCallback(
    (id: string, status: DemandStatus) =>
      atualizarComRollback(id, { status }, () => demandService.updateStatus(id, status)),
    [atualizarComRollback]
  );

  const updateDemandPriority = useCallback(
    (id: string, priority: DemandPriority) =>
      atualizarComRollback(id, { priority }, () => demandService.updatePriority(id, priority)),
    [atualizarComRollback]
  );

  const updateDemand = useCallback(async (id: string, input: DemandUpdateInput) => {
    const { userEmail } = getAuthSnapshot();
    const updated = await demandService.update(id, input, userEmail ?? '');
    setDemands((atual) => upsertMantendoFoto(atual, updated));
    return updated;
  }, []);

  const deleteDemand = useCallback(async (id: string) => {
    if (getAuthSnapshot().role === 'gestor') {
      await demandService.removeForGestor(id);
    } else {
      await demandService.remove(id);
    }
    setDemands((atual) => atual.filter((d) => d.id !== id));
  }, []);

  const setFilters = useCallback(
    (parcial: Partial<DemandFilters>) => {
      const anterior = filtersRef.current;
      const next = { ...anterior, ...parcial };
      filtersRef.current = next;
      setFiltersState(next);
      if ((next.search?.trim() ?? '') !== (anterior.search?.trim() ?? '')) {
        carregarLista(false, next.search);
      }
    },
    [carregarLista]
  );

  const value = useMemo<DemandContextValue>(
    () => ({
      demands,
      filters,
      metrics,
      loadingList,
      loadingMetrics,
      loadingDetail,
      saving,
      listError,
      metricsError,
      detailError,
      isLoading: loadingList || loadingMetrics || saving,
      error: listError ?? metricsError,
      fetchDemands,
      fetchMetrics,
      fetchDemandById,
      createDemand,
      updateDemandStatus,
      updateDemandPriority,
      updateDemand,
      deleteDemand,
      setFilters,
    }),
    [
      demands,
      filters,
      metrics,
      loadingList,
      loadingMetrics,
      loadingDetail,
      saving,
      listError,
      metricsError,
      detailError,
      fetchDemands,
      fetchMetrics,
      fetchDemandById,
      createDemand,
      updateDemandStatus,
      updateDemandPriority,
      updateDemand,
      deleteDemand,
      setFilters,
    ]
  );

  return <DemandContext.Provider value={value}>{children}</DemandContext.Provider>;
}

export function useDemandContext<T>(selector: (value: DemandContextValue) => T): T {
  const context = useContext(DemandContext);
  if (!context) {
    throw new Error('useDemandContext precisa estar dentro de <DemandProvider>');
  }
  return selector(context);
}
