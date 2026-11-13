import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';
import * as pushService from '../services/pushService';

export async function registrarDispositivo(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const token = pushService.validarTokenPush(req.body?.token);
    await pushService.registrarDispositivo(req.user!.userId, token);
    return res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function removerDispositivo(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const token = pushService.validarTokenPush(req.body?.token);
    await pushService.removerDispositivo(req.user!.userId, token);
    return res.status(204).send();
  } catch (err) {
    next(err);
  }
}
