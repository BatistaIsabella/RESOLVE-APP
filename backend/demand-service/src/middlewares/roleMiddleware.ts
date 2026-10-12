import { Response, NextFunction } from 'express';
import { AuthRequest } from './authMiddleware';

export function roleMiddleware(...roles: Array<'cidadao' | 'gestor'>) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    if (!roles.includes(req.user.papel)) {
      const mensagem =
        roles.length === 1 && roles[0] === 'cidadao'
          ? 'Acesso restrito a cidadãos'
          : roles.length === 1 && roles[0] === 'gestor'
          ? 'Acesso restrito a gestores'
          : 'Acesso negado para este perfil';
      return res.status(403).json({ error: mensagem });
    }

    next();
  };
}
