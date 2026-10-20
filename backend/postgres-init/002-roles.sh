#!/bin/sh
# Cria os usuários de banco por serviço (veja sql/roles.sql).
# Roda sozinho na primeira inicialização do volume. Em um banco que já existe, execute à mão:
#   docker compose -f docker-compose.prod.yml exec postgres sh /docker-entrypoint-initdb.d/002-roles.sh
set -e

: "${AUTH_DB_PASSWORD:?defina AUTH_DB_PASSWORD}"
: "${DEMAND_DB_PASSWORD:?defina DEMAND_DB_PASSWORD}"
: "${METRICS_DB_PASSWORD:?defina METRICS_DB_PASSWORD}"

psql -v ON_ERROR_STOP=1 \
  -v auth_pw="$AUTH_DB_PASSWORD" \
  -v demand_pw="$DEMAND_DB_PASSWORD" \
  -v metrics_pw="$METRICS_DB_PASSWORD" \
  -U "$POSTGRES_USER" -d "$POSTGRES_DB" <<'SQL'
SET app.auth_pw = :'auth_pw';
SET app.demand_pw = :'demand_pw';
SET app.metrics_pw = :'metrics_pw';
\i /docker-entrypoint-initdb.d/sql/roles.sql
SQL
