import { describe, it, expect, beforeEach, afterEach, afterAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { authenticator } from 'otplib';
import { PrismaClient } from '@prisma/client';
import app from '../app';
import { hashDoEmail } from '../utils/emailProtegido';
import { decifrar } from '../utils/cifra';
import { hashIdentificador } from '../services/auditoriaService';
import { limparRedisFalso } from './helpers/redisFalso';
import { CODIGO_GESTOR, SENHA_FORTE, TERMOS } from './helpers/dados';

const prisma = new PrismaClient();
const sufixo = Date.now();
const emails: string[] = [];
const ENV_ORIGINAL = { ...process.env };

// Código TOTP de um passo de 30 s à frente ou atrás do atual (a API aceita ±1).
const codigoNoPasso = (segredo: string, deslocamento = 0) =>
  authenticator.clone({ epoch: Date.now() + deslocamento * 30_000 }).generate(segredo);

const comToken = (token: string) => ({ Authorization: `Bearer ${token}` });

async function criarGestor(papel: 'gestor' | 'cidadao' = 'gestor') {
  const email = `ts14.${emails.length}.${sufixo}@test.com`;
  emails.push(email);
  const cadastro = await request(app)
    .post('/auth/register')
    .send({ nome: 'Pessoa Dois Fatores', email, senha: SENHA_FORTE, papel, codigoAcesso: CODIGO_GESTOR, ...TERMOS });
  const login = await request(app).post('/auth/login').send({ email, senha: SENHA_FORTE });
  return { email, id: cadastro.body.id as number, token: login.body.token as string };
}

// Configura e ativa a MFA, devolvendo o segredo e os códigos de recuperação.
async function ativarMfa(token: string) {
  const configuracao = await request(app).post('/auth/mfa/configurar').set(comToken(token)).send({});
  const segredo = configuracao.body.segredo as string;
  const ativacao = await request(app).post('/auth/mfa/ativar').set(comToken(token)).send({ codigo: codigoNoPasso(segredo) });
  return { segredo, codigosRecuperacao: ativacao.body.codigosRecuperacao as string[], status: ativacao.status };
}

// O código usado na ativação já "gastou" o passo atual; os testes liberam o passo para poder logar de novo.
const liberarPasso = (id: number) => prisma.usuario.update({ where: { id }, data: { mfa_ultimo_passo: 1 } });

const entrar = (email: string) => request(app).post('/auth/login').send({ email, senha: SENHA_FORTE });

beforeEach(() => limparRedisFalso());

afterEach(() => {
  process.env = { ...ENV_ORIGINAL };
});

afterAll(async () => {
  const usuarios = await prisma.usuario.findMany({ where: { email_hash: { in: emails.map(hashDoEmail) } }, select: { id: true } });
  const ids = usuarios.map((u) => u.id);
  await prisma.eventoAuth.deleteMany({
    where: { OR: [{ usuario_id: { in: ids } }, { identificador: { in: emails.map(hashIdentificador) } }] },
  });
  await prisma.tentativaLogin.deleteMany({
    where: { chave: { in: [...emails.map(hashIdentificador), ...ids.map((id) => hashIdentificador(`mfa:${id}`))] } },
  });
  await prisma.usuario.deleteMany({ where: { email_hash: { in: emails.map(hashDoEmail) } } });
  await prisma.$disconnect();
});

describe('TS14 - Configuração da verificação em duas etapas', () => {
  it('só contas de gestor podem configurar', async () => {
    const { token } = await criarGestor('cidadao');

    const res = await request(app).post('/auth/mfa/configurar').set(comToken(token)).send({});

    expect(res.status).toBe(403);
  });

  it('exige autenticação', async () => {
    const res = await request(app).post('/auth/mfa/configurar').send({});

    expect(res.status).toBe(401);
  });

  it('devolve o segredo e o endereço otpauth para o app autenticador', async () => {
    const { token, email } = await criarGestor();

    const res = await request(app).post('/auth/mfa/configurar').set(comToken(token)).send({});

    expect(res.status).toBe(200);
    expect(res.body.segredo).toMatch(/^[A-Z2-7]{16,}$/);
    expect(res.body.otpauthUri).toContain('otpauth://totp/RESOLVE:');
    expect(res.body.otpauthUri).toContain(`secret=${res.body.segredo}`);
    expect(decodeURIComponent(res.body.otpauthUri)).toContain(email);
  });

  it('guarda o segredo cifrado no banco, nunca em texto', async () => {
    const { token, id } = await criarGestor();
    const res = await request(app).post('/auth/mfa/configurar').set(comToken(token)).send({});

    const usuario = await prisma.usuario.findUnique({ where: { id } });

    expect(usuario?.mfa_segredo).toBeTruthy();
    expect(usuario?.mfa_segredo).not.toContain(res.body.segredo);
    expect(decifrar(usuario!.mfa_segredo!)).toBe(res.body.segredo);
    expect(usuario?.mfa_ativo).toBe(false);
  });

  it('não ativa com código errado nem sem configurar antes', async () => {
    const { token } = await criarGestor();

    const semConfigurar = await request(app).post('/auth/mfa/ativar').set(comToken(token)).send({ codigo: '123456' });
    await request(app).post('/auth/mfa/configurar').set(comToken(token)).send({});
    const errado = await request(app).post('/auth/mfa/ativar').set(comToken(token)).send({ codigo: '000000' });

    expect(semConfigurar.status).toBe(400);
    expect(errado.status).toBe(400);
  });

  it('ativa com o código certo e entrega 8 códigos de recuperação', async () => {
    const { token } = await criarGestor();

    const { status, codigosRecuperacao } = await ativarMfa(token);

    expect(status).toBe(200);
    expect(codigosRecuperacao).toHaveLength(8);
    expect(new Set(codigosRecuperacao).size).toBe(8);
    expect(codigosRecuperacao[0]).toMatch(/^[0-9a-f]{5}-[0-9a-f]{5}$/);

    const conta = await request(app).get('/auth/me').set(comToken(token));
    expect(conta.body.mfa).toMatchObject({ disponivel: true, ativa: true });
  });

  it('os códigos de recuperação ficam só como hash', async () => {
    const { token, id } = await criarGestor();
    const { codigosRecuperacao } = await ativarMfa(token);

    const guardados = await prisma.codigoRecuperacaoMfa.findMany({ where: { usuario_id: id } });

    expect(guardados).toHaveLength(8);
    for (const linha of guardados) {
      expect(codigosRecuperacao.some((c) => linha.codigo_hash.includes(c.replace('-', '')))).toBe(false);
      expect(linha.codigo_hash).toHaveLength(64);
    }
  });

  it('recusa ativar de novo quando já está ativa', async () => {
    const { token } = await criarGestor();
    await ativarMfa(token);

    const res = await request(app).post('/auth/mfa/configurar').set(comToken(token)).send({});

    expect(res.status).toBe(409);
  });
});

describe('TS14 - Login em duas etapas', () => {
  it('com a MFA ativa, a senha sozinha não abre a sessão: devolve só um desafio', async () => {
    const { email, token } = await criarGestor();
    await ativarMfa(token);

    const res = await entrar(email);

    expect(res.status).toBe(200);
    expect(res.body.mfaNecessaria).toBe(true);
    expect(res.body.desafio).toBeTruthy();
    expect(res.body.token).toBeUndefined();
  });

  it('o código do app autenticador conclui o login', async () => {
    const { email, token, id } = await criarGestor();
    const { segredo } = await ativarMfa(token);
    await liberarPasso(id);
    const { desafio } = (await entrar(email)).body;

    const res = await request(app).post('/auth/login/mfa').send({ desafio, codigo: codigoNoPasso(segredo) });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
    expect(res.body.papel).toBe('gestor');
    expect((await request(app).get('/auth/me').set(comToken(res.body.token))).status).toBe(200);
  });

  it('o mesmo código não vale duas vezes', async () => {
    const { email, token, id } = await criarGestor();
    const { segredo } = await ativarMfa(token);
    await liberarPasso(id);
    const codigo = codigoNoPasso(segredo);

    const primeiro = await request(app).post('/auth/login/mfa').send({ desafio: (await entrar(email)).body.desafio, codigo });
    const segundo = await request(app).post('/auth/login/mfa').send({ desafio: (await entrar(email)).body.desafio, codigo });

    expect(primeiro.status).toBe(200);
    expect(segundo.status).toBe(401);
  });

  it('o código da ativação também não pode ser reaproveitado no login', async () => {
    const { email, token } = await criarGestor();
    const configuracao = await request(app).post('/auth/mfa/configurar').set(comToken(token)).send({});
    const codigo = codigoNoPasso(configuracao.body.segredo);
    await request(app).post('/auth/mfa/ativar').set(comToken(token)).send({ codigo });

    const res = await request(app).post('/auth/login/mfa').send({ desafio: (await entrar(email)).body.desafio, codigo });

    expect(res.status).toBe(401);
  });

  it('recusa código errado, vazio ou em formato inválido', async () => {
    const { email, token } = await criarGestor();
    await ativarMfa(token);
    const { desafio } = (await entrar(email)).body;

    const errado = await request(app).post('/auth/login/mfa').send({ desafio, codigo: '000000' });
    const lixo = await request(app).post('/auth/login/mfa').send({ desafio, codigo: 'abc' });
    const vazio = await request(app).post('/auth/login/mfa').send({ desafio });

    expect(errado.status).toBe(401);
    expect(lixo.status).toBe(401);
    expect(vazio.status).toBe(400);
  });

  it('bloqueia depois de 3 códigos errados, mesmo que o próximo esteja certo', async () => {
    const { email, token, id } = await criarGestor();
    const { segredo } = await ativarMfa(token);
    await liberarPasso(id);
    const { desafio } = (await entrar(email)).body;

    for (let i = 0; i < 3; i++) {
      expect((await request(app).post('/auth/login/mfa').send({ desafio, codigo: '000000' })).status).toBe(401);
    }
    const bloqueado = await request(app).post('/auth/login/mfa').send({ desafio, codigo: codigoNoPasso(segredo) });

    expect(bloqueado.status).toBe(429);
  });

  it('desafio adulterado ou de outro tipo é recusado', async () => {
    const { email, token } = await criarGestor();
    await ativarMfa(token);
    const { desafio } = (await entrar(email)).body;

    const adulterado = await request(app).post('/auth/login/mfa').send({ desafio: `${desafio}x`, codigo: '123456' });
    const comoSessao = jwt.sign({ userId: 1, tipo: 'login' }, 'qualquer-outro-segredo');
    const outroSegredo = await request(app).post('/auth/login/mfa').send({ desafio: comoSessao, codigo: '123456' });
    const paraConfigurar = await request(app).post('/auth/mfa/configurar').send({ desafio });

    expect(adulterado.status).toBe(401);
    expect(outroSegredo.status).toBe(401);
    expect(paraConfigurar.status).toBe(401);
  });

  it('o desafio não funciona como sessão em nenhuma rota', async () => {
    const { email, token } = await criarGestor();
    await ativarMfa(token);
    const { desafio } = (await entrar(email)).body;

    const res = await request(app).get('/auth/me').set(comToken(desafio));

    expect(res.status).toBe(401);
  });

  it('contas sem MFA continuam entrando só com a senha', async () => {
    const cidadao = await criarGestor('cidadao');
    const gestorSem = await criarGestor();

    expect((await entrar(cidadao.email)).body.token).toBeTruthy();
    expect((await entrar(gestorSem.email)).body.token).toBeTruthy();
  });
});

describe('TS14 - Códigos de recuperação', () => {
  it('cada código vale uma vez, com ou sem hífen e em maiúsculas', async () => {
    const { email, token, id } = await criarGestor();
    const { codigosRecuperacao } = await ativarMfa(token);
    await liberarPasso(id);

    const [primeiro, segundo] = codigosRecuperacao;
    const comHifen = await request(app).post('/auth/login/mfa').send({ desafio: (await entrar(email)).body.desafio, codigo: primeiro });
    const repetido = await request(app).post('/auth/login/mfa').send({ desafio: (await entrar(email)).body.desafio, codigo: primeiro });
    const formatoLivre = await request(app)
      .post('/auth/login/mfa')
      .send({ desafio: (await entrar(email)).body.desafio, codigo: ` ${segundo.replace('-', '').toUpperCase()} ` });

    expect(comHifen.status).toBe(200);
    expect(repetido.status).toBe(401);
    expect(formatoLivre.status).toBe(200);
  });

  it('código inventado é recusado', async () => {
    const { email, token } = await criarGestor();
    await ativarMfa(token);

    const res = await request(app).post('/auth/login/mfa').send({ desafio: (await entrar(email)).body.desafio, codigo: 'aaaaa-bbbbb' });

    expect(res.status).toBe(401);
  });
});

describe('TS14 - Desativação', () => {
  it('exige a senha e um código válido', async () => {
    const { token, id } = await criarGestor();
    const { segredo } = await ativarMfa(token);
    await liberarPasso(id);

    const semSenha = await request(app).post('/auth/mfa/desativar').set(comToken(token)).send({ senha: 'errada', codigo: codigoNoPasso(segredo) });
    const semCodigo = await request(app).post('/auth/mfa/desativar').set(comToken(token)).send({ senha: SENHA_FORTE, codigo: '000000' });

    expect(semSenha.status).toBe(403);
    expect(semCodigo.status).toBe(401);
    expect((await prisma.usuario.findUnique({ where: { id } }))?.mfa_ativo).toBe(true);
  });

  it('desativa, apaga segredo e códigos e encerra as sessões', async () => {
    const { token, id, email } = await criarGestor();
    const { segredo } = await ativarMfa(token);
    await liberarPasso(id);

    const res = await request(app)
      .post('/auth/mfa/desativar')
      .set(comToken(token))
      .send({ senha: SENHA_FORTE, codigo: codigoNoPasso(segredo) });

    expect(res.status).toBe(204);
    const usuario = await prisma.usuario.findUnique({ where: { id } });
    expect(usuario).toMatchObject({ mfa_ativo: false, mfa_segredo: null, mfa_ultimo_passo: null });
    expect(await prisma.codigoRecuperacaoMfa.count({ where: { usuario_id: id } })).toBe(0);
    expect((await request(app).get('/auth/me').set(comToken(token))).status).toBe(401);
    expect((await entrar(email)).body.token).toBeTruthy();
  });

  it('aceita um código de recuperação no lugar do código do app (celular perdido)', async () => {
    const { token, id } = await criarGestor();
    const { codigosRecuperacao } = await ativarMfa(token);

    const res = await request(app)
      .post('/auth/mfa/desativar')
      .set(comToken(token))
      .send({ senha: SENHA_FORTE, codigo: codigosRecuperacao[0] });

    expect(res.status).toBe(204);
    expect((await prisma.usuario.findUnique({ where: { id } }))?.mfa_ativo).toBe(false);
  });
});

describe('TS14 - MFA obrigatória para gestores', () => {
  it('gestor sem MFA recebe um desafio de configuração em vez da sessão', async () => {
    const { email } = await criarGestor();
    process.env.MFA_OBRIGATORIO_GESTOR = 'true';

    const res = await entrar(email);

    expect(res.body.mfaConfiguracaoNecessaria).toBe(true);
    expect(res.body.desafio).toBeTruthy();
    expect(res.body.token).toBeUndefined();
  });

  it('configurar e ativar pelo desafio já conclui o login', async () => {
    const { email } = await criarGestor();
    process.env.MFA_OBRIGATORIO_GESTOR = 'true';
    const { desafio } = (await entrar(email)).body;

    const configuracao = await request(app).post('/auth/mfa/configurar').send({ desafio });
    const ativacao = await request(app).post('/auth/mfa/ativar').send({ desafio, codigo: codigoNoPasso(configuracao.body.segredo) });

    expect(ativacao.status).toBe(200);
    expect(ativacao.body.codigosRecuperacao).toHaveLength(8);
    expect(ativacao.body.login.token).toBeTruthy();
    expect((await request(app).get('/auth/me').set(comToken(ativacao.body.login.token))).body.mfa.ativa).toBe(true);
  });

  it('o desafio de login (de quem já tem MFA) não serve para configurar', async () => {
    const { email, token } = await criarGestor();
    await ativarMfa(token);
    const { desafio } = (await entrar(email)).body;

    const res = await request(app).post('/auth/mfa/configurar').send({ desafio });

    expect(res.status).toBe(401);
  });

  it('cidadão não é afetado', async () => {
    const { email } = await criarGestor('cidadao');
    process.env.MFA_OBRIGATORIO_GESTOR = 'true';

    expect((await entrar(email)).body.token).toBeTruthy();
  });

  it('a conta informa que a MFA é obrigatória', async () => {
    const { token } = await criarGestor();
    process.env.MFA_OBRIGATORIO_GESTOR = 'true';

    const res = await request(app).get('/auth/me').set(comToken(token));

    expect(res.body.mfa).toMatchObject({ disponivel: true, ativa: false, obrigatoria: true });
  });
});

describe('TS14 - Chave de cifra do segredo', () => {
  it('em produção, sem MFA_ENCRYPTION_KEY, a configuração fica indisponível (503)', async () => {
    const { token } = await criarGestor();
    const usuarioId = (await prisma.usuario.findFirst({ where: { email_hash: hashDoEmail(emails[emails.length - 1]) } }))!.id;
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'segredo-de-producao-do-teste';
    delete process.env.MFA_ENCRYPTION_KEY;

    const res = await request(app).post('/auth/mfa/configurar').set(comToken(jwt.sign({ userId: 0 }, 'x'))).send({});
    expect(res.status).toBe(401);

    const sessaoValida = jwt.sign(
      { userId: usuarioId, papel: 'gestor', email: 'x' },
      'segredo-de-producao-do-teste'
    );
    const indisponivel = await request(app).post('/auth/mfa/configurar').set(comToken(sessaoValida)).send({});

    expect(indisponivel.status).toBe(503);
    void token;
  });

  it('com chave configurada, cifra e decifra', async () => {
    process.env.MFA_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64');
    const { token, id } = await criarGestor();

    const res = await request(app).post('/auth/mfa/configurar').set(comToken(token)).send({});
    const usuario = await prisma.usuario.findUnique({ where: { id } });

    expect(decifrar(usuario!.mfa_segredo!)).toBe(res.body.segredo);
  });
});

describe('TS14 - Recurso desligado (MFA_HABILITADO diferente de true)', () => {
  it('ninguém consegue configurar nem ativar', async () => {
    const { token } = await criarGestor();
    process.env.MFA_HABILITADO = 'false';

    const configurar = await request(app).post('/auth/mfa/configurar').set(comToken(token)).send({});
    const ativar = await request(app).post('/auth/mfa/ativar').set(comToken(token)).send({ codigo: '123456' });

    expect(configurar.status).toBe(403);
    expect(ativar.status).toBe(403);
  });

  it('a conta informa que a MFA não está disponível, e o app esconde a opção', async () => {
    const { token } = await criarGestor();
    delete process.env.MFA_HABILITADO;

    const res = await request(app).get('/auth/me').set(comToken(token));

    expect(res.body.mfa).toMatchObject({ disponivel: false, ativa: false, obrigatoria: false });
  });

  it('o login do gestor segue só com e-mail e senha, mesmo com MFA_OBRIGATORIO_GESTOR ligada', async () => {
    const { email } = await criarGestor();
    delete process.env.MFA_HABILITADO;
    process.env.MFA_OBRIGATORIO_GESTOR = 'true';

    const res = await entrar(email);

    expect(res.body.token).toBeTruthy();
    expect(res.body.mfaConfiguracaoNecessaria).toBeUndefined();
  });

  it('quem já tinha a MFA ativa continua sendo desafiado e ainda vê a opção para desativar', async () => {
    const { email, token } = await criarGestor();
    await ativarMfa(token);
    process.env.MFA_HABILITADO = 'false';

    const login = await entrar(email);
    const conta = await request(app).get('/auth/me').set(comToken(token));

    expect(login.body.mfaNecessaria).toBe(true);
    expect(conta.body.mfa).toMatchObject({ disponivel: true, ativa: true });
  });
});

describe('TS14 - Registro de eventos e exclusão', () => {
  it('registra desafio, ativação, código recusado e desativação, sem guardar códigos nem segredo', async () => {
    const { email, token, id } = await criarGestor();
    const { segredo, codigosRecuperacao } = await ativarMfa(token);
    await liberarPasso(id);
    const { desafio } = (await entrar(email)).body;
    await request(app).post('/auth/login/mfa').send({ desafio, codigo: '000000' });
    await request(app)
      .post('/auth/mfa/desativar')
      .set(comToken(token))
      .send({ senha: SENHA_FORTE, codigo: codigosRecuperacao[0] });

    const eventos = await prisma.eventoAuth.findMany({ where: { usuario_id: id } });
    const tipos = eventos.map((e) => e.tipo);
    const texto = JSON.stringify(eventos);

    expect(tipos).toEqual(expect.arrayContaining(['MFA_ATIVADA', 'MFA_DESAFIO', 'MFA_CODIGO_RECUSADO', 'MFA_RECUPERACAO_USADA', 'MFA_DESATIVADA']));
    expect(texto).not.toContain(segredo);
    expect(texto).not.toContain(codigosRecuperacao[0]);
    expect(texto).not.toContain('000000');
  });

  it('excluir a conta apaga também os códigos de recuperação', async () => {
    const { token, id } = await criarGestor();
    await ativarMfa(token);
    const original = globalThis.fetch;
    globalThis.fetch = (async () => ({ ok: true })) as unknown as typeof fetch;

    try {
      const res = await request(app).delete('/auth/me').set(comToken(token)).send({ senha: SENHA_FORTE });
      expect(res.status).toBe(204);
    } finally {
      globalThis.fetch = original;
    }

    expect(await prisma.codigoRecuperacaoMfa.count({ where: { usuario_id: id } })).toBe(0);
  });
});
