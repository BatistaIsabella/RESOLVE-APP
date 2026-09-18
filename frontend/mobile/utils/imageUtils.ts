import { File } from 'expo-file-system';

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
