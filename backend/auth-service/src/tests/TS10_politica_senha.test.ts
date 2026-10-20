import { describe, it, expect, afterEach, afterAll, vi } from 'vitest';
import { createHash } from 'crypto';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import app from '../app';
import { validarPoliticaSenha } from '../utils/senha';
import { senhaVazada } from '../services/senhaVazada';
import { SENHA_FORTE, TERMOS } from './helpers/dados';

const prisma = new PrismaClient();
const sufixo = Date.now();
const emailsCriados: string[] = [];

afterEach(() => {
  vi.unstubAllGlobals();
  process.env.HIBP_ENABLED = 'false';
});

afterAll(async () => {
  await prisma.usuario.deleteMany({ where: { email: { in: emailsCriados } } });
  await prisma.$disconnect();
});

function cadastrar(corpo: Record<string, unknown>) {
  const email = `ts10.${emailsCriados.length}.${sufixo}@test.com`;
  emailsCriados.push(email);
  return request(app)
    .post('/auth/register')
    .send({ nome: 'Pessoa Teste', email, papel: 'cidadao', ...TERMOS, ...corpo });
}

describe('TS10 - Política de senha', () => {
  describe('regras da função validarPoliticaSenha', () => {
    it('aceita uma senha com 12+ caracteres, maiúscula, minúscula, número e símbolo', () => {
      expect(validarPoliticaSenha(SENHA_FORTE)).toEqual([]);
    });

    it.each([
      ['Curta#1aA', /pelo menos 12 caracteres/],
      ['azul#montanha2026!', /maiúscula/],
      ['AZUL#MONTANHA2026!', /minúscula/],
      ['Azul#Montanha!!!!', /número/],
      ['AzulMontanha2026x', /caractere especial/],
    ])('recusa "%s"', (senha, mensagem) => {
      const erros = validarPoliticaSenha(senha);
      expect(erros.some((e) => mensagem.test(e))).toBe(true);
    });

    it('recusa senha acima de 72 bytes (limite do bcrypt)', () => {
      const erros = validarPoliticaSenha('Aa1#' + 'x'.repeat(80));
      expect(erros.some((e) => /72 bytes/.test(e))).toBe(true);
    });

    it.each(['Senha@123456', 'Password#202612', 'Brasil@2026!!', 'Qwerty#123456', 'Resolve#2026!!'])(
      'recusa senha comum "%s" mesmo cumprindo as regras de composição',
      (senha) => {
        expect(validarPoliticaSenha(senha).some((e) => /muito comum/.test(e))).toBe(true);
      }
    );

    it('recusa senha com o mesmo caractere repetido', () => {
      const erros = validarPoliticaSenha('Aaaaaaa#1bcdef');
      expect(erros.some((e) => /repetido/.test(e))).toBe(true);
    });

    it('recusa senha que contém o nome ou o e-mail do usuário', () => {
      expect(validarPoliticaSenha('Gabriel#Forte2026!', { nome: 'Gabriel Souza' }).length).toBeGreaterThan(0);
      expect(validarPoliticaSenha('Maria.Lima#2026ab', { email: 'maria.lima@teste.com' }).length).toBeGreaterThan(0);
    });

    it('recusa valores que não são texto', () => {
      expect(validarPoliticaSenha(12345678901234)).toHaveLength(1);
      expect(validarPoliticaSenha(undefined)).toHaveLength(1);
    });
  });

  describe('consulta de senhas vazadas (k-anonymity)', () => {
    it('envia só os 5 primeiros caracteres do SHA-1 e reconhece a senha vazada', async () => {
      process.env.HIBP_ENABLED = 'true';
      const hash = createHash('sha1').update('Senha#Vazada2026').digest('hex').toUpperCase();
      const fetchFalso = vi.fn().mockResolvedValue({
        ok: true,
        text: async () => `0000000000000000000000000000000000A:3\n${hash.slice(5)}:1520\nFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF:0`,
      });
      vi.stubGlobal('fetch', fetchFalso);

      expect(await senhaVazada('Senha#Vazada2026')).toBe(true);
      expect(fetchFalso.mock.calls[0][0]).toBe(`https://api.pwnedpasswords.com/range/${hash.slice(0, 5)}`);
      expect(String(fetchFalso.mock.calls[0][0])).not.toContain(hash.slice(5));
    });

    it('não bloqueia senha que não aparece na lista (ocorrências 0 são ignoradas)', async () => {
      process.env.HIBP_ENABLED = 'true';
      const hash = createHash('sha1').update(SENHA_FORTE).digest('hex').toUpperCase();
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({ ok: true, text: async () => `${hash.slice(5)}:0\nAAAA:5` })
      );

      expect(await senhaVazada(SENHA_FORTE)).toBe(false);
    });

    it('se o serviço estiver fora do ar, não impede o cadastro', async () => {
      process.env.HIBP_ENABLED = 'true';
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('sem rede')));

      expect(await senhaVazada(SENHA_FORTE)).toBe(false);
    });
  });

  describe('aplicação no cadastro', () => {
    it('rejeita senha fraca com 400 e a lista de motivos', async () => {
      const res = await cadastrar({ senha: 'senha123' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/política de segurança/i);
      expect(res.body.detalhes.length).toBeGreaterThan(1);
    });

    it('rejeita senha que apareceu em vazamento', async () => {
      process.env.HIBP_ENABLED = 'true';
      const hash = createHash('sha1').update('Cavalo#Bateria2026').digest('hex').toUpperCase();
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, text: async () => `${hash.slice(5)}:42` }));

      const res = await cadastrar({ senha: 'Cavalo#Bateria2026' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/vazamentos/i);
    });

    it('aceita senha forte', async () => {
      const res = await cadastrar({ senha: SENHA_FORTE });

      expect(res.status).toBe(201);
    });

    it('não devolve nem registra a senha em nenhuma resposta', async () => {
      const res = await cadastrar({ senha: 'curta' });

      expect(JSON.stringify(res.body)).not.toContain('curta');
    });

    it('exige o aceite da Política de Privacidade e dos Termos de Uso', async () => {
      const semAceite = await cadastrar({ senha: SENHA_FORTE, aceiteTermos: false });
      const versaoErrada = await cadastrar({ senha: SENHA_FORTE, versaoTermos: '0.1' });

      expect(semAceite.status).toBe(400);
      expect(semAceite.body.error).toMatch(/aceitar/i);
      expect(versaoErrada.status).toBe(400);
    });

    it('grava o aceite com data e versão', async () => {
      const res = await cadastrar({ senha: SENHA_FORTE });
      const usuario = await prisma.usuario.findUnique({ where: { id: res.body.id } });

      expect(usuario?.versao_termos).toBe('1.0');
      expect(usuario?.aceite_termos_em).toBeInstanceOf(Date);
    });

    it('guarda a senha apenas como hash bcrypt', async () => {
      const res = await cadastrar({ senha: SENHA_FORTE });
      const usuario = await prisma.usuario.findUnique({ where: { id: res.body.id } });

      expect(usuario?.senha).toMatch(/^\$2[aby]\$/);
      expect(usuario?.senha).not.toContain(SENHA_FORTE);
    });
  });
});
