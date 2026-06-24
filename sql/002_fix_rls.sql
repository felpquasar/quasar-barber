-- =====================================================================
-- Quasar Gestão — Fase 0 / 1.1 — FIX RLS
-- Problema: tabelas tinham policies permissivas antigas (using true).
-- Postgres combina policies permissivas com OR -> tenant vazava tudo.
-- Este script REMOVE todas as policies de cada tabela e recria SOMENTE
-- a tenant_isolation. Rode INTEIRO no Supabase SQL Editor.
-- Idempotente.
-- =====================================================================

do $$
declare
  t text;
  pol record;
  tabelas text[] := array[
    'produtos','clientes','vendas','venda_itens','movimentos',
    'contas_receber','contas_pagar','fornecedores',
    'pedidos_compra','pedido_itens','despesas'
  ];
begin
  foreach t in array tabelas loop
    -- 1. dropa TODAS as policies existentes da tabela (inclui as antigas "allow all")
    for pol in
      select policyname from pg_policies
      where schemaname = 'public' and tablename = t
    loop
      execute format('drop policy if exists %I on public.%I;', pol.policyname, t);
    end loop;

    -- 2. garante RLS ligado
    execute format('alter table public.%I enable row level security;', t);

    -- 3. recria a policy de isolamento por tenant
    execute format(
      'create policy tenant_isolation on public.%I
         using (tenant_id = public.current_tenant_id())
         with check (tenant_id = public.current_tenant_id());', t);
  end loop;
end $$;

-- tenants / tenant_users: limpa e recria também (garantia)
do $$
declare pol record;
begin
  for pol in select policyname from pg_policies where schemaname='public' and tablename='tenants' loop
    execute format('drop policy if exists %I on public.tenants;', pol.policyname);
  end loop;
  for pol in select policyname from pg_policies where schemaname='public' and tablename='tenant_users' loop
    execute format('drop policy if exists %I on public.tenant_users;', pol.policyname);
  end loop;
end $$;

alter table public.tenants enable row level security;
create policy tenants_self on public.tenants
  for select using (id = public.current_tenant_id());

alter table public.tenant_users enable row level security;
create policy tenant_users_self on public.tenant_users
  for select using (user_id = auth.uid());

-- =====================================================================
-- Verificação rápida (rode separado se quiser conferir):
--   select tablename, policyname, qual
--   from pg_policies where schemaname='public' order by tablename;
-- Cada tabela de negócio deve ter SÓ tenant_isolation.
-- =====================================================================
