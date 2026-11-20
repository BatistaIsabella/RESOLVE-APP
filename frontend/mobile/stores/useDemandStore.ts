import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  Demand,
  DemandFilters,
  DemandPriority,
  DemandStatus,
  MetricsKpis,
  NewDemandInput,
} from '@/types/demand';
import { demandService } from '@/services/demandService';
import { metricsService } from '@/services/metricsService';
import { ApiError, getErrorMessage } from '@/lib/api';
import { useAuthStore } from '@/stores/useAuthStore';
import { cacheStorage } from '@/lib/cacheStorage';

interface DemandStore {
  demands: Demand[];
  filters: DemandFilters;
  metrics: MetricsKpis | null;

  // Um estado de carregamento e de erro por operação. Com um só, a busca que
  // terminava primeiro desligava o loading da outra (o painel do gestor busca
  // lista e métricas em paralelo) e o erro do detalhe aparecia na lista.
  isLoadingDemands: boolean;
  demandsError: string | null;
  isLoadingMetrics: boolean;
  metricsError: string | null;
  isLoadingDemand: boolean;
  demandError: string | null;
  /** Criação ou alteração em andamento. O erro dessas ações é lançado para a tela. */
  isSaving: boolean;

  /** Última vez que a API respondeu com dados (ISO). Persistido com o cache. */
  lastSyncedAt: string | null;
  /** A última busca falhou por falta de rede e a tela está mostrando o cache. */
  isOffline: boolean;

  fetchDemands: () => Promise<void>;
  fetchMetrics: () => Promise<void>;
  fetchDemandById: (id: string) => Promise<Demand | null>;
  createDemand: (input: NewDemandInput) => Promise<Demand>;
  updateDemandStatus: (id: string, status: DemandStatus) => Promise<void>;
  updateDemandPriority: (id: string, priority: DemandPriority) => Promise<void>;
  setFilters: (filters: Partial<DemandFilters>) => void;
  resetFilters: () => void;
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

const initialRequestState = {
  isLoadingDemands: false,
  demandsError: null,
  isLoadingMetrics: false,
  metricsError: null,
  isLoadingDemand: false,
  demandError: null,
  isSaving: false,
  isOffline: false,
};

export const useDemandStore = create<DemandStore>()(
  persist(
    (set, get) => {
      /**
       * Alteração otimista: pinta na hora e desfaz se a API recusar. A tela lê
       * a lista e não precisa manter cópia própria para o rollback.
       */
      async function updateOptimistically(
        id: string,
        patch: Partial<Demand>,
        request: () => Promise<Demand>
      ) {
        const anterior = get().demands.find((d) => d.id === id) ?? null;
        set((state) => ({
          demands: state.demands.map((d) => (d.id === id ? { ...d, ...patch } : d)),
          isSaving: true,
        }));
        try {
          const updated = await request();
          set((state) => ({ demands: upsert(state.demands, updated) }));
        } catch (err) {
          set((state) => ({
            demands: anterior ? upsert(state.demands, anterior) : state.demands,
          }));
          throw err;
        } finally {
          set({ isSaving: false });
        }
      }

      return {
        demands: [],
        filters: defaultFilters,
        metrics: null,
        ...initialRequestState,
        lastSyncedAt: null,

        fetchDemands: async () => {
          const { role, userEmail } = useAuthStore.getState();
          set({ isLoadingDemands: true, demandsError: null });
          try {
            const demands =
              role === 'gestor'
                ? await demandService.getAllForGestor()
                : await demandService.getMyDemands(userEmail ?? '');
            set({ demands, isOffline: false, lastSyncedAt: new Date().toISOString() });
          } catch (err) {
            // Sem rede, mas com cache: a lista continua na tela e a View avisa
            // que é a cópia salva, em vez de mostrar erro.
            if (isNetworkError(err) && get().demands.length > 0) {
              set({ isOffline: true });
            } else {
              set({ demandsError: getErrorMessage(err, 'Erro ao carregar demandas.') });
            }
          } finally {
            set({ isLoadingDemands: false });
          }
        },

        fetchMetrics: async () => {
          set({ isLoadingMetrics: true, metricsError: null });
          try {
            const metrics = await metricsService.getKpis();
            set({ metrics, isOffline: false, lastSyncedAt: new Date().toISOString() });
          } catch (err) {
            if (isNetworkError(err) && get().metrics) {
              set({ isOffline: true });
            } else {
              set({ metricsError: getErrorMessage(err, 'Erro ao carregar métricas.') });
            }
          } finally {
            set({ isLoadingMetrics: false });
          }
        },

        fetchDemandById: async (id: string) => {
          const { role, userEmail } = useAuthStore.getState();
          set({ isLoadingDemand: true, demandError: null });
          try {
            const demand =
              role === 'gestor'
                ? await demandService.getByIdForGestor(id)
                : await demandService.getById(id, userEmail ?? '');
            set((state) => ({ demands: upsert(state.demands, demand), isOffline: false }));
            return demand;
          } catch (err) {
            const cached = get().demands.find((d) => d.id === id) ?? null;
            if (isNetworkError(err) && cached) {
              set({ isOffline: true });
              return cached;
            }
            set({ demandError: getErrorMessage(err, 'Erro ao carregar demanda.') });
            return null;
          } finally {
            set({ isLoadingDemand: false });
          }
        },

        createDemand: async (input) => {
          const { userEmail } = useAuthStore.getState();
          set({ isSaving: true });
          try {
            const demand = await demandService.create(input, userEmail ?? '');
            set((state) => ({ demands: [demand, ...state.demands] }));
            return demand;
          } finally {
            set({ isSaving: false });
          }
        },

        updateDemandStatus: (id, status) =>
          updateOptimistically(id, { status }, () => demandService.updateStatus(id, status)),

        updateDemandPriority: (id, priority) =>
          updateOptimistically(id, { priority }, () => demandService.updatePriority(id, priority)),

        setFilters: (filters) => set((state) => ({ filters: { ...state.filters, ...filters } })),

        resetFilters: () => set({ filters: defaultFilters }),

        clearCache: () => {
          set({
            demands: [],
            metrics: null,
            filters: defaultFilters,
            lastSyncedAt: null,
            ...initialRequestState,
          });
          useDemandStore.persist.clearStorage();
        },
      };
    },
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
