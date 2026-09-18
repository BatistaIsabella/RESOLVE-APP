-- Executado automaticamente pelo entrypoint oficial do Postgres apenas na
-- primeira inicialização (volume vazio). O Prisma, com a preview feature
-- multiSchema, não cria schemas sozinho durante `migrate deploy` — ele
-- espera que já existam no banco de destino.
CREATE SCHEMA IF NOT EXISTS "demand";
