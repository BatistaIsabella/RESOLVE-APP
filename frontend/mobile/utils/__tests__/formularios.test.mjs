import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isEmailValido, normalizarEmail } from '../email.ts';
import { formatPriorityLabel, parsePriorityLabel } from '../demandMapper.ts';

test('normaliza e-mail como o servidor compara', () => {
  assert.equal(normalizarEmail('  Ana@Exemplo.COM '), 'ana@exemplo.com');
});

test('valida o formato do e-mail', () => {
  assert.equal(isEmailValido('ana@exemplo.com'), true);
  assert.equal(isEmailValido('  ana@exemplo.com  '), true);
  assert.equal(isEmailValido('ana@exemplo'), false);
  assert.equal(isEmailValido('ana exemplo@x.com'), false);
  assert.equal(isEmailValido(''), false);
});

test('rótulo de prioridade vai e volta sem perder o valor', () => {
  for (const p of ['Alta', 'Media', 'Baixa']) {
    assert.equal(parsePriorityLabel(formatPriorityLabel(p)), p);
  }
  assert.equal(formatPriorityLabel('Media'), 'Média');
});
