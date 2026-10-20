import app from './app';
import { config, validarConfiguracao } from './config/env';
import { removerEventosAntigos } from './services/auditoriaService';
import { removerTokensVencidos } from './services/recuperacaoSenhaService';
import { removerTentativasAntigas } from './services/tentativasLoginService';

validarConfiguracao();

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`auth-service rodando na porta ${PORT}`));

// Limpeza diária: registros de auditoria além do prazo de retenção, tokens vencidos e contadores antigos.
const UM_DIA_MS = 24 * 60 * 60 * 1000;

async function limpezaPeriodica() {
  try {
    const eventos = await removerEventosAntigos(config.logRetencaoDias());
    const tokens = await removerTokensVencidos();
    const tentativas = await removerTentativasAntigas();
    console.log(`[auth] Limpeza periódica: ${eventos} eventos, ${tokens} tokens, ${tentativas} contadores removidos`);
  } catch (err) {
    console.error('[auth] Falha na limpeza periódica:', (err as Error).message);
  }
}

setTimeout(limpezaPeriodica, 60 * 1000).unref();
setInterval(limpezaPeriodica, UM_DIA_MS).unref();
