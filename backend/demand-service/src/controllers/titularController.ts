import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';
import * as titularService from '../services/titularService';

export async function exportarMeusDados(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const dados = await titularService.exportarDadosDoTitular(req.user!.userId, req.user!.papel);
    return res.json(dados);
  } catch (err) {
    next(err);
  }
}

export async function excluirMeusDados(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await titularService.anonimizarTitular(req.user!.userId, req.user!.papel);
    return res.status(204).send();
  } catch (err) {
    next(err);
  }
}
