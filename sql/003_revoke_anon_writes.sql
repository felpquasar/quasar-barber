-- =====================================================================
-- Quasar Gestão — Fase 0 / 1.1 — Defesa em camada: tirar escrita do anon
-- O app sempre usa role `authenticated` (JWT do usuário logado).
-- O role `anon` (requests sem login) não precisa escrever nada.
-- Rode INTEIRO no Supabase SQL Editor. Idempotente.
-- =====================================================================

-- 1. Revoga escrita do anon em TODAS as tabelas atuais do schema public
revoke insert, update, delete on all tables in schema public from anon;

-- 2. (Opcional, mais restritivo) tira também o SELECT do anon.
--    O app só lê logado. Se um dia precisar de leitura pública, comente.
revoke select on all tables in schema public from anon;

-- 3. Tabelas criadas no futuro também nascem sem esses privilégios pro anon
alter default privileges in schema public
  revoke insert, update, delete on tables from anon;
alter default privileges in schema public
  revoke select on tables from anon;

-- =====================================================================
-- NÃO mexe no role `authenticated` — usuários logados seguem com RLS
-- por tenant (tenant_isolation) controlando o que cada loja vê/escreve.
--
-- Verificação:
--   select grantee, privilege_type, table_name
--   from information_schema.role_table_grants
--   where table_schema='public' and grantee='anon';
--   -> não deve sobrar insert/update/delete (nem select se rodou o passo 2).
-- =====================================================================
