#!/usr/bin/env bash
# Teste de restauração: restaura um dump num ambiente descartável e confere se a aplicação funciona
# sobre ele.
#
# Uso:
#   export DADOS_ENCRYPTION_KEY=...   # as chaves do ambiente de onde o dump saiu
#   export EMAIL_HASH_KEY=...
#   ./scripts/teste-restauracao/rodar.sh caminho/do/dump.custom
#
# Variáveis opcionais:
#   RESTORE_PG_IMAGE      imagem do Postgres descartável (padrão postgres:15-alpine). Precisa ser da
#                         mesma versão principal do servidor de produção, ou mais nova.
#   RESTORE_DATABASE_URL  banco onde o dump é restaurado, visto de dentro do container do Postgres.
#                         Só localhost/127.0.0.1 são aceitos.
#
# Sobe o backend/docker-compose.yml no projeto resolve-restore-test (volumes próprios, sem portas
# publicadas), restaura, roda as verificações A a D, imprime o tempo e remove tudo, mesmo se falhar.
# Sai com 0 só se as quatro verificações passarem.
set -euo pipefail
. "$(dirname "${BASH_SOURCE[0]}")/comum.sh"

export COMPOSE_PROJECT_NAME="resolve-restore-test"
RESTORE_DATABASE_URL="${RESTORE_DATABASE_URL:-postgresql://postgres:postgrespassword@127.0.0.1:5432/postgres}"

