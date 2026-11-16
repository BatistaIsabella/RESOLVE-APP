#!/bin/sh
# Cria o usuário de banco somente leitura usado pelo backup (veja sql/backup-role.sql).
# Roda sozinho na primeira inicialização do volume, depois de 002-roles.sh. Em um banco que já existe,
# execute à mão:
#   docker compose -f docker-compose.prod.yml exec -e BACKUP_DB_PASSWORD=... postgres \
#     sh /docker-entrypoint-initdb.d/003-backup-role.sh
#
# Diferente do 002, a senha é opcional aqui: o docker-compose.prod.yml não repassa BACKUP_DB_PASSWORD,
# e falhar derrubaria a primeira inicialização do banco. Sem a variável, o papel não é criado e o
# script só avisa. Sem "exit": o entrypoint do Postgres faz source deste arquivo quando ele não é
# executável, e um exit encerraria a inicialização inteira.
set -e

if [ -z "${BACKUP_DB_PASSWORD:-}" ]; then
  echo "003-backup-role.sh: BACKUP_DB_PASSWORD não definida; papel backup_svc não foi criado." >&2
else
  psql -v ON_ERROR_STOP=1 \
    -v backup_pw="$BACKUP_DB_PASSWORD" \
    -U "$POSTGRES_USER" -d "$POSTGRES_DB" <<'SQL'
SET app.backup_pw = :'backup_pw';
\i /docker-entrypoint-initdb.d/sql/backup-role.sql
SQL
fi
