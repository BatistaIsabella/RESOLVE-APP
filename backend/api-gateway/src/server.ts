import 'dotenv/config';
import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import rateLimit from 'express-rate-limit';

const app = express();

const AUTH_URL = process.env.AUTH_SERVICE_URL ?? 'http://auth-service:3001';
const DEMAND_URL = process.env.DEMAND_SERVICE_URL ?? 'http://demand-service:3002';
const METRICS_URL = process.env.METRICS_SERVICE_URL ?? 'http://metrics-service:3003';

// Atrás do Cloudflare/proxy, o IP real do cliente vem em X-Forwarded-For.
app.set('trust proxy', Number(process.env.TRUST_PROXY ?? 1));

// O app mobile não depende de CORS. Origens só são liberadas se configuradas.
const origensPermitidas = (process.env.CORS_ORIGINS ?? '').split(',').map((o) => o.trim()).filter(Boolean);

app.use((req, res, next) => {
  const origem = req.headers.origin;
  if (origem && origensPermitidas.includes(origem)) {
    res.header('Access-Control-Allow-Origin', origem);
    res.header('Vary', 'Origin');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS');
  }
  next();
});

app.options('*', (_req, res) => res.sendStatus(204));

// Rate Limiter para segurança da API
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: Number(process.env.RATE_LIMIT_MAX ?? 5000),
    standardHeaders: true,
    legacyHeaders: false,
  })
);

// Limite mais curto para as rotas de autenticação (login, cadastro, recuperação de senha).
// O bloqueio por conta, depois de 3 falhas, fica no auth-service.
const limiteAuth = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.AUTH_RATE_LIMIT_MAX ?? 100),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas requisições. Tente novamente em alguns minutos.' },
});

// Função auxiliar modificada para testar a saúde dos microsserviços usando os caminhos corretos
async function checkService(name: string, url: string) {
  try {
    // Voltando para o /health seco, já que o microsserviço não usa prefixo interno
    const res = await fetch(`${url}/health`);
    return { name, status: res.ok ? 'ok' : 'error', code: res.status };
  } catch {
    return { name, status: 'error', code: 503 };
  }
}

app.get('/ping', (_req, res) => res.json({ status: 'ok' }));

app.get('/warmup', async (_req, res) => {
  Promise.allSettled([
    fetch(`${AUTH_URL}/health`),
    fetch(`${DEMAND_URL}/health`),
    fetch(`${METRICS_URL}/health`),
  ]);
  res.json({ status: 'warming up' });
});

// Rota de Health Check do Gateway e dos Serviços
app.get('/health', async (_req, res) => {
  const services = await Promise.all([
    checkService('auth-service', AUTH_URL),
    checkService('demand-service', DEMAND_URL),
    checkService('metrics-service', METRICS_URL),
  ]);

  const allOk = services.every((s) => s.status === 'ok');
  res.status(allOk ? 200 : 503).json({
    status: allOk ? 'ok' : 'degraded',
    gateway: 'api-gateway',
    services,
  });
});

// Proxy para o Serviço de Autenticação
app.use(
  '/auth',
  limiteAuth,
  createProxyMiddleware({
    target: AUTH_URL,
    changeOrigin: true,
    xfwd: true,
  })
);

// Proxy para o Serviço de Métricas
app.use(
  '/metrics',
  createProxyMiddleware({
    target: METRICS_URL,
    changeOrigin: true,
    xfwd: true,
  })
);

// Proxy para o Serviço de Demandas (Ajustado para preservar o prefixo esperado pelo microsserviço)
app.use(
  '/demands',
  createProxyMiddleware({
    target: DEMAND_URL,
    changeOrigin: true,
    xfwd: true,
    pathRewrite: {
      '^/demands': '/demandas', // ← era '', agora mapeia certo
    },
  })
);

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`api-gateway rodando na porta ${PORT}`));