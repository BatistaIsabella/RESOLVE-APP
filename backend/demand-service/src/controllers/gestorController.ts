import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';
import * as denunciaService from '../services/denunciaService';
import { parsePagination } from '../utils/pagination';

export async function listarTodasDenuncias(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const pagination = parsePagination(req.query as Record<string, unknown>);
    const filtros = denunciaService.parseListFilters(req.query as Record<string, unknown>);
    const resultado = await denunciaService.listAllDenuncias(pagination, filtros);
    return res.json(resultado);
  } catch (err) {
    next(err);
  }
}

export async function getDenunciaDetalhesGestor(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const denunciaId = denunciaService.parseDenunciaId(req.params.id);
    const denuncia = await denunciaService.getDenunciaByIdForGestor(denunciaId);
    return res.json(denuncia);
  } catch (err) {
    next(err);
  }
}

export async function excluirDenunciaGestor(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const denunciaId = denunciaService.parseDenunciaId(req.params.id);
    await denunciaService.deleteDenunciaGestor(denunciaId);
    return res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function atualizarStatusDenuncia(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const denunciaId = denunciaService.parseDenunciaId(req.params.id);
    const novoStatus = denunciaService.validateStatusInput(req.body.status);

    const resultado = await denunciaService.updateDenunciaStatus(
      req.user!.userId,
      denunciaId,
      novoStatus
    );

    return res.json(resultado);
  } catch (err) {
    next(err);
  }
}

export async function atualizarPrioridadeDenuncia(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const denunciaId = denunciaService.parseDenunciaId(req.params.id);
    const novaPrioridade = denunciaService.validatePrioridadeInput(req.body.prioridade);

    const resultado = await denunciaService.updateDenunciaPrioridade(
      req.user!.userId,
      denunciaId,
      novaPrioridade
    );

    return res.json(resultado);
  } catch (err) {
    next(err);
  }
}