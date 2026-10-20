import test from 'node:test';
import assert from 'node:assert/strict';
import {
  REQUISITOS_SENHA,
  primeiroRequisitoPendente,
  senhaAtendeRequisitos,
} from '../senha.ts';

test('aceita senha com 12+ caracteres, maiúscula, minúscula, número e símbolo', () => {
  assert.equal(senhaAtendeRequisitos('Azul#Montanha2026!'), true);
  assert.equal(primeiroRequisitoPendente('Azul#Montanha2026!'), null);
});

test('recusa senha curta', () => {
  assert.equal(senhaAtendeRequisitos('Curta#1aA'), false);
  assert.match(primeiroRequisitoPendente('Curta#1aA'), /12 caracteres/);
});

test('recusa senha sem maiúscula, sem minúscula, sem número ou sem símbolo', () => {
  assert.equal(senhaAtendeRequisitos('azul#montanha2026!'), false);
  assert.equal(senhaAtendeRequisitos('AZUL#MONTANHA2026!'), false);
  assert.equal(senhaAtendeRequisitos('Azul#Montanha!!!!'), false);
  assert.equal(senhaAtendeRequisitos('AzulMontanha2026x'), false);
});

test('cada requisito aponta o que falta', () => {
  assert.match(primeiroRequisitoPendente('azul#montanha2026!'), /maiúscula/);
  assert.match(primeiroRequisitoPendente('AZUL#MONTANHA2026!'), /minúscula/);
  assert.match(primeiroRequisitoPendente('Azul#Montanha!!!!'), /número/);
  assert.match(primeiroRequisitoPendente('AzulMontanha2026x'), /especial/);
});

test('a lista de requisitos tem 5 itens para exibir na tela', () => {
  assert.equal(REQUISITOS_SENHA.length, 5);
});
