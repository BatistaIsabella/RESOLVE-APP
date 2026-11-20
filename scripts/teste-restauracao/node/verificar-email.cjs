// Verificação B: um e-mail restaurado volta a ser legível com as chaves de produção.
// Roda dentro do container do auth-service (node - < verificar-email.cjs) e usa as utilidades
// compiladas do próprio serviço: nenhuma linha de AES ou HMAC é reimplementada aqui.
const { PrismaClient } = require('@prisma/client');
const { revelarEmail, emailEstaProtegido, hashDoEmail } = require('/app/dist/utils/emailProtegido');

// Só o formato; a mesma ideia da validação do cadastro.
const FORMATO_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function resultado(ok, mensagem) {
  console.log(mensagem);
  process.exitCode = ok ? 0 : 1;
}

async function main() {
  for (const nome of ['DADOS_ENCRYPTION_KEY', 'EMAIL_HASH_KEY']) {
    if (!process.env[nome]) return resultado(false, `${nome} vazia dentro do auth-service`);
  }

  const prisma = new PrismaClient();
  try {
    // Leitura crua da coluna, sem a camada do serviço que já decifra.
    const linhas = await prisma.$queryRaw`
      SELECT id, email, email_hash FROM auth.usuarios WHERE email LIKE 'enc:v1:%' ORDER BY id LIMIT 1`;
    if (linhas.length === 0) {
      return resultado(false, 'nenhum usuário com e-mail cifrado (enc:v1:) na base restaurada');
    }

    const { id, email: gravado, email_hash: hashGravado } = linhas[0];
    if (!emailEstaProtegido(gravado)) return resultado(false, `usuário ${id}: e-mail não está cifrado`);

    let email;
    try {
      email = revelarEmail(gravado);
    } catch (erro) {
      return resultado(false, `usuário ${id}: não decifrou (${erro.message}); DADOS_ENCRYPTION_KEY não é a do dump?`);
    }
    if (!FORMATO_EMAIL.test(email)) return resultado(false, `usuário ${id}: decifrou, mas o resultado não tem formato de e-mail`);

    // Confere também a chave do HMAC: sem ela o login deixaria de achar a conta.
    if (hashGravado && hashDoEmail(email) !== hashGravado) {
      return resultado(false, `usuário ${id}: e-mail decifrou, mas o email_hash não confere; EMAIL_HASH_KEY não é a do dump?`);
    }

    const conferido = hashGravado ? ' e email_hash conferido' : ' (sem email_hash para conferir)';
    resultado(true, `usuário ${id}: e-mail decifrado com formato válido${conferido}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((erro) => resultado(false, `erro inesperado: ${erro.message}`));
