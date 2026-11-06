import { apiFetch, DEMAND_API_URL } from '@/lib/api';
import {
  ApiDenuncia,
  buildCreatePayload,
  buildUpdatePayload,
  mapDenunciaFromApi,
  mapDenunciasFromApi,
  mapStatusToApi,
  mapPriorityToApi,
} from '@/utils/demandMapper';
import {
  Demand,
  DemandCategory,
  DemandPriority,
  DemandRegion,
  DemandStatus,
  DemandUpdateInput,
} from '@/types/demand';

interface PaginatedResponse<T> {
  data: T[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

// O token da sessão é anexado por apiFetch (lib/authToken), vindo do useAuthStore.
export const demandService = {
  async getMyDemands(solicitante = ''): Promise<Demand[]> {
    const res = await apiFetch<PaginatedResponse<ApiDenuncia>>(
      DEMAND_API_URL,
      '/feed?page=1&limit=100'
    );
    return mapDenunciasFromApi(res.data, solicitante);
  },

  async getAllForGestor(): Promise<Demand[]> {
    const res = await apiFetch<PaginatedResponse<ApiDenuncia>>(
      DEMAND_API_URL,
      '/gestor?page=1&limit=100'
    );
    return mapDenunciasFromApi(res.data);
  },

  async getById(id: string, solicitante = ''): Promise<Demand> {
    const data = await apiFetch<ApiDenuncia>(DEMAND_API_URL, `/${id}`);
    return mapDenunciaFromApi(data, solicitante);
  },

  async getByIdForGestor(id: string): Promise<Demand> {
    const data = await apiFetch<ApiDenuncia>(DEMAND_API_URL, `/gestor/${id}`);
    return mapDenunciaFromApi(data);
  },

  async create(
    input: {
      titulo: string;
      categoria: DemandCategory;
      regiao: DemandRegion;
      descricao: string;
      endereco: string;
      prioridade?: DemandPriority;
      imagens?: string[];
    },
    solicitante = ''
  ): Promise<Demand> {
    const data = await apiFetch<ApiDenuncia>(DEMAND_API_URL, '/', {
      method: 'POST',
      body: JSON.stringify(buildCreatePayload(input)),
    });
    return mapDenunciaFromApi(data, solicitante);
  },

  // Edição e exclusão da própria denúncia (o servidor só aceita enquanto ela está aberta).
  async update(id: string, input: DemandUpdateInput, solicitante = ''): Promise<Demand> {
    const data = await apiFetch<ApiDenuncia>(DEMAND_API_URL, `/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(buildUpdatePayload(input)),
    });
    return mapDenunciaFromApi(data, solicitante);
  },

  async remove(id: string): Promise<void> {
    await apiFetch<void>(DEMAND_API_URL, `/${id}`, { method: 'DELETE' });
  },

  async updateStatus(id: string, status: DemandStatus): Promise<Demand> {
    const result = await apiFetch<{ denuncia: ApiDenuncia }>(
      DEMAND_API_URL,
      `/gestor/${id}/status`,
      {
        method: 'PATCH',
        body: JSON.stringify({ status: mapStatusToApi(status) }),
      }
    );
    return mapDenunciaFromApi(result.denuncia);
  },

  async updatePriority(id: string, priority: DemandPriority): Promise<Demand> {
    const result = await apiFetch<{ denuncia: ApiDenuncia }>(
      DEMAND_API_URL,
      `/gestor/${id}/prioridade`,
      {
        method: 'PATCH',
        body: JSON.stringify({ prioridade: mapPriorityToApi(priority) }),
      }
    );
    return mapDenunciaFromApi(result.denuncia);
  },
};
