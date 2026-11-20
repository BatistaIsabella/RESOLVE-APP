// Popula o ambiente descartável pela API real (gateway), para que e-mails, fotos e histórico sejam
// gravados pelo próprio código dos serviços, sem atalho direto no banco.
// Roda dentro do container do api-gateway:  node - < popular.cjs
// Precisa de GESTOR_CODIGO no ambiente (o código de acesso de gestor configurado no auth-service).
const crypto = require('node:crypto');

const BASE = 'http://127.0.0.1:8080';
const TERMOS = { aceiteTermos: true, versaoTermos: '1.0' };
// PNG 1x1 válido (a API confere a assinatura do arquivo).
const FOTO =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

async function chamar(metodo, caminho, corpo, token) {
  const resposta = await fetch(BASE + caminho, {
    method: metodo,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  const texto = await resposta.text();
  if (!resposta.ok) throw new Error(`${metodo} ${caminho} -> ${resposta.status}: ${texto}`);
  return texto ? JSON.parse(texto) : null;
}

async function conta(papel, extra = {}) {
  const sufixo = crypto.randomBytes(4).toString('hex');
  const email = `${papel}.teste.${sufixo}@example.com`;
  const senha = `Rt-${crypto.randomBytes(12).toString('base64url')}-9a`;
  await chamar('POST', '/auth/register', { nome: `Pessoa ${papel} de teste`, email, senha, papel, ...TERMOS, ...extra });
  const { token } = await chamar('POST', '/auth/login', { email, senha });
  return token;
}

async function main() {
  const codigo = process.env.GESTOR_CODIGO;
  if (!codigo) throw new Error('GESTOR_CODIGO não definido');

  const cidadao = await conta('cidadao');
  const gestor = await conta('gestor', { codigoAcesso: codigo });

  const nova = (titulo, categoria, imagens) =>
    chamar('POST', '/demands/', {
      titulo,
      categoria,
      regiao: 'REGIAO_METROPOLITANA_DO_RECIFE',
      descricao: 'Registro criado para o teste de restauração de backup.',
      endereco: 'Rua de Teste, 100, Boa Vista, Recife',
      ...(imagens ? { imagens } : {}),
    }, cidadao);

  const resolvida = await nova('Poste apagado (teste de backup)', 'ILUMINACAO_PUBLICA', [FOTO]);
  const id = resolvida.id_denuncia ?? resolvida.id ?? resolvida.denuncia?.id_denuncia;
  if (!id) throw new Error(`resposta da criação sem id: ${JSON.stringify(resolvida)}`);

  await chamar('PATCH', `/demands/gestor/${id}/status`, { status: 'EM_ANALISE' }, gestor);
  await chamar('PATCH', `/demands/gestor/${id}/status`, { status: 'RESOLVIDA' }, gestor);

  await nova('Buraco na via (teste de backup)', 'MANUTENCAO_DE_VIAS');

  console.log(`dados de exemplo criados: 2 contas, 2 denúncias (a ${id} RESOLVIDA, com foto e histórico)`);
}

main().catch((erro) => {
  console.error(`falha ao popular: ${erro.message}`);
  process.exit(1);
});
