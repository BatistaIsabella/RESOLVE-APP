import app from './app';
import { config, validarConfiguracao } from './config/env';
import { removerEventosAntigos } from './services/auditoriaService';
import { removerContasNaoConfirmadas } from './services/confirmacaoEmailService';
import { removerTokensVencidos } from './services/recuperacaoSenhaService';
import { migrarEmailsLegados } from './services/migracaoEmailService';
import { removerTentativasAntigas } from './services/tentativasLoginService';

validarConfiguracao();

const PORT = process.env.PORT || 3001;

migrarEmailsLegados()
  .then((total) => {
    if (total > 0) console.log(`[auth] ${total} e-mail(s) migrado(s) para o formato cifrado`);
    app.listen(PORT, () => console.log(`auth-service rodando na porta ${PORT}`));
  })
  .catch((err) => {
    console.error('[auth] Falha ao migrar os e-mails para o formato cifrado:', (err as Error).message);
    process.exit(1);
  });

// Limpeza diária: registros de auditoria além do prazo de retenção, tokens vencidos e contadores antigos.
const UM_DIA_MS = 24 * 60 * 60 * 1000;

async function limpezaPeriodica() {
  try {
    const eventos = await removerEventosAntigos(config.logRetencaoDias());
    const tokens = await removerTokensVencidos();
    const tentativas = await removerTentativasAntigas();
    const contas = await removerContasNaoConfirmadas();
    console.log(`[auth] Limpeza periódica: ${eventos} eventos, ${tokens} tokens, ${tentativas} contadores, ${contas} contas não confirmadas removidos`);
  } catch (err) {
    console.error('[auth] Falha na limpeza periódica:', (err as Error).message);
  }
}

setTimeout(limpezaPeriodica, 60 * 1000).unref();
setInterval(limpezaPeriodica, UM_DIA_MS).unref();
