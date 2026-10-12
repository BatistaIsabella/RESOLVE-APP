import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Response, NextFunction } from 'express';
import { roleMiddleware } from '../../middlewares/roleMiddleware';
import type { AuthRequest } from '../../middlewares/authMiddleware';

// roleMiddleware é uma FÁBRICA: ela não é um middleware em si, mas uma função
// que RETORNA um middleware configurado com os papéis permitidos.
//
// Exemplo de uso na rota:
//   router.get('/gestor', roleMiddleware('gestor'), handler)
//   router.get('/feed',   roleMiddleware('cidadao', 'gestor'), handler)
//
// Isso significa que o teste tem uma etapa extra em relação ao nível anterior:
// primeiro chamamos roleMiddleware(...) para obter o middleware,
// depois testamos o middleware retornado.

function makeRes() {
  const status = vi.fn().mockReturnThis();
  const json   = vi.fn().mockReturnThis();
  const res    = { status, json } as unknown as Response;
  return { res, status, json };
}

function makeNext(): NextFunction {
  return vi.fn() as unknown as NextFunction;
}

describe('roleMiddleware', () => {

  let next: NextFunction;

  beforeEach(() => {
    next = makeNext();
  });

  // ── Caminho feliz — papel dentro da lista ──────────────────────────────────

  it('chama next() quando o papel do usuário está na lista permitida (gestor)', () => {
    const middleware = roleMiddleware('gestor');
    const req = { user: { userId: 1, papel: 'gestor' } } as AuthRequest;
    const { res } = makeRes();

    middleware(req, res, next);

    expect(next).toHaveBeenCalledOnce();
  });

  it('chama next() quando o papel do usuário está na lista permitida (cidadao)', () => {
    const middleware = roleMiddleware('cidadao');
    const req = { user: { userId: 2, papel: 'cidadao' } } as AuthRequest;
    const { res } = makeRes();

    middleware(req, res, next);

    expect(next).toHaveBeenCalledOnce();
  });

  it('chama next() quando múltiplos papéis são permitidos e o usuário tem um deles', () => {
    // Rota acessível por cidadão e gestor — cidadão acessa normalmente
    const middleware = roleMiddleware('cidadao', 'gestor');
    const req = { user: { userId: 3, papel: 'cidadao' } } as AuthRequest;
    const { res } = makeRes();

    middleware(req, res, next);

    expect(next).toHaveBeenCalledOnce();
  });

  it('chama next() quando gestor acessa rota que aceita cidadao e gestor', () => {
    const middleware = roleMiddleware('cidadao', 'gestor');
    const req = { user: { userId: 4, papel: 'gestor' } } as AuthRequest;
    const { res } = makeRes();

    middleware(req, res, next);

    expect(next).toHaveBeenCalledOnce();
  });

  // ── Papel fora da lista — 403 ──────────────────────────────────────────────

  it('responde 403 quando cidadão tenta acessar rota exclusiva do gestor', () => {
    const middleware = roleMiddleware('gestor'); // só gestor
    const req = { user: { userId: 5, papel: 'cidadao' } } as AuthRequest;
    const { res, status, json } = makeRes();

    middleware(req, res, next);

    expect(status).toHaveBeenCalledWith(403);
    expect(json).toHaveBeenCalledWith({ error: 'Acesso restrito a gestores' });
    expect(next).not.toHaveBeenCalled();
  });

  it('responde 403 quando gestor tenta acessar rota exclusiva do cidadão', () => {
    const middleware = roleMiddleware('cidadao'); // só cidadão
    const req = { user: { userId: 6, papel: 'gestor' } } as AuthRequest;
    const { res, status, json } = makeRes();

    middleware(req, res, next);

    expect(status).toHaveBeenCalledWith(403);
    expect(json).toHaveBeenCalledWith({ error: 'Acesso restrito a cidadãos' });
    expect(next).not.toHaveBeenCalled();
  });

  // ── req.user ausente — 401 ─────────────────────────────────────────────────
  //
  // Quando o authMiddleware não está na cadeia antes do roleMiddleware,
  // req.user não é populado. O roleMiddleware deve tratar esse caso
  // como "não autenticado" (401), não como "sem permissão" (403).

  it('responde 401 quando req.user está ausente', () => {
    const middleware = roleMiddleware('gestor');
    const req = {} as AuthRequest; // sem user — authMiddleware não foi chamado antes
    const { res, status, json } = makeRes();

    middleware(req, res, next);

    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith({ error: 'Usuário não autenticado' });
    expect(next).not.toHaveBeenCalled();
  });

  it('responde 401 quando req.user é undefined explicitamente', () => {
    const middleware = roleMiddleware('cidadao', 'gestor');
    const req = { user: undefined } as AuthRequest;
    const { res, status } = makeRes();

    middleware(req, res, next);

    expect(status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  // ── Isolamento entre instâncias do middleware ──────────────────────────────
  //
  // Como roleMiddleware é uma fábrica, cada chamada cria um middleware
  // independente. A lista de papéis não vaza entre instâncias.

  it('cada instância do middleware mantém sua própria lista de papéis', () => {
    const somenteGestor  = roleMiddleware('gestor');
    const somenteCidadao = roleMiddleware('cidadao');

    const gestorReq   = { user: { userId: 1, papel: 'gestor' } } as AuthRequest;
    const cidadaoReq  = { user: { userId: 2, papel: 'cidadao' } } as AuthRequest;
    const nextGestor  = makeNext();
    const nextCidadao = makeNext();
    const { res: resGestor }  = makeRes();
    const { res: resCidadao } = makeRes();

    somenteGestor(gestorReq, resGestor, nextGestor);
    somenteCidadao(cidadaoReq, resCidadao, nextCidadao);

    // Cada middleware liberou apenas seu tipo correto de usuário
    expect(nextGestor).toHaveBeenCalledOnce();
    expect(nextCidadao).toHaveBeenCalledOnce();
  });
});
