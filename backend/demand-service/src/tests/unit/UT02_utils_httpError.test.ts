import { describe, it, expect } from 'vitest';
import { httpError } from '../../utils/httpError';

// httpError() é uma função auxiliar que cria um Error enriquecido com
// uma propriedade `status`. É usada em todo o serviço para que o middleware
// de erro possa devolver o código HTTP correto ao cliente.

describe('httpError', () => {

  it('retorna uma instância de Error', () => {
    const erro = httpError('algo deu errado', 400);

    // toBeInstanceOf verifica o tipo do objeto — garante que é um Error real,
    // não um objeto qualquer. Isso importa porque o middleware usa instanceof.
    expect(erro).toBeInstanceOf(Error);
  });

  it('define a mensagem corretamente', () => {
    const erro = httpError('não encontrado', 404);

    expect(erro.message).toBe('não encontrado');
  });

  it('define a propriedade status corretamente', () => {
    const erro = httpError('acesso negado', 403);

    expect(erro.status).toBe(403);
  });

  it('funciona com 400 (requisição inválida)', () => {
    const erro = httpError('campo obrigatório ausente', 400);

    expect(erro.message).toBe('campo obrigatório ausente');
    expect(erro.status).toBe(400);
  });

  it('funciona com 401 (não autenticado)', () => {
    const erro = httpError('token inválido', 401);

    expect(erro.status).toBe(401);
  });

  it('funciona com 409 (conflito de dados)', () => {
    const erro = httpError('e-mail já cadastrado', 409);

    expect(erro.status).toBe(409);
  });

  it('funciona com 500 (erro interno)', () => {
    const erro = httpError('erro inesperado', 500);

    expect(erro.status).toBe(500);
  });

  it('cada chamada cria um objeto independente', () => {
    const erroA = httpError('erro A', 400);
    const erroB = httpError('erro B', 404);

    // Garante que não há estado compartilhado entre chamadas
    expect(erroA.message).toBe('erro A');
    expect(erroB.message).toBe('erro B');
    expect(erroA.status).not.toBe(erroB.status);
  });
});
