-- Usuário de banco usado só pelo backup (pg_dump), com leitura nos schemas auth e demand:
--   backup_svc  LOGIN, SELECT em tabelas e sequences de auth e demand, nenhuma escrita
--
-- A senha chega pela variável de sessão app.backup_pw (definida por 003-backup-role.sh, ou à mão
-- num banco gerenciado). Depende de roles.sql já ter rodado: os schemas e os papéis auth_svc e
-- demand_svc precisam existir. O script pode rodar mais de uma vez sem efeito colateral.
--
-- SELECT nas sequences é necessário porque o pg_dump lê o valor atual de cada uma. Não é dado
-- USAGE nelas, que permitiria nextval(), ou seja, uma escrita.

DO $$
DECLARE
  faltando text;
BEGIN
  SELECT string_agg(nome, ', ') INTO faltando
  FROM unnest(ARRAY['auth_svc', 'demand_svc']) AS nome
  WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname = nome);
  IF faltando IS NOT NULL THEN
    RAISE EXCEPTION 'papéis ausentes (%): rode roles.sql antes de backup-role.sql', faltando;
  END IF;

  SELECT string_agg(nome, ', ') INTO faltando
  FROM unnest(ARRAY['auth', 'demand']) AS nome
  WHERE NOT EXISTS (SELECT FROM pg_namespace WHERE nspname = nome);
  IF faltando IS NOT NULL THEN
    RAISE EXCEPTION 'schemas ausentes (%): rode roles.sql antes de backup-role.sql', faltando;
  END IF;

  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'backup_svc') THEN
    CREATE ROLE backup_svc LOGIN;
  END IF;

  EXECUTE format('ALTER ROLE backup_svc PASSWORD %L', current_setting('app.backup_pw'));
END $$;

-- Sem nenhum atributo administrativo, e toda transação dele começa como somente leitura
-- (o pg_dump já abre a sua assim; isto protege contra uso manual da credencial).
ALTER ROLE backup_svc LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
ALTER ROLE backup_svc SET default_transaction_read_only = on;

-- Leitura no que já existe.
GRANT USAGE ON SCHEMA auth TO backup_svc;
GRANT USAGE ON SCHEMA demand TO backup_svc;
GRANT SELECT ON ALL TABLES IN SCHEMA auth TO backup_svc;
GRANT SELECT ON ALL TABLES IN SCHEMA demand TO backup_svc;
GRANT SELECT ON ALL SEQUENCES IN SCHEMA auth TO backup_svc;
GRANT SELECT ON ALL SEQUENCES IN SCHEMA demand TO backup_svc;

-- Leitura no que os donos dos schemas criarem depois (prisma db push dos serviços).
-- ATENÇÃO: isto vale para os donos do ambiente autogerenciado (docker-compose.prod.yml), onde
-- auth_svc e demand_svc criam as tabelas. Em banco gerenciado (Supabase, Render) as tabelas são
-- criadas pelo usuário principal, e estas linhas não cobrem tabelas futuras: o dump sairia
-- incompleto sem erro. Para esse caso, veja docs/seguranca/BACKUP_E_RESTAURACAO.md (variante
-- para banco gerenciado e consulta de verificação periódica).
ALTER DEFAULT PRIVILEGES FOR ROLE auth_svc IN SCHEMA auth GRANT SELECT ON TABLES TO backup_svc;
ALTER DEFAULT PRIVILEGES FOR ROLE auth_svc IN SCHEMA auth GRANT SELECT ON SEQUENCES TO backup_svc;
ALTER DEFAULT PRIVILEGES FOR ROLE demand_svc IN SCHEMA demand GRANT SELECT ON TABLES TO backup_svc;
ALTER DEFAULT PRIVILEGES FOR ROLE demand_svc IN SCHEMA demand GRANT SELECT ON SEQUENCES TO backup_svc;

-- Garantia explícita de que não cria nada nem escreve: remove qualquer concessão anterior além
-- da leitura (útil se o papel já existia com mais permissões).
REVOKE CREATE ON SCHEMA auth FROM backup_svc;
REVOKE CREATE ON SCHEMA demand FROM backup_svc;
REVOKE CREATE ON SCHEMA public FROM backup_svc;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON ALL TABLES IN SCHEMA auth FROM backup_svc;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON ALL TABLES IN SCHEMA demand FROM backup_svc;
REVOKE USAGE, UPDATE ON ALL SEQUENCES IN SCHEMA auth FROM backup_svc;
REVOKE USAGE, UPDATE ON ALL SEQUENCES IN SCHEMA demand FROM backup_svc;
