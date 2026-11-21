import { test } from 'node:test';
import assert from 'node:assert/strict';
import { criarCache, isErroDeRede, lerCache } from '../demandCache.ts';

const demanda = { id: '1', titulo: 'Poste apagado' };

test('cache gravado é lido de volta pelo mesmo usuário', () => {
  const cache = criarCache('Ana@Exemplo.com ', [demanda], null, '2026-11-20T10:00:00.000Z');
  const lido = lerCache(JSON.stringify(cache), 'ana@exemplo.com');
  assert.deepEqual(lido?.demands, [demanda]);
  assert.equal(lido?.sincronizadoEm, '2026-11-20T10:00:00.000Z');
});

test('cache de outro usuário nunca é devolvido', () => {
  const cache = criarCache('ana@exemplo.com', [demanda], null, '2026-11-20T10:00:00.000Z');
  assert.equal(lerCache(JSON.stringify(cache), 'bruno@exemplo.com'), null);
});

test('sem sessão, sem cache', () => {
  const cache = criarCache('ana@exemplo.com', [demanda], null, '2026-11-20T10:00:00.000Z');
  assert.equal(lerCache(JSON.stringify(cache), null), null);
  assert.equal(lerCache(null, 'ana@exemplo.com'), null);
});

test('JSON corrompido ou de outro formato é ignorado', () => {
  assert.equal(lerCache('{nao é json', 'ana@exemplo.com'), null);
  assert.equal(lerCache(JSON.stringify({ versao: 2, dono: 'ana@exemplo.com', demands: [] }), 'ana@exemplo.com'), null);
  assert.equal(lerCache(JSON.stringify({ versao: 1, dono: 'ana@exemplo.com', demands: 'x', sincronizadoEm: 'y' }), 'ana@exemplo.com'), null);
});

test('só falta de rede (status 0) conta como offline', () => {
  const rede = Object.assign(new Error('Servidor indisponível'), { name: 'ApiError', status: 0 });
  const servidor = Object.assign(new Error('Erro interno'), { name: 'ApiError', status: 500 });
  assert.equal(isErroDeRede(rede), true);
  assert.equal(isErroDeRede(servidor), false);
  assert.equal(isErroDeRede(new Error('qualquer')), false);
  assert.equal(isErroDeRede(null), false);
});
