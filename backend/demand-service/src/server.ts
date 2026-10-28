import app from './app';
import { validarConfiguracao } from './config/env';
import { executarRetencao } from './jobs/retencao';
import { migrarEmailsSolicitante } from './services/migracaoEmailService';

validarConfiguracao();

const PORT = process.env.PORT || 3002;

migrarEmailsSolicitante()
  .then((total) => {
    if (total > 0) console.log(`[demand] ${total} e-mail(s) de solicitante migrado(s) para o formato cifrado`);
    app.listen(PORT, () => console.log(`demand-service rodando na porta ${PORT}`));
  })
  .catch((err) => {
    console.error('[demand] Falha ao migrar os e-mails para o formato cifrado:', (err as Error).message);
    process.exit(1);
  });

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
