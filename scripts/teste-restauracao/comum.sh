# Funções compartilhadas por gerar-dump-teste.sh e rodar.sh. Carregado com ".", não executado.

# Git Bash no Windows converte argumentos como /app/dist em caminhos do Windows; aqui não queremos isso.
export MSYS_NO_PATHCONV=1

DIR_SCRIPTS="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RAIZ="$(cd "$DIR_SCRIPTS/../.." && pwd)"
COMPOSE_BASE="$RAIZ/backend/docker-compose.yml"
COMPOSE_ISOLADO="$DIR_SCRIPTS/compose.isolado.yml"

falhar() {
  echo "ERRO: $*" >&2
  exit 1
}

# Caminho no formato que o docker entende. No Git Bash (Windows), /c/Users/... vira C:/Users/...;
# no Linux e no macOS não muda nada.
caminho_docker() {
  if command -v cygpath >/dev/null 2>&1; then cygpath -m "$1"; else printf '%s' "$1"; fi
}

# docker compose sempre com nome de projeto próprio: nunca toca o ambiente de desenvolvimento.
dc() {
  [ -n "${COMPOSE_PROJECT_NAME:-}" ] || falhar "COMPOSE_PROJECT_NAME não definido"
  docker compose -p "$COMPOSE_PROJECT_NAME" \
    -f "$(caminho_docker "$COMPOSE_BASE")" -f "$(caminho_docker "$COMPOSE_ISOLADO")" "$@"
}

# Sem as duas chaves, o auth-service fora de produção deriva uma chave do JWT_SECRET, e um e-mail
# gravado sem cifra passaria pela verificação B por engano.
exigir_chaves() {
  local nome
  for nome in DADOS_ENCRYPTION_KEY EMAIL_HASH_KEY; do
    if [ -z "${!nome:-}" ]; then
      falhar "$nome está vazia. Exporte a mesma chave usada pelo ambiente de onde o dump saiu
       (para o dump de teste, a mesma usada em gerar-dump-teste.sh). Sem ela a verificação
       do e-mail cifrado não tem valor."
    fi
  done
  export DADOS_ENCRYPTION_KEY EMAIL_HASH_KEY
}

# Extrai o host de uma URL postgres(ql)://usuario:senha@host:porta/banco?parametros
host_da_url() {
  local resto="${1#*://}"
  resto="${resto%%[/?]*}"   # tira caminho e parâmetros
  resto="${resto##*@}"      # tira usuario:senha@
  if [[ "$resto" == \[* ]]; then
    resto="${resto%%]*}]"   # IPv6 entre colchetes
  else
    resto="${resto%%:*}"    # tira a porta
  fi
  printf '%s' "$resto"
}

# Um script que apaga e restaura banco, apontado para produção, destrói dados reais.
exigir_url_local() {
  local nome="$1" url="${!1:-}" host
  [ -n "$url" ] || return 0
  case "$url" in
    postgres://*|postgresql://*) ;;
    *) falhar "$nome não é uma URL postgres:// reconhecida; recusando por segurança." ;;
  esac
  if [[ "$url" == *"host="* ]]; then
    falhar "$nome define host por parâmetro (host=...). Recusando: só localhost ou 127.0.0.1 são aceitos."
  fi
  host="$(host_da_url "$url")"
  case "$host" in
    localhost|127.0.0.1) ;;
    *) falhar "$nome aponta para o host '${host:-<vazio>}'. Este script só roda contra localhost ou
       127.0.0.1, porque restaurar sobre um banco real destrói os dados dele. Abortado." ;;
  esac
}

esperar_saudaveis() {
  # --wait espera os healthchecks do compose (pg_isready e redis-cli ping).
  dc up -d --wait --wait-timeout 120 postgres redis
}

# Roda um comando dentro do gateway até /health responder 200, por até $1 segundos.
# Imprime "codigo corpo" da última tentativa.
esperar_gateway() {
  local limite="$1" fim=$((SECONDS + $1)) saida
  while :; do
    saida="$(dc exec -T api-gateway node -e '
      fetch("http://127.0.0.1:8080/health")
        .then(async (r) => console.log(r.status, (await r.text()).replace(/\s+/g, " ")))
        .catch((e) => console.log("000", e.message));
    ' 2>/dev/null || echo "000 gateway ainda não aceita comandos")"
    if [[ "$saida" == 200* ]] || [ "$SECONDS" -ge "$fim" ]; then
      printf '%s' "$saida"
      return 0
    fi
    sleep 3
  done
}
