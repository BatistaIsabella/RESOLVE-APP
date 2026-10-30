import cron from 'node-cron';
import { renovarCacheAposMudanca } from '../services/metricsService';

export function startMetricsCron() {
  cron.schedule('*/5 * * * *', async () => {
    try {
      await renovarCacheAposMudanca();
      console.log('[metrics] KPIs atualizados via cron');
    } catch (err) {
      console.error('[metrics] Erro no cron de KPIs:', err);
    }
  });
}
