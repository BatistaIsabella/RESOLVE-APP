import { prisma } from '../lib/prisma';
import { getRedisPublisher } from '../config/redis';
import { retencaoAnos } from '../config/env';
import { limparCacheMetricas } from '../utils/metricsCache';

// Denúncias resolvidas ficam guardadas por 5 anos (prazo de prescrição contra a Fazenda Pública).
// A data de conclusão só passou a ser gravada agora; para as resolvidas antes disso usa-se a última
// atualização do histórico (ou a data de registro).
export async function preencherDataConclusao(): Promise<number> {
  return prisma.$executeRaw`
    UPDATE "demand"."denuncias" d
    SET data_conclusao = COALESCE(
      (SELECT max(h.data_alteracao) FROM "demand"."historicos" h WHERE h.denuncia_id = d.id_denuncia),
      d.data_registro
    )
    WHERE d.status = 'RESOLVIDA' AND d.data_conclusao IS NULL
  `;
}

export async function executarRetencao(agora: Date = new Date(), anos: number = retencaoAnos()) {
  await preencherDataConclusao();

  const limite = new Date(agora);
  limite.setFullYear(limite.getFullYear() - anos);

  // Fotos e histórico saem junto (onDelete: Cascade no schema).
  const { count } = await prisma.denuncia.deleteMany({
    where: { status: 'RESOLVIDA', data_conclusao: { lt: limite } },
  });

  if (count > 0) {
    try {
      await limparCacheMetricas(await getRedisPublisher());
    } catch (err) {
      console.error('[demand] Falha ao invalidar cache de métricas após a retenção:', (err as Error).message);
    }
  }

  return { removidas: count, limite };
}
