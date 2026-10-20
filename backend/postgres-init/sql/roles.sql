-- Um usuário de banco por serviço, cada um limitado ao seu schema:
--   auth_svc    dono do schema auth    (usuários, tokens, auditoria)
--   demand_svc  dono do schema demand  (denúncias, fotos, histórico)
--   metrics_svc só leitura no schema demand (indicadores agregados)
--
-- As senhas chegam pelas variáveis de sessão app.auth_pw, app.demand_pw e app.metrics_pw
-- (definidas por 002-roles.sh). O script pode rodar mais de uma vez sem efeito colateral e
-- também serve para bancos que já existem: os objetos atuais passam para o novo dono.

DO $$
DECLARE
  papel text;
BEGIN
  FOREACH papel IN ARRAY ARRAY['auth_svc', 'demand_svc', 'metrics_svc'] LOOP
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = papel) THEN
      EXECUTE format('CREATE ROLE %I LOGIN', papel);
    END IF;
  END LOOP;

  EXECUTE format('ALTER ROLE auth_svc PASSWORD %L', current_setting('app.auth_pw'));
  EXECUTE format('ALTER ROLE demand_svc PASSWORD %L', current_setting('app.demand_pw'));
  EXECUTE format('ALTER ROLE metrics_svc PASSWORD %L', current_setting('app.metrics_pw'));
END $$;

CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS demand;
ALTER SCHEMA auth OWNER TO auth_svc;
ALTER SCHEMA demand OWNER TO demand_svc;

-- Objetos que já existiam (criados pelo usuário administrador) passam para o dono do schema.
DO $$
DECLARE
  esquema text;
  dono text;
  obj record;
BEGIN
  FOR esquema, dono IN SELECT * FROM (VALUES ('auth', 'auth_svc'), ('demand', 'demand_svc')) AS m(e, d) LOOP
    FOR obj IN SELECT tablename AS nome FROM pg_tables WHERE schemaname = esquema LOOP
      EXECUTE format('ALTER TABLE %I.%I OWNER TO %I', esquema, obj.nome, dono);
    END LOOP;
    FOR obj IN SELECT sequencename AS nome FROM pg_sequences WHERE schemaname = esquema LOOP
      EXECUTE format('ALTER SEQUENCE %I.%I OWNER TO %I', esquema, obj.nome, dono);
    END LOOP;
    FOR obj IN
      SELECT t.typname AS nome
      FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = esquema AND t.typtype = 'e'
    LOOP
      EXECUTE format('ALTER TYPE %I.%I OWNER TO %I', esquema, obj.nome, dono);
    END LOOP;
  END LOOP;
END $$;

-- Ninguém além do dono entra nos schemas; o metrics_svc só lê o schema demand.
REVOKE ALL ON SCHEMA auth FROM PUBLIC;
REVOKE ALL ON SCHEMA demand FROM PUBLIC;
GRANT USAGE ON SCHEMA demand TO metrics_svc;
GRANT SELECT ON ALL TABLES IN SCHEMA demand TO metrics_svc;
ALTER DEFAULT PRIVILEGES FOR ROLE demand_svc IN SCHEMA demand GRANT SELECT ON TABLES TO metrics_svc;

-- Os usuários de serviço não precisam criar nada fora dos próprios schemas.
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
