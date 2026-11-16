// Verificação D: os indicadores saem da base restaurada, sem depender do cache do Redis.
// Roda dentro do container do metrics-service (node - < verificar-metricas.cjs), com o Redis já
// esvaziado pelo rodar.sh, e chama a aggregateMetrics compilada do próprio serviço.
const { aggregateMetrics } = require('/app/dist/services/metricsService');
const { prisma } = require('/app/dist/lib/prisma');

function resultado(ok, mensagem) {
  console.log(mensagem);
  process.exitCode = ok ? 0 : 1;
}

async function main() {
  try {
    const [{ n }] = await prisma.$queryRaw`SELECT count(*)::int AS n FROM demand.denuncias`;
    const { total } = await aggregateMetrics();

    if (total <= 0) return resultado(false, `aggregateMetrics retornou total ${total}`);
    if (total !== n) return resultado(false, `aggregateMetrics retornou ${total}, mas a tabela tem ${n}`);
    resultado(true, `aggregateMetrics total ${total} = count(*) ${n}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((erro) => resultado(false, `erro inesperado: ${erro.message}`));
