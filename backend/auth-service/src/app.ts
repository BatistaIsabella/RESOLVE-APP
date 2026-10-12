import 'dotenv/config';
import express from 'express';
import authRoutes from './routes/authRoutes';
import healthRoutes from './routes/healthRoutes';
import { errorMiddleware } from './middlewares/errorMiddleware';

const app = express();

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
