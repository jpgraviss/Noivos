-- Historical record of the fix for a critical production gap: the only
-- Postgres role on this project, neondb_owner, has BYPASSRLS (every role
-- Neon's Console/CLI/API creates is auto-enrolled in neon_superuser, which
-- bundles BYPASSRLS) — so DATABASE_URL was never actually enforcing RLS.
--
-- Fix: a role created via plain SQL (not Neon's role-management surface)
-- does NOT get neon_superuser, so it has no BYPASSRLS. This is the role
-- the app's DATABASE_URL should use from now on. neondb_owner is left
-- untouched — the SECURITY DEFINER functions in 0014/0018/0019 depend on
-- running as neondb_owner (SECURITY DEFINER runs as the function's owner,
-- not the caller) and must keep working exactly as before.
--
-- This file is NOT meant to be re-run against production (the role
-- already exists there with a generated password, set directly via SQL,
-- never committed here). It documents the exact grants for anyone
-- rebuilding this database from scratch, or auditing what noivos_app can
-- do. Replace the password placeholder before running elsewhere.

create role noivos_app with login password 'REPLACE_WITH_GENERATED_PASSWORD';

grant connect on database neondb to noivos_app;
grant usage on schema public to noivos_app;
grant select, insert, update, delete on all tables in schema public to noivos_app;
grant usage, select on all sequences in schema public to noivos_app;
grant execute on all functions in schema public to noivos_app;

-- Migrations continue to run as neondb_owner, so extend the same grants to
-- noivos_app automatically for anything created by a future migration.
alter default privileges for role neondb_owner in schema public
  grant select, insert, update, delete on tables to noivos_app;
alter default privileges for role neondb_owner in schema public
  grant usage, select on sequences to noivos_app;
alter default privileges for role neondb_owner in schema public
  grant execute on functions to noivos_app;

-- Verification performed against the live database after creating this
-- role (see PROJECT_MEMORY.md for the full writeup):
--   select rolname, rolsuper, rolbypassrls, rolcreaterole, rolcreatedb
--   from pg_roles where rolname = 'noivos_app';
--   -> rolsuper: false, rolbypassrls: false, rolcreaterole: false, rolcreatedb: false
--
-- Adversarial test: as noivos_app, set app.current_user_id to a user with
-- no partnership with the recipient, then attempt to insert a notification
-- addressed to that unrelated recipient — correctly rejected with
-- "new row violates row-level security policy for table notifications".
-- The identical test against neondb_owner (BYPASSRLS) had wrongly succeeded.
