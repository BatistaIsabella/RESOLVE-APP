// Redis em memória com os comandos que o auth-service usa.
// Permite testar a invalidação de sessões sem depender de um servidor Redis.
const dados = new Map<string, string>();

export const redisFalso = {
  async get(chave: string) {
    return dados.get(chave) ?? null;
  },
  async incr(chave: string) {
    const valor = Number(dados.get(chave) ?? 0) + 1;
    dados.set(chave, String(valor));
    return valor;
  },
  async expire() {
    return true;
  },
  async del(chave: string) {
    return dados.delete(chave) ? 1 : 0;
  },
};

export function limparRedisFalso() {
  dados.clear();
}
