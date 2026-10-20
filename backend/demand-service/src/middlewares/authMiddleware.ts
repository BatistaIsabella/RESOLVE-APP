import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getJwtSecret } from '../config/env';
import { sessaoValida } from '../services/sessaoService';

export interface UsuarioToken {
  userId: number;
  papel: 'cidadao' | 'gestor';
  email?: string;
  orgao?: string;
  // Categorias que o gestor pode ver. Ausente = todas (gestão geral).
  categorias?: string[];
  sv?: number;
}

export interface AuthRequest extends Request {
  user?: UsuarioToken;
}

export async function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  const token = authHeader.split(' ')[1];

  let decoded: UsuarioToken;
  try {
    decoded = jwt.verify(token, getJwtSecret()) as UsuarioToken;
  } catch {
    return res.status(401).json({ error: 'Token inválido ou expirado' });
  }

  if (!(await sessaoValida(decoded.userId, decoded.sv))) {
    return res.status(401).json({ error: 'Sessão encerrada. Faça login novamente' });
  }

  req.user = decoded;
  next();
}

// Garante que apenas cidadãos acessem a rota
export function apenascidadao(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.user?.papel !== 'cidadao') {
    return res.status(403).json({ error: 'Acesso restrito a cidadãos' });
  }
  next();
}
