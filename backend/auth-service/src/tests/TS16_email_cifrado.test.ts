import { describe, it, expect, beforeEach, afterEach, afterAll } from 'vitest';
import request from 'supertest';
import { createHash } from 'crypto';
import { PrismaClient } from '@prisma/client';
import app from '../app';
import { validarConfiguracao } from '../config/env';
import { migrarEmailsLegados } from '../services/migracaoEmailService';
import { emailEstaProtegido, hashDoEmail, protegerEmail, revelarEmail } from '../utils/emailProtegido';
import { limparRedisFalso } from './helpers/redisFalso';
import { SENHA_FORTE, TERMOS } from './helpers/dados';

const prisma = new PrismaClient();
const sufixo = Date.now();
const emailsCriados: string[] = [];
let contador = 0;

function novoEmail() {
  const email = `ts16.${contador++}.${sufixo}@test.com`;
  emailsCriados.push(email);
  return email;
}

const cadastrar = (email: string) =>
  request(app).post('/auth/register').send({ nome: 'Pessoa Cifrada', email, senha: SENHA_FORTE, papel: 'cidadao', ...TERMOS });
const entrar = (email: string, senha = SENHA_FORTE) => request(app).post('/auth/login').send({ email, senha });
const noBanco = (email: string) => prisma.usuario.findUnique({ where: { email_hash: hashDoEmail(email) } });

beforeEach(() => limparRedisFalso());

afterAll(async () => {
  await prisma.usuario.deleteMany({ where: { email_hash: { in: emailsCriados.map(hashDoEmail) } } });
  await prisma.$disconnect();
});

