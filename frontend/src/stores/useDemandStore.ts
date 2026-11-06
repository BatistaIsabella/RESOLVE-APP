import { create } from "zustand";
import {
  Demand,
  DemandFilters,
  DemandStatus,
  DemandPriority,
  DemandUpdateInput,
} from "@/types/demand";
import { demandService } from "@/Services/demandService";
import { metricsService } from "@/Services/metricsService";
import { ApiError } from "@/lib/api";
import { useAuthStore } from "@/stores/useAuthStore";

type ApiMetrics = { total: number; byCategory: Record<string, number>; byRegion: Record<string, number> };

interface DemandStore {
  demands: Demand[];
  filters: DemandFilters;
  selectedDemand: Demand | null;
  isLoading: boolean;
  error: string | null;
  apiMetrics: ApiMetrics | null;
  addDemand: (newDemand: Demand) => void;
  updateDemand: (id: string, updates: Partial<Demand>) => void;
  getDemandById: (id: string) => Demand | undefined;
  setSelectedDemand: (demand: Demand | null) => void;
  updateDemandStatus: (id: string, newStatus: DemandStatus) => Promise<void>;
  updateDemandPriority: (id: string, newPriority: DemandPriority) => Promise<void>;
  fetchDemands: () => Promise<void>;
  fetchMetrics: () => Promise<void>;
  fetchDemandById: (id: string) => Promise<Demand | null>;
  createDemand: (input: {
    titulo: string;
    categoria: Demand["category"];
    regiao: Demand["region"];
    descricao: string;
    endereco: string;
    prioridade?: DemandPriority;
    imagens?: string[];
  }) => Promise<Demand>;
  editDemand: (id: string, input: DemandUpdateInput) => Promise<Demand>;
  deleteDemand: (id: string) => Promise<void>;
  setFilters: (filters: Partial<DemandFilters>) => void;
  resetFilters: () => void;
  getFilteredDemands: () => Demand[];
  getDemandStats: () => {
    total: number;
    byCategory: Record<string, number>;
    byRegion: Record<string, number>;
  };
  reset: () => void;
}

const defaultFilters: DemandFilters = {
  status: "",
  category: "",
  region: "",
  priority: "",
};

const emptyData = {
  demands: [],
  filters: defaultFilters,
  selectedDemand: null,
  isLoading: false,
  error: null,
  apiMetrics: null,
};

function requireSession() {
  const session = useAuthStore.getState();
  if (!session.token) throw new ApiError("Usuário não autenticado", 401);
  return session;
}

