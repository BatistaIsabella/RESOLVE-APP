import 'dotenv/config';
import express from 'express';
import demandRoutes from './routes/demandRoutes';
import healthRoutes from './routes/healthRoutes';
import { errorMiddleware } from './middlewares/errorMiddleware';

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(healthRoutes);         
app.use('/demandas', demandRoutes);
app.use(errorMiddleware);

export default app;