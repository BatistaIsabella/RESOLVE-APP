import 'dotenv/config';
import express from 'express';
import metricsRoutes from './routes/metricsRoutes';
import healthRoutes from './routes/healthRoutes';
import { errorMiddleware } from './middlewares/errorMiddleware';

const app = express();

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
app.use(express.json({ limit: '100kb' }));
app.use(healthRoutes);
app.use(metricsRoutes);
app.use(errorMiddleware);

export default app;
