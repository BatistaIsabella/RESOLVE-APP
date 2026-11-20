import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Demand, DemandFilters, DemandPriority, DemandStatus, MetricsKpis } from '@/types/demand';
import { demandService } from '@/services/demandService';
import { metricsService } from '@/services/metricsService';
import { ApiError } from '@/lib/api';
import { useAuthStore } from '@/stores/useAuthStore';
import { filterDemands } from '@/utils/demandFilters';
import { cacheStorage } from '@/lib/cacheStorage';

interface DemandStore {
  demands: Demand[];
  filters: DemandFilters;
  metrics: MetricsKpis | null;
  isLoading: boolean;
  error: string | null;
  /** Última vez que a API respondeu com dados (ISO). Persistido com o cache. */
  lastSyncedAt: string | null;
  /** A última busca falhou por falta de rede e a tela está mostrando o cache. */
  isOffline: boolean;
  fetchDemands: () => Promise<void>;
  fetchMetrics: () => Promise<void>;
  fetchDemandById: (id: string) => Promise<Demand | null>;
  createDemand: (input: {
    titulo: string;
    categoria: Demand['category'];
    regiao: Demand['region'];
    descricao: string;
    endereco: string;
    prioridade?: DemandPriority;
    imagemUri?: string | null;
  }) => Promise<Demand>;
  updateDemandStatus: (id: string, status: DemandStatus) => Promise<void>;
  updateDemandPriority: (id: string, priority: DemandPriority) => Promise<void>;
  setFilters: (filters: Partial<DemandFilters>) => void;
  resetFilters: () => void;
  getFilteredDemands: () => Demand[];
  clearCache: () => void;
}

/** status 0 = a requisição não chegou ao servidor (sem rede ou timeout). */
function isNetworkError(err: unknown): boolean {
  return err instanceof ApiError && err.status === 0;
}

function upsert(demands: Demand[], demand: Demand): Demand[] {
  const index = demands.findIndex((d) => d.id === demand.id);
  if (index === -1) return [demand, ...demands];
  const next = [...demands];
  next[index] = demand;
  return next;
}

const defaultFilters: DemandFilters = {
  status: '',
  category: '',
  region: '',
  priority: '',
};