describe('TS16 - E-mail cifrado em repouso', () => {
  describe('gravação', () => {
    it('não deixa o e-mail legível no banco', async () => {
      const email = novoEmail();
      await cadastrar(email);

      const linha = await noBanco(email);

      expect(linha).not.toBeNull();
      expect(linha!.email_cifrado).not.toContain(email);
      expect(linha!.email_cifrado).not.toContain('@');
      expect(emailEstaProtegido(linha!.email_cifrado)).toBe(true);
      expect(revelarEmail(linha!.email_cifrado)).toBe(email);
    });

    it('guarda um valor de busca que não é o SHA-256 simples do e-mail', async () => {
      const email = novoEmail();
      await cadastrar(email);

      const linha = await noBanco(email);

      expect(linha!.email_hash).toMatch(/^[0-9a-f]{64}$/);
      expect(linha!.email_hash).not.toBe(createHash('sha256').update(email).digest('hex'));
    });

    it('cifra de forma diferente a cada gravação (IV aleatório)', () => {
      const email = novoEmail();

      expect(protegerEmail(email)).not.toBe(protegerEmail(email));
    });

    it('não deixa o e-mail legível em consulta direta na coluna', async () => {
      const email = novoEmail();
      await cadastrar(email);

      const linhas = await prisma.$queryRaw<{ email: string }[]>`SELECT email FROM auth.usuarios WHERE email = ${email}`;

      expect(linhas).toHaveLength(0);
    });
  });

  describe('uso normal continua funcionando', () => {
    it('devolve o e-mail em texto no cadastro, no login e em /auth/me', async () => {
      const email = novoEmail();
      const cadastro = await cadastrar(email);
      const login = await entrar(email);
      const conta = await request(app).get('/auth/me').set('Authorization', `Bearer ${login.body.token}`);

      expect(cadastro.body.email).toBe(email);
      expect(login.body.email).toBe(email);
      expect(conta.body.email).toBe(email);
    });

    it('aceita o login com maiúsculas e espaços no e-mail', async () => {
      const email = novoEmail();
      await cadastrar(email);

      const res = await entrar(`  ${email.toUpperCase()} `);

      expect(res.status).toBe(200);
    });

    it('recusa o cadastro do mesmo e-mail com outras maiúsculas', async () => {
      const email = novoEmail();
      await cadastrar(email);

      const res = await cadastrar(email.toUpperCase());

      expect(res.status).toBe(409);
    });

    it('troca o e-mail: o novo entra e o antigo deixa de entrar', async () => {
      const antigo = novoEmail();
      const novo = novoEmail();
      await cadastrar(antigo);
      const login = await entrar(antigo);

      const res = await request(app)
        .patch('/auth/me')
        .set('Authorization', `Bearer ${login.body.token}`)
        .send({ email: novo });

      expect(res.status).toBe(200);
      expect(res.body.conta.email).toBe(novo);
      expect((await entrar(novo)).status).toBe(200);
      expect((await entrar(antigo)).status).toBe(401);
      expect(revelarEmail((await noBanco(novo))!.email_cifrado)).toBe(novo);
    });

    it('recusa trocar para o e-mail de outra conta', async () => {
      const a = novoEmail();
      const b = novoEmail();
      await cadastrar(a);
      await cadastrar(b);
      const login = await entrar(b);

      const res = await request(app).patch('/auth/me').set('Authorization', `Bearer ${login.body.token}`).send({ email: a });

      expect(res.status).toBe(409);
    });
  });

  describe('contas anteriores à criptografia', () => {
    it('migra o e-mail em texto para o formato cifrado e a conta continua entrando', async () => {
      const email = novoEmail();
      const criada = await cadastrar(email);
      // Simula uma conta antiga: e-mail em texto e sem valor de busca.
      await prisma.usuario.update({ where: { id: criada.body.id }, data: { email_cifrado: email, email_hash: null } });
      expect((await entrar(email)).status).toBe(401);

      const total = await migrarEmailsLegados();

      expect(total).toBeGreaterThanOrEqual(1);
      const linha = await noBanco(email);
      expect(emailEstaProtegido(linha!.email_cifrado)).toBe(true);
      expect(linha!.email_cifrado).not.toContain('@');
      expect((await entrar(email)).status).toBe(200);
    });

    it('não altera quem já foi migrado', async () => {
      const email = novoEmail();
      await cadastrar(email);
      const antes = (await noBanco(email))!.email_cifrado;

      await migrarEmailsLegados();

      expect((await noBanco(email))!.email_cifrado).toBe(antes);
    });
  });

  describe('chaves', () => {
    const original = { ...process.env };

    afterEach(() => {
      process.env = { ...original };
    });

    it('o valor de busca muda com a EMAIL_HASH_KEY', () => {
      const email = 'pessoa@test.com';
      const padrao = hashDoEmail(email);

      process.env.EMAIL_HASH_KEY = Buffer.alloc(32, 7).toString('base64');

      expect(hashDoEmail(email)).not.toBe(padrao);
    });

    it('rejeita chave de tamanho errado', () => {
      process.env.DADOS_ENCRYPTION_KEY = Buffer.alloc(16).toString('base64');

      expect(() => protegerEmail('pessoa@test.com')).toThrow('DADOS_ENCRYPTION_KEY');
    });

    it('não decifra com outra chave', () => {
      const cifrado = protegerEmail('pessoa@test.com');

      process.env.DADOS_ENCRYPTION_KEY = Buffer.alloc(32, 9).toString('base64');

      expect(() => revelarEmail(cifrado)).toThrow();
    });

    it('em produção, o serviço não sobe sem as chaves do e-mail', () => {
      process.env.NODE_ENV = 'production';
      process.env.JWT_SECRET = 'segredo-de-producao-do-teste';
      delete process.env.DADOS_ENCRYPTION_KEY;
      delete process.env.EMAIL_HASH_KEY;

      expect(() => validarConfiguracao()).toThrow('DADOS_ENCRYPTION_KEY');

      process.env.DADOS_ENCRYPTION_KEY = Buffer.alloc(32, 1).toString('base64');
      expect(() => validarConfiguracao()).toThrow('EMAIL_HASH_KEY');

      process.env.EMAIL_HASH_KEY = Buffer.alloc(32, 2).toString('base64');
      expect(() => validarConfiguracao()).not.toThrow();
    });
  });
});
