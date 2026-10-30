import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';
import * as denunciaService from '../services/denunciaService';
import { parsePagination } from '../utils/pagination';

export async function createDenuncia(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const input = denunciaService.validateCreateDenunciaInput(req.body);
    const denuncia = await denunciaService.createDenuncia(req.user!.userId, input, req.user!.email);
    return res.status(201).json(denuncia);
  } catch (err) {
    next(err);
  }
}

export async function listMinhasDenuncias(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const pagination = parsePagination(req.query as Record<string, unknown>);
    const filtros = denunciaService.parseListFilters(req.query as Record<string, unknown>);
    const resultado = await denunciaService.listDenunciasByCidadao(req.user!.userId, pagination, filtros);
    return res.json(resultado);
  } catch (err) {
    next(err);
  }
}

export async function listarFeedDenuncias(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const pagination = parsePagination(req.query as Record<string, unknown>);
    const filtros = denunciaService.parseListFilters(req.query as Record<string, unknown>);
    const resultado = await denunciaService.listFeedPublico(pagination, filtros);
    return res.json(resultado);
  } catch (err) {
    next(err);
  }
}

export async function getDenunciaDetalhes(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const denunciaId = denunciaService.parseDenunciaId(req.params.id);
    const denuncia = await denunciaService.getDenunciaById(req.user!.userId, denunciaId);
    return res.json(denuncia);
  } catch (err) {
    next(err);
  }
}

export async function atualizarDenuncia(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const denunciaId = denunciaService.parseDenunciaId(req.params.id);
    const input = denunciaService.validateUpdateDenunciaInput(req.body ?? {});
    const denuncia = await denunciaService.updateDenunciaCidadao(req.user!.userId, denunciaId, input);
    return res.json(denuncia);
  } catch (err) {
    next(err);
  }
}

export async function excluirDenuncia(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const denunciaId = denunciaService.parseDenunciaId(req.params.id);
    await denunciaService.deleteDenunciaCidadao(req.user!.userId, denunciaId);
    return res.status(204).send();
  } catch (err) {
    next(err);
  }
}
