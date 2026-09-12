import 'dotenv/config';
import express from 'express';
import authRoutes from './routes/authRoutes';
import healthRoutes from './routes/healthRoutes';
import { errorMiddleware } from './middlewares/errorMiddleware';

const app = express();

// Necessário pra req.ip refletir o IP real do cliente (via X-Forwarded-For)
// quando as requisições chegam através do api-gateway, não direto.
app.set('trust proxy', 1);

app.use((_req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS');
  next();
});

app.options('*', (_req, res) => res.sendStatus(204));

app.use(express.json());
app.use(healthRoutes);
app.use('/auth', authRoutes);
app.use(errorMiddleware);

export default app;
