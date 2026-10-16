// Sem test runner no app: roda com o test runner do próprio Node (>= 22.18,
// que executa .ts direto):
//   node --test utils/__tests__/*.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractBairro, BAIRRO_SO_GPS } from '../demandMapper.ts';

test('GPS com coordenadas no fim: pega o bairro, não o sinal de menos', () => {
  assert.equal(
    extractBairro('Rua X, 12, Boa Viagem, Recife, PE (-8.05000, -34.88000)'),
    'Boa Viagem'
  );
});

test('GPS sem o número da casa', () => {
  assert.equal(extractBairro('Rua X, Boa Viagem, Recife, PE (-8.05000, -34.88000)'), 'Boa Viagem');
});

test('GPS sem bairro não devolve o número da casa', () => {
  assert.equal(extractBairro('Rua X, 12, Recife, PE (-8.05000, -34.88000)'), 'Rua X');
});

test('só coordenadas (GPS sem endereço reverso)', () => {
  assert.equal(extractBairro('Lat: -8.05000, Lng: -34.88000'), BAIRRO_SO_GPS);
});

test('hífen no nome da rua não é separador', () => {
  assert.equal(
    extractBairro('Rua João-Pessoa, 10, Centro, Recife, PE (-8.05000, -34.88000)'),
    'Centro'
  );
});

test('formato "Rua, nº - Bairro, Cidade - CEP"', () => {
  assert.equal(
    extractBairro('Av. Boa Viagem, 1 - Boa Viagem, Recife - CEP: 50000-000'),
    'Boa Viagem'
  );
  assert.equal(extractBairro('Rua Teste, 1 - Caruaru - PE'), 'Caruaru');
});

test('endereço digitado curto devolve o primeiro trecho', () => {
  assert.equal(extractBairro('Rua A, 10'), 'Rua A');
  assert.equal(extractBairro('Praça do Arsenal'), 'Praça do Arsenal');
});
