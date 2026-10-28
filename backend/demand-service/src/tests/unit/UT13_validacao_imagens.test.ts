import { describe, it, expect, afterEach } from 'vitest';
import { validarImagens } from '../../utils/imagem';

const JPEG = [0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46];
const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d];
const WEBP = [0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50, 0x56, 0x50];

const uri = (tipo: string, bytes: number[], extras = 0) =>
  `data:image/${tipo};base64,${Buffer.from([...bytes, ...new Array(extras).fill(1)]).toString('base64')}`;

const erroDe = (entrada: unknown) => {
  try {
    validarImagens(entrada);
  } catch (err) {
    return err as Error & { status: number };
  }
  return null;
};

afterEach(() => {
  delete process.env.IMAGENS_MAX_POR_DENUNCIA;
  delete process.env.IMAGEM_MAX_BYTES;
});

describe('UT13 - Validação das fotos da denúncia', () => {
  describe('o que é aceito', () => {
    it('sem fotos devolve undefined', () => {
      expect(validarImagens(undefined)).toBeUndefined();
      expect(validarImagens(null)).toBeUndefined();
    });

    it('lista vazia é aceita', () => {
      expect(validarImagens([])).toEqual([]);
    });

    it.each([
      ['jpeg', JPEG],
      ['png', PNG],
      ['webp', WEBP],
    ])('aceita %s com o conteúdo do mesmo formato', (tipo, bytes) => {
      const foto = uri(tipo, bytes);

      expect(validarImagens([foto])).toEqual([foto]);
    });
  });

  describe('formato', () => {
    it('recusa quando imagens não é uma lista', () => {
      expect(erroDe('foto')?.status).toBe(400);
      expect(erroDe({ 0: 'foto' })?.status).toBe(400);
    });

    it('recusa item que não é texto', () => {
      expect(erroDe([123])?.status).toBe(400);
      expect(erroDe([null])?.status).toBe(400);
    });

    it.each([
      ['nome de arquivo', 'foto.jpg'],
      ['texto qualquer', 'qualquer coisa'],
      ['URL', 'https://exemplo.com/foto.jpg'],
      ['tipo não aceito (gif)', `data:image/gif;base64,${Buffer.from([0x47, 0x49, 0x46]).toString('base64')}`],
      ['svg (pode carregar script)', `data:image/svg+xml;base64,${Buffer.from('<svg onload="x()"/>').toString('base64')}`],
      ['html', `data:text/html;base64,${Buffer.from('<script>x()</script>').toString('base64')}`],
      ['sem base64', 'data:image/png,abc'],
      ['base64 com caracteres inválidos', 'data:image/png;base64,@@@@'],
      ['vazio', 'data:image/png;base64,'],
    ])('recusa %s', (_nome, foto) => {
      expect(erroDe([foto])?.status).toBe(400);
    });

    it('diz qual foto está inválida', () => {
      const erro = erroDe([uri('jpeg', JPEG), 'foto.jpg']);

      expect(erro?.message).toContain('Foto 2');
    });
  });

  describe('conteúdo', () => {
    it('recusa quando o conteúdo não é do formato declarado', () => {
      expect(erroDe([uri('png', JPEG)])?.status).toBe(400);
      expect(erroDe([uri('jpeg', PNG)])?.status).toBe(400);
      expect(erroDe([uri('webp', JPEG)])?.status).toBe(400);
    });

    it('recusa texto disfarçado de imagem', () => {
      const falsa = `data:image/jpeg;base64,${Buffer.from('<script>alert(1)</script>').toString('base64')}`;

      expect(erroDe([falsa])?.status).toBe(400);
    });

    it('recusa um executável com o prefixo de imagem', () => {
      const exe = `data:image/png;base64,${Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00]).toString('base64')}`;

      expect(erroDe([exe])?.status).toBe(400);
    });
  });

  describe('tamanho e quantidade', () => {
    it('recusa foto acima do limite com 413', () => {
      process.env.IMAGEM_MAX_BYTES = '100';

      const erro = erroDe([uri('jpeg', JPEG, 200)]);

      expect(erro?.status).toBe(413);
      expect(erro?.message).toContain('muito grande');
    });

    it('aceita foto exatamente no limite', () => {
      const foto = uri('jpeg', JPEG, 90);
      process.env.IMAGEM_MAX_BYTES = String(JPEG.length + 90);

      expect(erroDe([foto])).toBeNull();
    });

    it('recusa quando passa de uma unidade o limite', () => {
      const foto = uri('jpeg', JPEG, 91);
      process.env.IMAGEM_MAX_BYTES = String(JPEG.length + 90);

      expect(erroDe([foto])?.status).toBe(413);
    });

    it('recusa mais fotos do que o limite', () => {
      process.env.IMAGENS_MAX_POR_DENUNCIA = '2';
      const foto = uri('jpeg', JPEG);

      expect(erroDe([foto, foto])).toBeNull();
      expect(erroDe([foto, foto, foto])?.status).toBe(400);
    });

    it('por padrão aceita até 5 fotos de até 2 MB', () => {
      const foto = uri('jpeg', JPEG, 2 * 1024 * 1024 - JPEG.length);
      const cinco = [foto, foto, foto, foto, foto];

      expect(erroDe(cinco)).toBeNull();
      expect(erroDe([...cinco, foto])?.status).toBe(400);
      expect(erroDe([uri('jpeg', JPEG, 2 * 1024 * 1024)])?.status).toBe(413);
    });
  });
});