export const useDemandStore = create<DemandStore>()(
  persist(
    (set, get) => ({
      demands: [],
      filters: defaultFilters,
      metrics: null,
      isLoading: false,
      error: null,
      lastSyncedAt: null,
      isOffline: false,

      fetchDemands: async () => {
        const { role, userEmail } = useAuthStore.getState();
        set({ isLoading: true, error: null });
        try {
          const demands =
            role === 'gestor'
              ? await demandService.getAllForGestor()
              : await demandService.getMyDemands(userEmail ?? '');
          set({ demands, isLoading: false, isOffline: false, lastSyncedAt: new Date().toISOString() });
        } catch (err) {
          // Sem rede, mas com cache: a lista continua na tela e a View avisa que
          // é a cópia salva, em vez de mostrar erro.
          if (isNetworkError(err) && get().demands.length > 0) {
            set({ isLoading: false, isOffline: true });
            return;
          }
          const message = err instanceof ApiError ? err.message : 'Erro ao carregar demandas';
          set({ isLoading: false, error: message });
        }
      },

      fetchMetrics: async () => {
        set({ isLoading: true, error: null });
        try {
          const metrics = await metricsService.getKpis();
          set({ metrics, isLoading: false, isOffline: false, lastSyncedAt: new Date().toISOString() });
        } catch (err) {
          if (isNetworkError(err) && get().metrics) {
            set({ isLoading: false, isOffline: true });
            return;
          }
          const message = err instanceof ApiError ? err.message : 'Erro ao carregar métricas';
          set({ isLoading: false, error: message });
        }
      },

      fetchDemandById: async (id: string) => {
        const { role, userEmail } = useAuthStore.getState();
        set({ isLoading: true, error: null });
        try {
          const demand =
            role === 'gestor'
              ? await demandService.getByIdForGestor(id)
              : await demandService.getById(id, userEmail ?? '');
          set((state) => ({ demands: upsert(state.demands, demand), isLoading: false, isOffline: false }));
          return demand;
        } catch (err) {
          const cached = get().demands.find((d) => d.id === id) ?? null;
          if (isNetworkError(err) && cached) {
            set({ isLoading: false, isOffline: true });
            return cached;
          }
          const message = err instanceof ApiError ? err.message : 'Erro ao carregar demanda';
          set({ isLoading: false, error: message });
          return null;
        }
      },

      createDemand: async (input) => {
        const { userEmail } = useAuthStore.getState();
        set({ isLoading: true, error: null });
        try {
          const demand = await demandService.create(input, userEmail ?? '');
          set((state) => ({ demands: [demand, ...state.demands], isLoading: false }));
          return demand;
        } catch (err) {
          const message = err instanceof ApiError ? err.message : 'Erro ao criar demanda';
          set({ isLoading: false, error: message });
          throw err;
        }
      },

      updateDemandStatus: async (id, status) => {
        const anterior = get().demands.find((d) => d.id === id) ?? null;
        // Pinta na hora e desfaz se a API recusar: a tela le a lista e nao precisa
        // manter copia propria para fazer rollback.
        set((state) => ({
          demands: state.demands.map((d) => (d.id === id ? { ...d, status } : d)),
          error: null,
        }));
        try {
          const updated = await demandService.updateStatus(id, status);
          set((state) => ({ demands: upsert(state.demands, updated) }));
        } catch (err) {
          const message = err instanceof ApiError ? err.message : 'Erro ao atualizar status';
          set((state) => ({
            demands: anterior ? upsert(state.demands, anterior) : state.demands,
            error: message,
          }));
          throw err;
        }
      },

      updateDemandPriority: async (id, priority) => {
        const anterior = get().demands.find((d) => d.id === id) ?? null;
        set((state) => ({
          demands: state.demands.map((d) => (d.id === id ? { ...d, priority } : d)),
          error: null,
        }));
        try {
          const updated = await demandService.updatePriority(id, priority);
          set((state) => ({ demands: upsert(state.demands, updated) }));
        } catch (err) {
          const message = err instanceof ApiError ? err.message : 'Erro ao atualizar prioridade';
          set((state) => ({
            demands: anterior ? upsert(state.demands, anterior) : state.demands,
            error: message,
          }));
          throw err;
        }
      },

      setFilters: (filters) => set((state) => ({ filters: { ...state.filters, ...filters } })),

      resetFilters: () => set({ filters: defaultFilters }),

      getFilteredDemands: () => {
        const { demands, filters } = get();
        return filterDemands(demands, filters);
      },

      clearCache: () => {
        set({
          demands: [],
          metrics: null,
          filters: defaultFilters,
          lastSyncedAt: null,
          isOffline: false,
          error: null,
        });
        useDemandStore.persist.clearStorage();
      },
    }),
    {
      name: 'resolve-mobile-demands',
      version: 1,
      storage: createJSONStorage(() => cacheStorage),
      // Só o que veio da API. Filtros, loading e erro são da sessão de uso.
      partialize: (state) => ({
        demands: state.demands,
        metrics: state.metrics,
        lastSyncedAt: state.lastSyncedAt,
      }),
      // A leitura do disco é assíncrona: se a API responder antes dela
      // terminar, o dado da rede é mais novo e não pode ser sobrescrito.
      merge: (persisted, current) => {
        const saved = persisted as Partial<DemandStore> | undefined;
        if (!saved) return current;
        const currentIsNewer =
          current.lastSyncedAt !== null &&
          (!saved.lastSyncedAt || current.lastSyncedAt >= saved.lastSyncedAt);
        return currentIsNewer ? current : { ...current, ...saved };
      },
    }
  )
);

// O cache é do usuário logado: ao sair (ou ao expirar a sessão, que chama
// logout no 401), apaga-se da memória e do disco, para o próximo usuário do
// aparelho não ver as demandas de outro.
useAuthStore.subscribe((state, prev) => {
  if (prev.token && !state.token) {
    useDemandStore.getState().clearCache();
  }
});
