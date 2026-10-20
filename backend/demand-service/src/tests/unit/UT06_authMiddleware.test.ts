import { describe, it, expect, vi, beforeEach } from 'vitest';
import jwt from 'jsonwebtoken';
import type { Response, NextFunction } from 'express';
import { getJwtSecret } from '../../config/env';
import { sessaoValida } from '../../services/sessaoService';
import { authMiddleware, apenascidadao, AuthRequest } from '../../middlewares/authMiddleware';

vi.mock('../../services/sessaoService', () => ({ sessaoValida: vi.fn() }));

beforeEach(() => {
  vi.mocked(sessaoValida).mockResolvedValue(true);
});

// ─── NÍVEL 3: MIDDLEWARES COM req/res/next FALSOS ────────────────────────────
//
// Um middleware Express é uma função com a assinatura (req, res, next).
// Testar um middleware de forma unitária significa:
//   1. Criar um req falso com os dados que o teste precisa (headers, user…)
//   2. Criar um res falso com status() e json() como vi.fn()
//   3. Criar um next falso como vi.fn()
//   4. Chamar o middleware e verificar o que ele fez
//
// O ponto de atenção: res.status(401).json({}) é um ENCADEAMENTO.
// Se status() não retornar o próprio res, o .json() vai quebrar.
// Por isso usamos mockReturnThis() — "retorne o objeto que me contém".
// ─────────────────────────────────────────────────────────────────────────────

// Mesmo segredo que o middleware usa por padrão
const SECRET = getJwtSecret();

// ─── FÁBRICAS ─────────────────────────────────────────────────────────────────

function makeReq(headers: Record<string, string> = {}, user?: AuthRequest['user']): AuthRequest {
  return { headers, user } as AuthRequest;
}

// Retorna as fns de mock separadas para facilitar os expects
function makeRes() {
  const status = vi.fn().mockReturnThis(); // .status(401) devolve o próprio res
  const json   = vi.fn().mockReturnThis(); // .json({}) devolve o próprio res
  const res    = { status, json } as unknown as Response;
  return { res, status, json };
}

function makeNext(): NextFunction {
  return vi.fn() as unknown as NextFunction;
}

// ─── authMiddleware ───────────────────────────────────────────────────────────

