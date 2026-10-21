import test from 'node:test';
import assert from 'node:assert/strict';
import { codigoDoAppValido, codigoMfaValido, formatarSegredo } from '../mfa.ts';

test('formata o segredo em grupos de 4 caracteres', () => {
  assert.equal(formatarSegredo('JBSWY3DPEHPK3PXP'), 'JBSW Y3DP EHPK 3PXP');
});

test('formatar não altera o conteúdo do segredo', () => {
  const segredo = 'GEZDGNBVGY3TQOJQ';
  assert.equal(formatarSegredo(segredo).replace(/ /g, ''), segredo);
});

test('aceita o código de 6 dígitos do app autenticador', () => {
  assert.equal(codigoMfaValido('123456'), true);
  assert.equal(codigoMfaValido(' 123456 '), true);
  assert.equal(codigoDoAppValido('123456'), true);
});

test('recusa códigos de app com tamanho errado ou letras', () => {
  assert.equal(codigoMfaValido('12345'), false);
  assert.equal(codigoMfaValido('1234567'), false);
  assert.equal(codigoMfaValido('12a456'), false);
  assert.equal(codigoDoAppValido('abcde-12345'), false);
});

test('aceita o código de recuperação com ou sem hífen', () => {
  assert.equal(codigoMfaValido('a1b2c-3d4e5'), true);
  assert.equal(codigoMfaValido('A1B2C3D4E5'), true);
  assert.equal(codigoMfaValido('zzzzz-zzzzz'), false);
});

test('recusa texto vazio', () => {
  assert.equal(codigoMfaValido(''), false);
  assert.equal(codigoMfaValido('   '), false);
});
