-- Adds birthdate to users. Not part of the original schema (Database
-- Architecture doc never called for it) — added per a direct founder
-- request for a locked Name & Birthdate identity-verification setting in
-- apps/web (see PROJECT_MEMORY.md's 2026-08-03 entries).
alter table users add column if not exists birthdate date;
