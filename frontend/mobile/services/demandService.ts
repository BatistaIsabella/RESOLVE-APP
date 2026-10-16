import { api } from '@/lib/api';
import {
  ApiDenuncia,
  buildCreatePayload,
  buildUpdatePayload,
  mapDenunciaFromApi,
  mapDenunciasFromApi,
  mapPriorityToApi,
  mapStatusToApi,
} from '@/utils/demandMapper';
import {
  Demand,
  DemandCategory,
  DemandPriority,
  DemandRegion,
  DemandStatus,
  DemandUpdateInput,
} from '@/types/demand';
import { uriToBase64 } from '@/utils/imageUtils';

interface PaginatedResponse<T> {
  data: T[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export interface ListOptions {
  /** Busca no título ou na descrição (`?q=` da API). */
  q?: string;
}

function listParams({ q }: ListOptions) {
  const termo = q?.trim();
  return { page: 1, limit: 100, ...(termo ? { q: termo } : {}) };
}

export const demandService = {
  async getMyDemands(solicitante = '', options: ListOptions = {}): Promise<Demand[]> {
    const { data } = await api.get<PaginatedResponse<ApiDenuncia>>('/demands/my-demands', {
      params: listParams(options),
    });
    return mapDenunciasFromApi(data.data, solicitante);
  },

  async getAllForGestor(options: ListOptions = {}): Promise<Demand[]> {
    const { data } = await api.get<PaginatedResponse<ApiDenuncia>>('/demands/gestor', {
      params: listParams(options),
    });
    return mapDenunciasFromApi(data.data);
  },

  async getById(id: string, solicitante = ''): Promise<Demand> {
    const { data } = await api.get<ApiDenuncia>(`/demands/${id}`);
    return mapDenunciaFromApi(data, solicitante);
  },

  async getByIdForGestor(id: string): Promise<Demand> {
    const { data } = await api.get<ApiDenuncia>(`/demands/gestor/${id}`);
    return mapDenunciaFromApi(data);
  },

  async create(input: {
    titulo: string;
    categoria: DemandCategory;
    regiao: DemandRegion;
    descricao: string;
    endereco: string;
    prioridade?: DemandPriority;
    /** URI local da foto. A conversão para base64 acontece aqui, não na tela. */
    imagemUri?: string | null;
  }, solicitante = ''): Promise<Demand> {
    const imagens = input.imagemUri ? [await uriToBase64(input.imagemUri)] : undefined;
    const payload = buildCreatePayload({ ...input, imagens });
    const { data } = await api.post<ApiDenuncia>('/demands', payload);
    return mapDenunciaFromApi(data, solicitante);
  },

  /** Edição pelo cidadão dono; a API só aceita enquanto o status é ABERTA. */
  async update(id: string, input: DemandUpdateInput, solicitante = ''): Promise<Demand> {
    const { data } = await api.patch<ApiDenuncia>(`/demands/${id}`, buildUpdatePayload(input));
    return mapDenunciaFromApi(data, solicitante);
  },

  /** Cidadão remove a própria denúncia (só ABERTA). */
  async remove(id: string): Promise<void> {
    await api.delete(`/demands/${id}`);
  },

  /** Gestor remove qualquer denúncia. */
  async removeForGestor(id: string): Promise<void> {
    await api.delete(`/demands/gestor/${id}`);
  },

  async updateStatus(id: string, status: DemandStatus): Promise<Demand> {
    const { data } = await api.patch<{ denuncia: ApiDenuncia }>(`/demands/gestor/${id}/status`, {
      status: mapStatusToApi(status),
    });
    return mapDenunciaFromApi(data.denuncia);
  },

  async updatePriority(id: string, priority: DemandPriority): Promise<Demand> {
    const { data } = await api.patch<{ denuncia: ApiDenuncia }>(`/demands/gestor/${id}/prioridade`, {
      prioridade: mapPriorityToApi(priority),
    });
    return mapDenunciaFromApi(data.denuncia);
  },
};
