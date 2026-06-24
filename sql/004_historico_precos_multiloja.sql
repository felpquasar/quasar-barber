-- =====================================================================
-- Quasar Gestão — Fase 0 / 1.1 — FIX: historico_precos no multiloja
-- A tabela historico_precos (usada em Estoque.jsx) ficou de fora das
-- migrations 001/002 -> sem tenant_id e sem RLS de isolamento.
-- Este script a alinha ao resto. Rode INTEIRO no Supabase SQL Editor.
-- Idempotente.
-- =====================================================================

-- 0. Garante que a tabela existe (schema conforme uso em Estoque.jsx)
create table if not exists public.historico_precos (
  id              bigserial primary key,
  produto_id      bigint references public.produtos(id) on delete cascade,
  custo_anterior  numeric,
  custo_novo      numeric,
  preco_anterior  numeric,
  preco_novo      numeric,
  created_at      timestamptz not null default now()
);

-- 1. Coluna tenant_id + índice
alter table public.historico_precos add column if not exists tenant_id uuid references public.tenants(id);
create index if not exists historico_precos_tenant_idx on public.historico_precos (tenant_id);

-- 2. Backfill: linhas órfãs herdam o tenant do produto referenciado;
--    o que não casar vai pro tenant default.
update public.historico_precos h
set tenant_id = p.tenant_id
from public.produtos p
where h.produto_id = p.id and h.tenant_id is null;

update public.historico_precos
set tenant_id = (select id from public.tenants where nome = 'Quasar Barber (default)' limit 1)
where tenant_id is null;

-- 3. Trigger de auto-fill no INSERT (reusa a função de 001)
drop trigger if exists set_tenant_id_trg on public.historico_precos;
create trigger set_tenant_id_trg before insert on public.historico_precos
  for each row execute function public.set_tenant_id();

-- 4. RLS: dropa qualquer policy antiga e cria só a de isolamento
do $$
declare pol record;
begin
  for pol in select policyname from pg_policies
             where schemaname='public' and tablename='historico_precos' loop
    execute format('drop policy if exists %I on public.historico_precos;', pol.policyname);
  end loop;
end $$;

alter table public.historico_precos enable row level security;
create policy tenant_isolation on public.historico_precos
  using (tenant_id = public.current_tenant_id())
  with check (tenant_id = public.current_tenant_id());

-- 5. Só agora torna obrigatório (após backfill)
alter table public.historico_precos alter column tenant_id set not null;

-- 6. Defesa em camada: tira escrita/leitura do anon (igual 003)
revoke insert, update, delete, select on public.historico_precos from anon;

-- =====================================================================
-- Depois: histórico de preço fica isolado por loja, igual o resto.
-- =====================================================================
