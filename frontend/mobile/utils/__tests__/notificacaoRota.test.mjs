import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rotaDaNotificacao } from '../notificacaoRota.ts';

test('abre a denúncia indicada no aviso', () => {
  assert.equal(rotaDaNotificacao({ denunciaId: 7, status: 'RESOLVIDA' }), '/denuncias/7');
  assert.equal(rotaDaNotificacao({ denunciaId: '42' }), '/denuncias/42');
});

test('ignora avisos sem denúncia ou com id fora do esperado', () => {
  assert.equal(rotaDaNotificacao(undefined), null);
  assert.equal(rotaDaNotificacao(null), null);
  assert.equal(rotaDaNotificacao({}), null);
  assert.equal(rotaDaNotificacao({ denunciaId: '../gestor' }), null);
  assert.equal(rotaDaNotificacao({ denunciaId: '7/../../x' }), null);
  assert.equal(rotaDaNotificacao({ denunciaId: {} }), null);
});
