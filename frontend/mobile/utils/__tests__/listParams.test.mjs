import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildListParams } from '../demandMapper.ts';

test('sem filtros: só a paginação', () => {
  assert.deepEqual(buildListParams(), { page: 1, limit: 100 });
  assert.deepEqual(
    buildListParams({ status: '', category: '', region: '', priority: '', search: '   ' }),
    { page: 1, limit: 100 }
  );
});

test('traduz cada filtro para o valor que a API entende', () => {
  assert.deepEqual(
    buildListParams({
      status: 'Em análise',
      category: 'Iluminação Pública',
      region: 'Região Metropolitana do Recife',
      priority: 'Media',
      search: '  poste ',
    }),
    {
      page: 1,
      limit: 100,
      q: 'poste',
      status: 'EM_ANALISE',
      categoria: 'ILUMINACAO_PUBLICA',
      regiao: 'REGIAO_METROPOLITANA_DO_RECIFE',
      prioridade: 'MEDIA',
    }
  );
});

test('envia só os filtros preenchidos', () => {
  assert.deepEqual(buildListParams({ status: 'Resolvida', category: '' }), {
    page: 1,
    limit: 100,
    status: 'RESOLVIDA',
  });
});
