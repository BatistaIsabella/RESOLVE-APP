import { create } from 'zustand';
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
import { useAuthStore } from '@/stores/useAuthStore';
import { filterDemands } from '@/utils/demandFilters';

interface DemandState {
  demands: Demand[];
  filters: DemandFilters;
  metrics: MetricsKpis | null;

  // Cada operação tem o seu flag: o gestor carrega lista e métricas em
  // paralelo, e com um flag só quem terminava primeiro desligava o loading.
  loadingList: boolean;
  loadingMetrics: boolean;
  loadingDetail: boolean;
  /** Criação de denúncia em andamento. */
  saving: boolean;

  listError: string | null;
  metricsError: string | null;
  /** Erro ao abrir um detalhe; fica fora de `error` para não virar banner na lista. */
  detailError: string | null;

  /** Derivado: lista, métricas ou criação em andamento. Mantido para as telas que já o leem. */
  isLoading: boolean;
  /** Derivado: erro da lista ou das métricas (o banner das telas de lista). */
  error: string | null;
}

interface DemandStore extends DemandState {
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
  /** Cidadão edita a própria denúncia (só Aberta). */
  updateDemand: (id: string, input: DemandUpdateInput) => Promise<Demand>;
  /** Cidadão remove a própria (só Aberta); gestor remove qualquer uma. */
  deleteDemand: (id: string) => Promise<void>;
  setFilters: (filters: Partial<DemandFilters>) => void;
  resetFilters: () => void;
  getFilteredDemands: () => Demand[];
  /** Volta ao estado inicial. Chamado sozinho quando a sessão muda (ver o fim do arquivo). */
  reset: () => void;
}

function upsert(demands: Demand[], demand: Demand): Demand[] {
  const index = demands.findIndex((d) => d.id === demand.id);
  if (index === -1) return [demand, ...demands];
  const next = [...demands];
  next[index] = demand;
  return next;
}

/**
 * Substitui o item pela resposta da API sem perder a foto: respostas que vêm
 * sem `imagens` (versões antigas do PATCH de status/prioridade) mantêm as que
 * já estavam na lista.
 */
function upsertMantendoFoto(demands: Demand[], updated: Demand): Demand[] {
  const anterior = demands.find((d) => d.id === updated.id);
  if (!anterior || updated.imagens.length > 0) return upsert(demands, updated);
  return upsert(demands, { ...updated, imagens: anterior.imagens, fotoUrl: anterior.fotoUrl });
}

function mensagem(err: unknown, padrao: string): string {
  return err instanceof ApiError ? err.message : padrao;
}

const defaultFilters: DemandFilters = {
  status: '',
  category: '',
  region: '',
  priority: '',
  search: '',
};

const initialState: DemandState = {
  demands: [],
  filters: defaultFilters,
  metrics: null,
  loadingList: false,
  loadingMetrics: false,
  loadingDetail: false,
  saving: false,
  listError: null,
  metricsError: null,
  detailError: null,
  isLoading: false,
  error: null,
};

// Só a resposta da carga de lista mais recente entra no store: uma resposta
// lenta de uma busca antiga não pode sobrescrever o resultado da atual.
let ultimaBusca = 0;
// Muda a cada reset (troca de sessão): respostas que chegam depois disso são
// do usuário anterior e são descartadas.
let sessao = 0;

async function loadDemands(search: string | undefined): Promise<Demand[]> {
  const { role, userEmail } = useAuthStore.getState();
  const options = { q: search };
  return role === 'gestor'
    ? demandService.getAllForGestor(options)
    : demandService.getMyDemands(userEmail ?? '', options);
}

