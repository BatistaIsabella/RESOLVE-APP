import { describe, it, expect, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { errorMiddleware } from '../../middlewares/errorMiddleware';

// O errorMiddleware é o middleware de 4 parâmetros do Express: (err, req, res, next).
// Ele é o ponto central onde todos os erros lançados em rotas e outros
// middlewares chegam. Seu contrato com o frontend é simples:
//   { error: "mensagem" }  —  nunca "message", sempre "error"
//
// Como é uma função síncrona sem dependências externas, os testes são
// os mais simples do nível 3 — nenhum mock de módulo necessário.

function makeRes() {
  const status = vi.fn().mockReturnThis();
  const json   = vi.fn().mockReturnThis();
  const res    = { status, json } as unknown as Response;
  return { res, status, json };
}

// Helpers para criar erros com e sem status HTTP
function httpErr(message: string, status: number): Error & { status: number } {
  const err = new Error(message) as Error & { status: number };
  err.status = status;
  return err;
}

function plainErr(message?: string): Error {
  return new Error(message ?? '');
}

// req e next não são usados por esse middleware — passamos objetos mínimos
const fakeReq  = {} as Request;
const fakeNext = vi.fn() as unknown as NextFunction;

describe('errorMiddleware', () => {

  // ── Status HTTP ────────────────────────────────────────────────────────────

  it('usa o status do erro quando a propriedade status está presente (400)', () => {
    const { res, status } = makeRes();

    errorMiddleware(httpErr('campo inválido', 400), fakeReq, res, fakeNext);

    expect(status).toHaveBeenCalledWith(400);
  });

  it('usa o status do erro quando a propriedade status está presente (404)', () => {
    const { res, status } = makeRes();

    errorMiddleware(httpErr('não encontrado', 404), fakeReq, res, fakeNext);

    expect(status).toHaveBeenCalledWith(404);
  });

  it('usa o status do erro quando a propriedade status está presente (403)', () => {
    const { res, status } = makeRes();

    errorMiddleware(httpErr('acesso negado', 403), fakeReq, res, fakeNext);

    expect(status).toHaveBeenCalledWith(403);
  });

  it('usa 500 como fallback quando o erro não tem propriedade status', () => {
    // Um Error lançado diretamente (sem httpError) não tem .status
    const { res, status } = makeRes();

    errorMiddleware(plainErr('algo inesperado'), fakeReq, res, fakeNext);

    expect(status).toHaveBeenCalledWith(500);
  });

  // ── Mensagem ───────────────────────────────────────────────────────────────

  it('usa a mensagem do erro no corpo da resposta', () => {
    const { res, json } = makeRes();

    errorMiddleware(httpErr('demanda não encontrada', 404), fakeReq, res, fakeNext);

    expect(json).toHaveBeenCalledWith({ error: 'demanda não encontrada' });
  });

  it('usa "Erro interno do servidor" quando o erro não tem mensagem', () => {
    // new Error() sem argumento tem message === '' — falsy
    const { res, json } = makeRes();

    errorMiddleware(plainErr(), fakeReq, res, fakeNext);

    expect(json).toHaveBeenCalledWith({ error: 'Erro interno do servidor' });
  });

  // ── Contrato da API ────────────────────────────────────────────────────────
  //
  // O frontend e os testes de integração esperam o campo "error", não "message".
  // Esse teste documenta e protege esse contrato explicitamente.

  it('usa o campo "error" no JSON, nunca "message"', () => {
    const { res, json } = makeRes();

    errorMiddleware(httpErr('entrada inválida', 400), fakeReq, res, fakeNext);

    const chamada = json.mock.calls[0][0]; // primeiro argumento da primeira chamada

    expect(chamada).toHaveProperty('error');
    expect(chamada).not.toHaveProperty('message');
  });

  // ── Combinação status + mensagem ───────────────────────────────────────────

  it('combina status e mensagem corretos numa única resposta', () => {
    const { res, status, json } = makeRes();

    errorMiddleware(httpErr('e-mail já cadastrado', 409), fakeReq, res, fakeNext);

    expect(status).toHaveBeenCalledWith(409);
    expect(json).toHaveBeenCalledWith({ error: 'e-mail já cadastrado' });
  });

  it('combina 500 e mensagem default para erro sem status e sem mensagem', () => {
    const { res, status, json } = makeRes();

    errorMiddleware(plainErr(), fakeReq, res, fakeNext);

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({ error: 'Erro interno do servidor' });
  });

  // ── Garantias de comportamento ─────────────────────────────────────────────

  it('chama res.status().json() em encadeamento (não chama status duas vezes)', () => {
    const { res, status, json } = makeRes();

    errorMiddleware(httpErr('proibido', 403), fakeReq, res, fakeNext);

    // status e json são chamados exatamente uma vez cada
    expect(status).toHaveBeenCalledOnce();
    expect(json).toHaveBeenCalledOnce();
  });
});
