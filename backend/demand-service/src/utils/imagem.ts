import { httpError } from './httpError';

// As fotos chegam como texto (data URI em base64) e ficam no banco. Antes de gravar, confere o formato,
// o tamanho, a quantidade e se o conteúdo é mesmo uma imagem, para não aceitar qualquer texto como foto.
const PADRAO_DATA_URI = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/;

const TIPOS_ACEITOS = 'JPEG, PNG ou WEBP';

function numeroDoAmbiente(nome: string, padrao: number): number {
  const valor = Number(process.env[nome]);
  return Number.isFinite(valor) && valor > 0 ? valor : padrao;
}

export const imagens = {
  maxPorDenuncia: () => numeroDoAmbiente('IMAGENS_MAX_POR_DENUNCIA', 5),
  maxBytes: () => numeroDoAmbiente('IMAGEM_MAX_BYTES', 2 * 1024 * 1024),
};

// Os primeiros bytes de cada formato. O tipo declarado no prefixo precisa bater com o conteúdo.
function assinaturaConfere(tipo: string, base64: string): boolean {
  const inicio = Buffer.from(base64.slice(0, 24), 'base64');

  if (tipo === 'jpeg') return inicio.length >= 3 && inicio[0] === 0xff && inicio[1] === 0xd8 && inicio[2] === 0xff;
  if (tipo === 'png') {
    return inicio.length >= 8 && inicio.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  }
  // webp: "RIFF" + 4 bytes de tamanho + "WEBP"
  return inicio.length >= 12 && inicio.subarray(0, 4).toString('ascii') === 'RIFF' && inicio.subarray(8, 12).toString('ascii') === 'WEBP';
}

function bytesDoBase64(base64: string): number {
  const preenchimento = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
  return Math.floor((base64.length * 3) / 4) - preenchimento;
}

export function validarImagens(entrada: unknown): string[] | undefined {
  if (entrada === undefined || entrada === null) return undefined;
  if (!Array.isArray(entrada)) throw httpError('imagens deve ser uma lista', 400);

  const maximo = imagens.maxPorDenuncia();
  if (entrada.length > maximo) {
    throw httpError(`Envie no máximo ${maximo} foto(s) por denúncia`, 400);
  }

  entrada.forEach((foto, i) => {
    const numero = i + 1;
    if (typeof foto !== 'string') throw httpError(`Foto ${numero} inválida`, 400);

    const partes = PADRAO_DATA_URI.exec(foto);
    if (!partes) throw httpError(`Foto ${numero} inválida: use uma imagem ${TIPOS_ACEITOS} em base64`, 400);

    const [, tipo, base64] = partes;
    if (bytesDoBase64(base64) > imagens.maxBytes()) {
      const mb = Math.round((imagens.maxBytes() / (1024 * 1024)) * 10) / 10;
      throw httpError(`Foto ${numero} muito grande: o máximo é ${mb} MB`, 413);
    }
    if (!assinaturaConfere(tipo, base64)) {
      throw httpError(`Foto ${numero} inválida: o conteúdo não é uma imagem ${tipo.toUpperCase()}`, 400);
    }
  });

  return entrada as string[];
}
