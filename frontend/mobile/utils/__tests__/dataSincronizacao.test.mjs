import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatarDataSincronizacao } from '../dataSincronizacao.ts';

// Datas montadas no fuso local para o resultado não depender do TZ da máquina.
const agora = new Date(2026, 10, 24, 12, 0).getTime();

test('formata um ISO válido como "dd/mm às hh:mm"', () => {
  const iso = new Date(2026, 10, 20, 9, 5).toISOString();
  assert.equal(formatarDataSincronizacao(iso, agora), '20/11 às 09:05');
});

test('sem data salva, devolve null', () => {
  assert.equal(formatarDataSincronizacao(null, agora), null);
  assert.equal(formatarDataSincronizacao(undefined, agora), null);
  assert.equal(formatarDataSincronizacao('', agora), null);
  assert.equal(formatarDataSincronizacao('   ', agora), null);
});

test('timestamp inválido nunca vira "Invalid Date"', () => {
  assert.equal(formatarDataSincronizacao('abc', agora), null);
  assert.equal(formatarDataSincronizacao('2026-13-45T99:99:99Z', agora), null);
});

test('valor que não é string é ignorado (cache corrompido)', () => {
  assert.equal(formatarDataSincronizacao(1732459200000, agora), null);
  assert.equal(formatarDataSincronizacao({}, agora), null);
});

test('data no futuro é tratada como inconsistente', () => {
  const amanha = new Date(2026, 10, 25, 12, 0).toISOString();
  assert.equal(formatarDataSincronizacao(amanha, agora), null);
});

test('aceita pequena diferença de relógio (até 5 minutos no futuro)', () => {
  const doisMinutosDepois = new Date(agora + 2 * 60 * 1000).toISOString();
  assert.notEqual(formatarDataSincronizacao(doisMinutosDepois, agora), null);
});
