import { Categorias, Regioes, NivelPrioridade } from '@prisma/client';
import * as repo from '../repositories/DenunciaRepository';
import { getRedisPublisher } from '../config/redis';

export type CreateDemandInput = {
  titulo: string;
  categoria: Categorias;
  regiao: Regioes;
  descricao: string;
  prioridade?: NivelPrioridade;
  endereco: string;
};

export async function createDemand(usuarioId: number, data: CreateDemandInput) {
  const cidadao = await repo.findOrCreateCidadao(usuarioId);

  const denuncia = await repo.createDenuncia({
    ...data,
    prioridade: data.prioridade ?? 'MEDIA',
    cidadaoId: cidadao.id_cidadao,
  });

  try {
    const redis = await getRedisPublisher();
    await redis.del('smartcity:metrics:kpis');
  } catch {
    // nao bloqueia a criacao se o Redis estiver indisponivel
  }

  return denuncia;
}