#!/usr/bin/env bash
# Gera um dump de TESTE, com dados fictícios, para validar o rodar.sh sem depender de produção.
#
# Uso:
#   export DADOS_ENCRYPTION_KEY="$(openssl rand -base64 32)"
#   export EMAIL_HASH_KEY="$(openssl rand -base64 32)"
#   ./scripts/teste-restauracao/gerar-dump-teste.sh [arquivo-de-saida.custom]
#
# Use as MESMAS duas chaves depois, no rodar.sh. Sobe o backend/docker-compose.yml em um projeto
# próprio (resolve-dump-teste), sem portas publicadas e com volumes próprios, popula pela API (contas,
# uma denúncia RESOLVIDA com foto e histórico, outra aberta), gera o dump no mesmo formato do backup
# (pg_dump --format=custom, schemas auth e demand) e remove tudo no final.
set -euo pipefail
. "$(dirname "${BASH_SOURCE[0]}")/comum.sh"

export COMPOSE_PROJECT_NAME="resolve-dump-teste"
SAIDA="${1:-$DIR_SCRIPTS/saida/dump-teste-$(date +%Y%m%d-%H%M%S).custom}"

exigir_chaves
command -v docker >/dev/null || falhar "docker não encontrado"

# Código de gestor só deste ambiente descartável.
export GESTOR_ACCESS_CODE="codigo-teste-restauracao"

limpar() {
  echo "Removendo o ambiente $COMPOSE_PROJECT_NAME e os volumes dele..."
  dc down -v --remove-orphans >/dev/null 2>&1 || echo "AVISO: não consegui remover o ambiente; rode: docker compose -p $COMPOSE_PROJECT_NAME down -v" >&2
}
trap limpar EXIT

# Começa de um volume vazio, mesmo que uma execução anterior tenha sido interrompida.
dc down -v --remove-orphans >/dev/null 2>&1 || true

echo "Subindo o ambiente $COMPOSE_PROJECT_NAME..."
esperar_saudaveis
dc up -d --build auth-service demand-service metrics-service api-gateway

saude="$(esperar_gateway 240)"
[[ "$saude" == 200* ]] || falhar "gateway não ficou saudável: $saude"

echo "Populando pela API..."
dc exec -T -e GESTOR_CODIGO="$GESTOR_ACCESS_CODE" api-gateway node - < "$DIR_SCRIPTS/node/popular.cjs"

echo "Gerando o dump..."
dc exec -T postgres pg_dump -U postgres -d postgres --format=custom --schema=auth --schema=demand -f /tmp/dump-teste.custom
mkdir -p "$(dirname "$SAIDA")"
dc cp postgres:/tmp/dump-teste.custom "$(caminho_docker "$SAIDA")"

echo "Dump de teste gerado: $SAIDA"
echo "Para validar:  ./scripts/teste-restauracao/rodar.sh \"$SAIDA\"   (com as mesmas chaves exportadas)"
