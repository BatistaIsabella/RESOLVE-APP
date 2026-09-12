import 'dotenv/config';
import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import rateLimit from 'express-rate-limit';

const app = express();

const AUTH_URL = process.env.AUTH_SERVICE_URL ?? 'http://localhost:3001';
const DEMAND_URL = process.env.DEMAND_SERVICE_URL ?? 'http://localhost:3002';
const METRICS_URL = process.env.METRICS_SERVICE_URL ?? 'http://localhost:3003';

// Configuração de CORS
app.use((_req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS');
  next();
});

app.options('*', (_req, res) => res.sendStatus(204));

// Rate Limiter para segurança da API
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 200, // Limite de 200 requisições por IP
    standardHeaders: true,
    legacyHeaders: false,
  })
);

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
  createProxyMiddleware({
    target: AUTH_URL,
    changeOrigin: true,
  })
);

// Proxy para o Serviço de Métricas
app.use(
  '/metrics',
  createProxyMiddleware({
    target: METRICS_URL,
    changeOrigin: true,
  })
);

// Proxy para o Serviço de Demandas (Ajustado para preservar o prefixo esperado pelo microsserviço)
app.use(
  '/demands',
  createProxyMiddleware({
    target: DEMAND_URL,
    changeOrigin: true,
    pathRewrite: {
      '^/demands': '/demandas', // ← era '', agora mapeia certo
    },
  })
);

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`api-gateway rodando na porta ${PORT}`));