describe('authMiddleware', () => {

  it('responde 401 quando o header Authorization está ausente', async () => {
    const req        = makeReq({});          // sem Authorization
    const { res, status, json } = makeRes();
    const next       = makeNext();

    await authMiddleware(req, res, next);

    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith({ error: 'Token não fornecido' });
    // next() NÃO deve ser chamado — a requisição foi barrada aqui
    expect(next).not.toHaveBeenCalled();
  });

  it('responde 401 quando o header existe mas não começa com "Bearer "', async () => {
    const req        = makeReq({ authorization: 'Basic dXNlcjpwYXNz' });
    const { res, status, json } = makeRes();
    const next       = makeNext();

    await authMiddleware(req, res, next);

    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith({ error: 'Token não fornecido' });
    expect(next).not.toHaveBeenCalled();
  });

  it('chama next() com token válido e popula req.user corretamente', async () => {
    // Criamos um JWT real — o middleware vai verificá-lo com a mesma lib
    const payload = { userId: 42, papel: 'cidadao' as const, email: 'cidadao@test.com' };
    const token   = jwt.sign(payload, SECRET);

    const req        = makeReq({ authorization: `Bearer ${token}` });
    const { res, status } = makeRes();
    const next       = makeNext();

    await authMiddleware(req, res, next);

    // next() foi chamado — middleware liberou o acesso
    expect(next).toHaveBeenCalledOnce();
    // req.user foi populado com os dados do payload
    expect(req.user).toMatchObject({ userId: 42, papel: 'cidadao', email: 'cidadao@test.com' });
    // res.status nunca foi chamado (não houve rejeição)
    expect(status).not.toHaveBeenCalled();
  });

  it('popula req.user com papel "gestor" quando o token carrega esse papel', async () => {
    const token = jwt.sign({ userId: 7, papel: 'gestor' }, SECRET);
    const req   = makeReq({ authorization: `Bearer ${token}` });
    const { res } = makeRes();
    const next  = makeNext();

    await authMiddleware(req, res, next);

    expect(req.user?.papel).toBe('gestor');
    expect(next).toHaveBeenCalledOnce();
  });

  it('responde 401 para token assinado com secret diferente', async () => {
    // Token legítimo mas assinado com outro secret — verificação vai falhar
    const token = jwt.sign({ userId: 1, papel: 'cidadao' }, 'secret-errado');
    const req   = makeReq({ authorization: `Bearer ${token}` });
    const { res, status, json } = makeRes();
    const next  = makeNext();

    await authMiddleware(req, res, next);

    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith({ error: 'Token inválido ou expirado' });
    expect(next).not.toHaveBeenCalled();
  });

  it('responde 401 para token expirado', async () => {
    // expiresIn: -1 gera um token que já nasceu expirado
    const token = jwt.sign({ userId: 1, papel: 'cidadao' }, SECRET, { expiresIn: -1 });
    const req   = makeReq({ authorization: `Bearer ${token}` });
    const { res, status } = makeRes();
    const next  = makeNext();

    await authMiddleware(req, res, next);

    expect(status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('responde 401 para token malformado (string aleatória no lugar do JWT)', async () => {
    const req  = makeReq({ authorization: 'Bearer isto.nao.e.um.jwt.valido' });
    const { res, status } = makeRes();
    const next = makeNext();

    await authMiddleware(req, res, next);

    expect(status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('responde 401 para token com segmentos corretos mas payload adulterado', async () => {
    // Cria token válido, depois troca o payload (segmento do meio) por outro em base64
    const token  = jwt.sign({ userId: 1, papel: 'cidadao' }, SECRET);
    const partes = token.split('.');
    // Troca o payload por um payload diferente codificado em base64
    const payloadFalso = Buffer.from(JSON.stringify({ userId: 999, papel: 'gestor' })).toString('base64url');
    const tokenAdulterado = `${partes[0]}.${payloadFalso}.${partes[2]}`;

    const req  = makeReq({ authorization: `Bearer ${tokenAdulterado}` });
    const { res, status } = makeRes();
    const next = makeNext();

    await authMiddleware(req, res, next);

    expect(status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
  it('responde 401 quando a sessão foi encerrada (senha trocada depois da emissão do token)', async () => {
    vi.mocked(sessaoValida).mockResolvedValue(false);
    const token = jwt.sign({ userId: 5, papel: 'cidadao', sv: 0 }, SECRET);
    const req   = makeReq({ authorization: `Bearer ${token}` });
    const { res, status, json } = makeRes();
    const next  = makeNext();

    await authMiddleware(req, res, next);

    expect(sessaoValida).toHaveBeenCalledWith(5, 0);
    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith({ error: 'Sessão encerrada. Faça login novamente' });
    expect(next).not.toHaveBeenCalled();
  });

  it('repassa categorias e órgão do token para req.user', async () => {
    const token = jwt.sign(
      { userId: 8, papel: 'gestor', orgao: 'ILUMINACAO', categorias: ['ILUMINACAO_PUBLICA'] },
      SECRET
    );
    const req   = makeReq({ authorization: `Bearer ${token}` });
    const { res } = makeRes();
    const next  = makeNext();

    await authMiddleware(req, res, next);

    expect(req.user?.categorias).toEqual(['ILUMINACAO_PUBLICA']);
    expect(req.user?.orgao).toBe('ILUMINACAO');
  });

});

// ─── apenascidadao ────────────────────────────────────────────────────────────

describe('apenascidadao', () => {

  it('chama next() quando req.user.papel é "cidadao"', () => {
    const req  = makeReq({}, { userId: 1, papel: 'cidadao' });
    const { res, status } = makeRes();
    const next = makeNext();

    apenascidadao(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(status).not.toHaveBeenCalled();
  });

  it('responde 403 quando req.user.papel é "gestor"', () => {
    const req  = makeReq({}, { userId: 1, papel: 'gestor' });
    const { res, status, json } = makeRes();
    const next = makeNext();

    apenascidadao(req, res, next);

    expect(status).toHaveBeenCalledWith(403);
    expect(json).toHaveBeenCalledWith({ error: 'Acesso restrito a cidadãos' });
    expect(next).not.toHaveBeenCalled();
  });

  it('responde 403 quando req.user está ausente (rota sem authMiddleware antes)', () => {
    // req.user undefined → papel não existe → acesso negado
    const req  = makeReq({}, undefined);
    const { res, status } = makeRes();
    const next = makeNext();

    apenascidadao(req, res, next);

    expect(status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});