export const useDemandStore = create<DemandStore>()((set, get) => ({
  ...emptyData,

  addDemand: (newDemand) =>
    set((state) => ({
      demands: [newDemand, ...state.demands],
    })),

  updateDemand: (id, updates) =>
    set((state) => ({
      demands: state.demands.map((d) => (d.id === id ? { ...d, ...updates } : d)),
      selectedDemand:
        state.selectedDemand?.id === id
          ? { ...state.selectedDemand, ...updates }
          : state.selectedDemand,
    })),

  getDemandById: (id) => get().demands.find((d) => d.id === id),

  setSelectedDemand: (demand) => set({ selectedDemand: demand }),

  updateDemandStatus: async (id, newStatus) => {
    const { role } = requireSession();

    const updated = await demandService.updateStatus(id, newStatus);
    get().updateDemand(id, { status: updated.status });
    if (role === "gestor") {
      await get().fetchMetrics();
    }
  },

  updateDemandPriority: async (id, newPriority) => {
    requireSession();

    const updated = await demandService.updatePriority(id, newPriority);
    get().updateDemand(id, { priority: updated.priority });
  },

  setFilters: (newFilters) =>
    set((state) => ({ filters: { ...state.filters, ...newFilters } })),

  resetFilters: () => set({ filters: defaultFilters }),

  getFilteredDemands: () => {
    const { demands, filters } = get();
    return demands.filter((d) => {
      if (filters.status && d.status !== filters.status) return false;
      if (filters.category && d.category !== filters.category) return false;
      if (filters.region && d.region !== filters.region) return false;
      if (filters.priority && d.priority !== filters.priority) return false;
      return true;
    });
  },

  getDemandStats: () => {
    const demands = get().getFilteredDemands();
    const byCategory: Record<string, number> = {};
    const byRegion: Record<string, number> = {};
    demands.forEach((d) => {
      byCategory[d.category] = (byCategory[d.category] || 0) + 1;
      byRegion[d.region] = (byRegion[d.region] || 0) + 1;
    });
    return { total: demands.length, byCategory, byRegion };
  },

  fetchDemands: async () => {
    const { token, role, userName } = useAuthStore.getState();
    if (!token || !role) {
      set({ error: "Faça login para visualizar suas denúncias" });
      return;
    }

    set({ isLoading: true, error: null });
    try {
      const demands =
        role === "gestor"
          ? await demandService.getAllForGestor()
          : await demandService.getMyDemands(userName ?? "");

      // Descarta a resposta se a sessão mudou (logout ou troca de conta) durante a requisição.
      if (useAuthStore.getState().token !== token) return;
      set({ demands, isLoading: false });
    } catch (err) {
      if (useAuthStore.getState().token !== token) return;
      const message = err instanceof ApiError ? err.message : "Erro ao carregar denúncias";
      set({ error: message, isLoading: false });
    }
  },

  fetchMetrics: async () => {
    const { token, role } = useAuthStore.getState();
    if (!token || role !== "gestor") return;

    try {
      const apiMetrics = await metricsService.getKpis();
      if (useAuthStore.getState().token !== token) return;
      set({ apiMetrics });
    } catch {
      if (useAuthStore.getState().token !== token) return;
      set({ apiMetrics: null });
    }
  },

  fetchDemandById: async (id) => {
    const { token, role, userName } = useAuthStore.getState();
    if (!token || !role) return null;

    set({ isLoading: true, error: null });
    try {
      const demand =
        role === "gestor"
          ? await demandService.getByIdForGestor(id)
          : await demandService.getById(id, userName ?? "");

      if (useAuthStore.getState().token !== token) return null;
      set((state) => ({
        demands: state.demands.some((d) => d.id === id)
          ? state.demands.map((d) => (d.id === id ? demand : d))
          : [demand, ...state.demands],
        selectedDemand: demand,
        isLoading: false,
      }));

      return demand;
    } catch (err) {
      if (useAuthStore.getState().token !== token) return null;
      const message = err instanceof ApiError ? err.message : "Erro ao carregar denúncia";
      set({ error: message, isLoading: false });
      return null;
    }
  },

  createDemand: async (input) => {
    const { userName, userEmail } = requireSession();

    const demand = await demandService.create(input, userName ?? userEmail ?? "");
    get().addDemand(demand);
    return demand;
  },

  editDemand: async (id, input) => {
    const { userName, userEmail } = requireSession();

    const updated = await demandService.update(id, input, userName ?? userEmail ?? "");
    // A resposta de edição não traz as fotos: preserva as já carregadas.
    const anterior = get().demands.find((d) => d.id === id);
    const merged =
      anterior && (updated.imagens?.length ?? 0) === 0
        ? { ...updated, imagens: anterior.imagens, fotoUrl: anterior.fotoUrl }
        : updated;
    get().updateDemand(id, merged);
    return merged;
  },

  deleteDemand: async (id) => {
    requireSession();

    await demandService.remove(id);
    set((state) => ({
      demands: state.demands.filter((d) => d.id !== id),
      selectedDemand: state.selectedDemand?.id === id ? null : state.selectedDemand,
    }));
  },

  reset: () => set({ ...emptyData }),
}));

// Dados de uma sessão não podem vazar para a seguinte: ao logar, sair ou trocar de conta, o store zera.
useAuthStore.subscribe((state, prev) => {
  if (state.token !== prev.token) useDemandStore.getState().reset();
});
