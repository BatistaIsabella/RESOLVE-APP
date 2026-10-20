export type HttpError = Error & { status: number; detalhes?: string[] };

export function httpError(mensagem: string, status: number, detalhes?: string[]): HttpError {
  const err = new Error(mensagem) as HttpError;
  err.status = status;
  if (detalhes) err.detalhes = detalhes;
  return err;
}
