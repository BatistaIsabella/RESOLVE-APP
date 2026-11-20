import { api } from '@/lib/api';
import {
  ApiDenuncia,
  ApiPaginated,
  buildCreatePayload,
  mapDenunciaFromApi,
  mapDenunciasFromApi,
  mapPriorityToApi,
  mapStatusToApi,
} from '@/utils/demandMapper';
import { Demand, DemandPriority, DemandStatus, NewDemandInput } from '@/types/demand';
import { uriToBase64 } from '@/utils/imageUtils';

export const demandService = {
  async getMyDemands(solicitante = ''): Promise<Demand[]> {
    const { data } = await api.get<ApiPaginated<ApiDenuncia>>('/demands/my-demands?page=1&limit=100');
    return mapDenunciasFromApi(data.data, solicitante);
  },

  async getAllForGestor(): Promise<Demand[]> {
    const { data } = await api.get<ApiPaginated<ApiDenuncia>>('/demands/gestor?page=1&limit=100');
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

  async create(input: NewDemandInput, solicitante = ''): Promise<Demand> {
    const imagens = input.imagemUri ? [await uriToBase64(input.imagemUri)] : undefined;
    const payload = buildCreatePayload({ ...input, imagens });
    const { data } = await api.post<ApiDenuncia>('/demands', payload);
    return mapDenunciaFromApi(data, solicitante);
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
