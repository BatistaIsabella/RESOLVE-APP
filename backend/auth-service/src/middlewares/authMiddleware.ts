import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getJwtSecret } from '../config/env';
import { lerDesafio } from '../services/mfaService';
import { sessaoValida } from '../services/sessaoService';
import { Claims } from '../services/tokenService';

export interface AuthRequest extends Request {
  user?: Claims;
  // Verdadeiro quando a rota foi aberta por um desafio de MFA, e não por uma sessão.
  viaDesafio?: boolean;
}

export async function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  const token = authHeader.split(' ')[1];

  let decoded: Claims;
  try {
    decoded = jwt.verify(token, getJwtSecret()) as Claims;
  } catch {
    return res.status(401).json({ error: 'Token inválido ou expirado' });
  }

  if (!(await sessaoValida(decoded.userId, decoded.sv))) {
    return res.status(401).json({ error: 'Sessão encerrada. Faça login novamente' });
  }

  req.user = decoded;
  next();
}

// Configuração de MFA: vale com a sessão normal ou, no primeiro acesso de um gestor
// em que a MFA é obrigatória, com o desafio recebido no login (ainda não existe sessão).
export async function sessaoOuDesafioDeConfiguracao(req: AuthRequest, res: Response, next: NextFunction) {
  const desafio = req.body?.desafio;
  if (typeof desafio !== 'string') return authMiddleware(req, res, next);

  try {
    const userId = lerDesafio(desafio, 'setup');
    req.user = { userId, papel: 'gestor', email: '' };
    req.viaDesafio = true;
    next();
  } catch (err) {
    next(err);
  }
}