export const useDemandStore = create<DemandStore>((rawSet, get) => {
  // Todo set passa por aqui para recalcular `isLoading` e `error`.
  const set = (patch: Partial<DemandState> | ((state: DemandStore) => Partial<DemandState>)) =>
    rawSet((state) => {
      const parcial = typeof patch === 'function' ? patch(state) : patch;
      const next = { ...state, ...parcial };
      return {
        ...parcial,
        isLoading: next.loadingList || next.loadingMetrics || next.saving,
        error: next.listError ?? next.metricsError,
      };
    });

  const carregarLista = async (mostrarLoading: boolean) => {
    const busca = ++ultimaBusca;
    const sessaoAtual = sessao;
    if (mostrarLoading) set({ loadingList: true, listError: null });
    try {
      const demands = await loadDemands(get().filters.search);
      if (busca !== ultimaBusca || sessaoAtual !== sessao) return;
      set({ demands, loadingList: false, listError: null });
    } catch (err) {
      if (busca !== ultimaBusca || sessaoAtual !== sessao) return;
      set({ loadingList: false, listError: mensagem(err, 'Erro ao carregar demandas') });
    }
  };

  // Busca por texto vai para a API sem ligar o loading: as telas trocam a
  // lista inteira por um LoadingScreen quando ele liga, o que desmontaria o
  // campo de busca no meio da digitação. O filtro local já atualiza a lista.
  const refetchSearch = () => carregarLista(false);

  return {
    ...initialState,

    fetchDemands: () => carregarLista(true),

    fetchMetrics: async () => {
      const sessaoAtual = sessao;
      set({ loadingMetrics: true, metricsError: null });
      try {
        const metrics = await metricsService.getKpis();
        if (sessaoAtual !== sessao) return;
        set({ metrics, loadingMetrics: false });
      } catch (err) {
        if (sessaoAtual !== sessao) return;
        set({ loadingMetrics: false, metricsError: mensagem(err, 'Erro ao carregar métricas') });
      }
    },

    fetchDemandById: async (id: string) => {
      const { role, userEmail } = useAuthStore.getState();
      const sessaoAtual = sessao;
      set({ loadingDetail: true, detailError: null });
      try {
        const demand =
          role === 'gestor'
            ? await demandService.getByIdForGestor(id)
            : await demandService.getById(id, userEmail ?? '');
        if (sessaoAtual !== sessao) return null;
        set((state) => ({ demands: upsert(state.demands, demand), loadingDetail: false }));
        return demand;
      } catch (err) {
        if (sessaoAtual !== sessao) return null;
        set({ loadingDetail: false, detailError: mensagem(err, 'Erro ao carregar demanda') });
        return null;
      }
    },

    // Criar, mudar status/prioridade, editar e excluir não escrevem nos erros
    // do store: a falha é relançada e mostrada pela tela que chamou, em vez de
    // virar banner na lista.
    createDemand: async (input) => {
      const { userEmail } = useAuthStore.getState();
      set({ saving: true });
      try {
        const demand = await demandService.create(input, userEmail ?? '');
        set((state) => ({ demands: [demand, ...state.demands], saving: false }));
        return demand;
      } catch (err) {
        set({ saving: false });
        throw err;
      }
    },

    updateDemandStatus: async (id, status) => {
      const anterior = get().demands.find((d) => d.id === id) ?? null;
      // Pinta na hora e desfaz se a API recusar: a tela le a lista e nao precisa
      // manter copia propria para fazer rollback.
      set((state) => ({
        demands: state.demands.map((d) => (d.id === id ? { ...d, status } : d)),
      }));
      try {
        const updated = await demandService.updateStatus(id, status);
        set((state) => ({ demands: upsertMantendoFoto(state.demands, updated) }));
      } catch (err) {
        set((state) => ({
          demands: anterior ? upsert(state.demands, anterior) : state.demands,
        }));
        throw err;
      }
    },

    updateDemandPriority: async (id, priority) => {
      const anterior = get().demands.find((d) => d.id === id) ?? null;
      set((state) => ({
        demands: state.demands.map((d) => (d.id === id ? { ...d, priority } : d)),
      }));
      try {
        const updated = await demandService.updatePriority(id, priority);
        set((state) => ({ demands: upsertMantendoFoto(state.demands, updated) }));
      } catch (err) {
        set((state) => ({
          demands: anterior ? upsert(state.demands, anterior) : state.demands,
        }));
        throw err;
      }
    },

    updateDemand: async (id, input) => {
      const { userEmail } = useAuthStore.getState();
      const updated = await demandService.update(id, input, userEmail ?? '');
      set((state) => ({ demands: upsertMantendoFoto(state.demands, updated) }));
      return updated;
    },

    deleteDemand: async (id) => {
      const { role } = useAuthStore.getState();
      if (role === 'gestor') {
        await demandService.removeForGestor(id);
      } else {
        await demandService.remove(id);
      }
      set((state) => ({ demands: state.demands.filter((d) => d.id !== id) }));
    },

    setFilters: (filters) => {
      const searchAnterior = get().filters.search?.trim() ?? '';
      set((state) => ({ filters: { ...state.filters, ...filters } }));
      if ((get().filters.search?.trim() ?? '') !== searchAnterior) {
        refetchSearch();
      }
    },

    resetFilters: () => {
      const tinhaBusca = !!get().filters.search?.trim();
      set({ filters: defaultFilters });
      if (tinhaBusca) refetchSearch();
    },

    getFilteredDemands: () => {
      const { demands, filters } = get();
      return filterDemands(demands, filters);
    },

    reset: () => {
      sessao++;
      ultimaBusca++;
      rawSet(initialState);
    },
  };
});

// Sair (ou entrar com outra conta) troca o token: sem isto, a lista, as
// métricas e os filtros do usuário anterior continuavam aparecendo para o
// próximo. Fica aqui para não acoplar o useAuthStore a este store.
useAuthStore.subscribe((state, prev) => {
  if (state.token !== prev.token) {
    useDemandStore.getState().reset();
  }
});
