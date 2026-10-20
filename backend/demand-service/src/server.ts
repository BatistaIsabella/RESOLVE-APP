import app from './app';
import { validarConfiguracao } from './config/env';
import { executarRetencao } from './jobs/retencao';

validarConfiguracao();

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => console.log(`demand-service rodando na porta ${PORT}`));

const UM_DIA_MS = 24 * 60 * 60 * 1000;

async function retencaoPeriodica() {
  try {
    const { removidas, limite } = await executarRetencao();
    console.log(`[demand] Retenção: ${removidas} denúncias resolvidas antes de ${limite.toISOString()} removidas`);
  } catch (err) {
    console.error('[demand] Falha na rotina de retenção:', (err as Error).message);
  }
}

setTimeout(retencaoPeriodica, 2 * 60 * 1000).unref();
setInterval(retencaoPeriodica, UM_DIA_MS).unref();
