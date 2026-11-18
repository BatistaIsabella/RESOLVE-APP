// Receptor HTTP mínimo que imita o endpoint de envio do Expo Push, SOMENTE para o E2E.
//
// O demand-service envia as notificações com um POST para EXPO_PUSH_URL. No ambiente de
// teste essa variável aponta para este processo (ver backend/docker-compose.e2e.yml),
// o que permite ao Playwright conferir o que o serviço tentou enviar, sem depender do
// Expo real nem de um aparelho.
//
// Sem dependências (só node:http) e com estado apenas em memória: ao encerrar o processo
// as mensagens somem. Não é usado em produção e não faz parte de nenhum serviço.
//
// Endpoints:
//   POST   /push            recebe uma mensagem ou um array de mensagens (formato do Expo)
//   GET    /messages        lista as mensagens recebidas; ?to=<token> filtra por destinatário
//   DELETE /messages        limpa as mensagens; ?to=<token> limpa só as daquele destinatário
//   GET    /health          usado pelo healthcheck e pela checagem prévia do teste

import http from 'node:http';
import { randomUUID } from 'node:crypto';

const PORT = Number(process.env.PORT ?? 4010);
const LIMITE_CORPO_BYTES = 1_000_000;

/** @type {Array<{ to: string, title?: string, body?: string, data?: unknown, receivedAt: string }>} */
let mensagens = [];

// Registra no stdout (que o Compose guarda em stack-e2e.log) o que chegou, para diagnosticar falhas
// do teste. Não registra o corpo da mensagem (leva o título da demanda) e mascara o token do aparelho.
function mascarar(token) {
  if (typeof token !== 'string') return null;
  return token.length > 24 ? `${token.slice(0, 18)}…${token.slice(-4)}` : token;
}

function registrarNoLog(mensagem) {
  const resumo = {
    to: mascarar(mensagem?.to),
    title: typeof mensagem?.title === 'string' ? mensagem.title.slice(0, 80) : null,
    denunciaId: mensagem?.data?.denunciaId ?? null,
    status: mensagem?.data?.status ?? null,
  };
  // JSON em uma linha: escapa quebras de linha e mantém o log fácil de filtrar.
  console.log(`[expo-mock] mensagem recebida ${JSON.stringify(resumo)}`);
}

function responder(res, status, corpo) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(corpo === undefined ? undefined : JSON.stringify(corpo));
}

function lerCorpo(req) {
  return new Promise((resolve, reject) => {
    let total = 0;
    const partes = [];
    req.on('data', (parte) => {
      total += parte.length;
      if (total > LIMITE_CORPO_BYTES) {
        reject(new Error('corpo grande demais'));
        req.destroy();
        return;
      }
      partes.push(parte);
    });
    req.on('end', () => resolve(Buffer.concat(partes).toString('utf8')));
    req.on('error', reject);
  });
}

const servidor = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://expo-mock');
  const para = url.searchParams.get('to');

  if (req.method === 'GET' && url.pathname === '/health') {
    return responder(res, 200, { ok: true });
  }

  if (req.method === 'POST' && url.pathname === '/push') {
    let recebidas;
    try {
      const corpo = JSON.parse(await lerCorpo(req));
      recebidas = Array.isArray(corpo) ? corpo : [corpo];
    } catch {
      return responder(res, 400, { errors: [{ message: 'JSON inválido' }] });
    }
    const agora = new Date().toISOString();
    mensagens.push(...recebidas.map((mensagem) => ({ ...mensagem, receivedAt: agora })));
    recebidas.forEach(registrarNoLog);
    // Um bilhete "ok" por mensagem, no mesmo formato da resposta real do Expo.
    return responder(res, 200, { data: recebidas.map(() => ({ status: 'ok', id: randomUUID() })) });
  }

  if (req.method === 'GET' && url.pathname === '/messages') {
    return responder(res, 200, para ? mensagens.filter((m) => m.to === para) : mensagens);
  }

  if (req.method === 'DELETE' && url.pathname === '/messages') {
    mensagens = para ? mensagens.filter((m) => m.to !== para) : [];
    return responder(res, 204);
  }

  return responder(res, 404, { error: 'rota não encontrada' });
});

servidor.listen(PORT, '0.0.0.0', () => {
  console.log(`[expo-mock] ouvindo na porta ${PORT}`);
});

// Como PID 1 do container, o Node ignora SIGTERM se ninguém o tratar, e o "docker compose down"
// esperaria o prazo de cortesia antes de matar o processo. Aqui o servidor para de aceitar
// conexões, deixa terminar o que está em andamento e sai; o temporizador é só uma rede de segurança.
let encerrando = false;
function encerrar(sinal) {
  if (encerrando) return;
  encerrando = true;
  console.log(`[expo-mock] ${sinal} recebido, encerrando`);
  servidor.close(() => process.exit(0));
  servidor.closeIdleConnections();
  setTimeout(() => process.exit(0), 3000).unref();
}
process.on('SIGTERM', () => encerrar('SIGTERM'));
process.on('SIGINT', () => encerrar('SIGINT'));