# --- travas, antes de qualquer ação ------------------------------------------------------------
[ $# -eq 1 ] || falhar "uso: $0 caminho/do/dump.custom"
DUMP="$1"
[ -f "$DUMP" ] && [ -r "$DUMP" ] || falhar "dump não encontrado ou sem permissão de leitura: $DUMP"

exigir_url_local RESTORE_DATABASE_URL
# Um DATABASE_URL de produção exportado no terminal é o erro mais provável; recusa também.
exigir_url_local DATABASE_URL
exigir_chaves
command -v docker >/dev/null || falhar "docker não encontrado"

INICIO=$SECONDS
declare -A RESULTADO MOTIVO
VERIFICACOES=(A B C D)
NOMES=([0]="A. /health do gateway" [1]="B. e-mail cifrado legível" [2]="C. denúncia RESOLVIDA com histórico e foto" [3]="D. métricas sem cache = count(*)")

registrar() { RESULTADO[$1]="$2"; MOTIVO[$1]="$3"; }

resumo() {
  local i letra falhas=0
  echo
  echo "================ Resultado do teste de restauração ================"
  for i in "${!VERIFICACOES[@]}"; do
    letra="${VERIFICACOES[$i]}"
    printf '%-7s %s\n        %s\n' "${RESULTADO[$letra]:-FALHOU}" "${NOMES[$i]}" "${MOTIVO[$letra]:-não executada}"
    [ "${RESULTADO[$letra]:-FALHOU}" = "OK" ] || falhas=$((falhas + 1))
  done
  echo "Dump: $DUMP"
  [ -n "${TEMPO_RESTORE:-}" ] && echo "Tempo do pg_restore: ${TEMPO_RESTORE}s"
  echo "Tempo total: $((SECONDS - INICIO))s"
  echo "==================================================================="
  return "$falhas"
}

limpar() {
  local codigo=$?
  echo
  echo "Removendo o ambiente $COMPOSE_PROJECT_NAME e os volumes dele..."
  dc down -v --remove-orphans >/dev/null 2>&1 \
    || echo "AVISO: não consegui remover o ambiente; rode: docker compose -p $COMPOSE_PROJECT_NAME down -v" >&2
  exit "$codigo"
}
trap limpar EXIT

# --- 1 e 2. ambiente descartável -----------------------------------------------------------------
dc down -v --remove-orphans >/dev/null 2>&1 || true   # garante volume vazio
echo "Subindo postgres e redis ($COMPOSE_PROJECT_NAME, ${RESTORE_PG_IMAGE:-postgres:15-alpine})..."
esperar_saudaveis

# --- 3. restauração ------------------------------------------------------------------------------
# Antes dos serviços: eles rodam prisma db push ao subir e criariam tabelas vazias por cima.
# --no-owner/--no-privileges: os papéis de produção (auth_svc, backup_svc...) não existem aqui;
# tudo fica com o usuário do banco descartável, que é o mesmo que os serviços usam neste compose.
echo "Restaurando $DUMP..."
dc cp "$(caminho_docker "$DUMP")" postgres:/tmp/restauracao.custom
if ! erro="$(dc exec -T postgres pg_restore -l /tmp/restauracao.custom 2>&1 >/dev/null)"; then
  registrar A FALHOU "dump ilegível: $erro"
  [[ "$erro" == *"unsupported version"* ]] \
    && echo "O dump veio de um pg_dump mais novo. Rode de novo com RESTORE_PG_IMAGE=postgres:<versão>-alpine." >&2
  resumo || true
  exit 1
fi
t0=$SECONDS
if ! dc exec -T postgres pg_restore -d "$RESTORE_DATABASE_URL" \
     --no-owner --no-privileges --exit-on-error --single-transaction /tmp/restauracao.custom; then
  registrar A FALHOU "pg_restore falhou; nenhuma verificação rodou"
  resumo || true
  exit 1
fi
TEMPO_RESTORE=$((SECONDS - t0))

echo "Subindo os serviços sobre a base restaurada..."
dc up -d --build auth-service demand-service metrics-service api-gateway

# --- 4. verificações -----------------------------------------------------------------------------
echo "A. aguardando /health do gateway..."
saude="$(esperar_gateway 240)"
if [[ "$saude" == 200* ]]; then
  registrar A OK "200: ${saude#200 }"
else
  registrar A FALHOU "esperava 200, veio: $saude"
fi

echo "B. decifrando um e-mail com as utilidades do auth-service..."
if saida="$(dc exec -T auth-service node - < "$DIR_SCRIPTS/node/verificar-email.cjs" 2>&1)"; then
  registrar B OK "$saida"
else
  registrar B FALHOU "$saida"
fi

echo "C. procurando denúncia RESOLVIDA com histórico e foto..."
if saida="$(dc exec -T postgres psql -U postgres -d postgres -v ON_ERROR_STOP=1 -qAt -F ' ' -c "
    SELECT
      (SELECT count(*) FROM demand.denuncias WHERE status = 'RESOLVIDA'),
      (SELECT count(*) FROM demand.denuncias d
        WHERE d.status = 'RESOLVIDA'
          AND EXISTS (SELECT 1 FROM demand.historicos h WHERE h.denuncia_id = d.id_denuncia)
          AND EXISTS (SELECT 1 FROM demand.imagens i WHERE i.denuncia_id = d.id_denuncia
                                                      AND i.caminho_file LIKE 'data:image/%'))" 2>&1)"; then
  read -r resolvidas completas <<<"$saida"
  if [ "${completas:-0}" -gt 0 ]; then
    registrar C OK "$completas de $resolvidas denúncia(s) RESOLVIDA(s) com histórico e foto"
  elif [ "${resolvidas:-0}" -eq 0 ]; then
    registrar C FALHOU "nenhuma denúncia RESOLVIDA na base restaurada"
  else
    registrar C FALHOU "$resolvidas RESOLVIDA(s), mas nenhuma com histórico e foto ao mesmo tempo"
  fi
else
  registrar C FALHOU "consulta falhou: $saida"
fi

echo "D. esvaziando o Redis e calculando as métricas..."
senha_redis="${REDIS_PASSWORD:-redis-dev}"
if ! dc exec -T redis redis-cli -a "$senha_redis" --no-auth-warning FLUSHALL >/dev/null 2>&1; then
  registrar D FALHOU "não consegui esvaziar o Redis"
elif saida="$(dc exec -T metrics-service node - < "$DIR_SCRIPTS/node/verificar-metricas.cjs" 2>&1)"; then
  registrar D OK "Redis esvaziado; $saida"
else
  registrar D FALHOU "$saida"
fi

# --- 5, 6 e 7. resumo, limpeza (trap) e código de saída ----------------------------------------
if resumo; then
  exit 0
fi
exit 1
