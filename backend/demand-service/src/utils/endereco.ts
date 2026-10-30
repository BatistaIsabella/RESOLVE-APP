// Reduz a precisão das coordenadas que vêm junto do endereço (4+ casas decimais ≈ 10 m)
// para 3 casas (≈ 100 m). Usado onde o endereço é visto por quem não é gestor.
export function generalizarEndereco(endereco: string): string {
  return endereco.replace(/-?\d{1,3}\.\d{4,}/g, (numero) => Number(numero).toFixed(3));
}
