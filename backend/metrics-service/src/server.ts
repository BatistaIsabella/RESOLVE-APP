import app from './app';
import { validarConfiguracao } from './config/env';
import { startMetricsCron } from './config/cron';
import { startEventSubscriber, startQueueWorker } from './workers/eventWorker';
import { refreshMetricsCache } from './services/metricsService';

validarConfiguracao();

const PORT = process.env.PORT || 3003;

async function bootstrap() {
  try {
    console.log('[metrics] 1 — startMetricsCron...');
    startMetricsCron();

    console.log('[metrics] 2 — startEventSubscriber...');
    await startEventSubscriber();

    console.log('[metrics] 3 — refreshMetricsCache...');
    try {
      await refreshMetricsCache();
      console.log('[metrics] Cache inicial de KPIs populado');
    } catch (err) {
      console.warn('[metrics] Cache inicial indisponível:', err);
    }

    console.log('[metrics] 4 — app.listen...');
    app.listen(PORT, () => {
      console.log(`metrics-service rodando na porta ${PORT}`);

      // inicia DEPOIS do servidor subir, não bloqueia o bootstrap
      console.log('[metrics] 5 — startQueueWorker...');
      startQueueWorker();
    });
  } catch (err) {
    console.error('[metrics] CRASH:', err);
    process.exit(1);
  }
}

bootstrap();
