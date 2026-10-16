import { File } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

// Foto de celular sai com 3000-4000 px e vários MB; o backend só precisa de
// uma imagem legível no detalhe da demanda.
const LADO_MAIOR_MAX = 1280;
const QUALIDADE_JPEG = 0.6;

/**
 * Reduz a foto antes do envio: lado maior em até 1280 px e JPEG ~0.6.
 * Também converte HEIC/PNG da galeria para JPEG, que é o que o backend espera.
 * Se a manipulação falhar, devolve a URI original para não travar o envio.
 */
export async function compressImage(uri: string): Promise<string> {
  try {
    const original = await ImageManipulator.manipulate(uri).renderAsync();
    let imagem = original;

    if (Math.max(original.width, original.height) > LADO_MAIOR_MAX) {
      const tamanho =
        original.width >= original.height
          ? { width: LADO_MAIOR_MAX }
          : { height: LADO_MAIOR_MAX };
      imagem = await ImageManipulator.manipulate(original).resize(tamanho).renderAsync();
    }

    const resultado = await imagem.saveAsync({
      compress: QUALIDADE_JPEG,
      format: SaveFormat.JPEG,
    });
    return resultado.uri;
  } catch {
    return uri;
  }
}

export async function uriToBase64(uri: string): Promise<string> {
  const base64 = await new File(uri).base64();
  const extension = uri.split('.').pop()?.toLowerCase();
  const mime =
    extension === 'png'
      ? 'image/png'
      : extension === 'webp'
        ? 'image/webp'
        : 'image/jpeg';
  return `data:${mime};base64,${base64}`;
}
