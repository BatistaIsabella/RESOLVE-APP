import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatTempoMedio } from '../tempoMedio.ts';

test('sem denúncia resolvida ainda, mostra traço', () => {
  assert.equal(formatTempoMedio(null), '—');
  assert.equal(formatTempoMedio(undefined), '—');
  assert.equal(formatTempoMedio(Number.NaN), '—');
  assert.equal(formatTempoMedio(-3), '—');
});

test('menos de uma hora', () => {
  assert.equal(formatTempoMedio(0), 'menos de 1 h');
  assert.equal(formatTempoMedio(0.4), 'menos de 1 h');
});

test('até 48 horas aparece em horas', () => {
  assert.equal(formatTempoMedio(1), '1 h');
  assert.equal(formatTempoMedio(30.4), '30 h');
  assert.equal(formatTempoMedio(47.4), '47 h');
});

test('a partir de 48 horas aparece em dias, com vírgula decimal', () => {
  assert.equal(formatTempoMedio(48), '2 dias');
  assert.equal(formatTempoMedio(60), '2,5 dias');
  assert.equal(formatTempoMedio(120), '5 dias');
});
