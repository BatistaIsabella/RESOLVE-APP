import { Request, Response, NextFunction } from 'express';
import * as authService from '../services/authService';

const GESTOR_CODE = process.env.GESTOR_ACCESS_CODE || 'change-me-codigo-gestor';

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const { nome, email, senha, papel, codigoAcesso } = req.body;

    if (!nome || !email || !senha || !papel) {
      return res.status(400).json({ error: 'Campos obrigatórios: nome, email, senha, papel' });
    }

    if (papel !== 'cidadao' && papel !== 'gestor') {
      return res.status(400).json({ error: 'papel deve ser "cidadao" ou "gestor"' });
    }

    if (papel === 'gestor' && codigoAcesso !== GESTOR_CODE) {
      return res.status(403).json({ error: 'Código de acesso de gestor inválido ou ausente' });
    }

    const result = await authService.register(nome, email, senha, papel);
    return res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, senha } = req.body;

    if (!email || !senha) {
      return res.status(400).json({ error: 'Campos obrigatórios: email, senha' });
    }

    const result = await authService.login(email, senha);
    return res.json(result);
  } catch (err) {
    next(err);
  }
}
