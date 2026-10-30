import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';
import { getMetrics, refreshMetricsCache } from '../services/metricsService';

export async function getKpis(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (req.user?.papel !== 'gestor') {
      return res.status(403).json({ error: 'Acesso negado para este perfil' });
    }

    const metrics = await getMetrics(req.user.categorias);
    return res.json(metrics);
  } catch (err) {
    next(err);
  }
}

export async function refreshKpis(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (req.user?.papel !== 'gestor') {
      return res.status(403).json({ error: 'Acesso negado para este perfil' });
    }

    const metrics = await refreshMetricsCache(req.user.categorias);
    return res.json(metrics);
  } catch (err) {
    next(err);
  }
}
