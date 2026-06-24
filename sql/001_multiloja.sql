-- =====================================================================
-- Quasar Gestão — Fase 0 / 1.1 — Multiloja (tenant_id + RLS)
-- Rode este arquivo INTEIRO no Supabase: SQL Editor > New query > Run.
-- Idempotente: pode rodar mais de uma vez sem quebrar.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. Tabelas de tenancy
-- ---------------------------------------------------------------------
create table if not exists public.tenants (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null,
  created_at  timestamptz not null default now()
);

create table if not exists public.tenant_users (
  user_id    uuid not null references auth.users(id) on delete cascade,
  tenant_id  uuid not null references public.tenants(id) on delete cascade,
  papel      text not null default 'admin',
  created_at timestamptz not null default now(),
  primary key (user_id, tenant_id)
);

-- ---------------------------------------------------------------------
-- 1. Função: tenant_id do usuário logado
--    SECURITY DEFINER evita recursão de RLS ao ler tenant_users.
-- ---------------------------------------------------------------------
create or replace function public.current_tenant_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select tenant_id
  from public.tenant_users
  where user_id = auth.uid()
  limit 1
$$;

-- ---------------------------------------------------------------------
-- 2. Trigger genérico: preenche tenant_id no INSERT se vier nulo
-- ---------------------------------------------------------------------
create or replace function public.set_tenant_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.tenant_id is null then
    new.tenant_id := public.current_tenant_id();
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- 3. Aplica em cada tabela de negócio:
--    - adiciona coluna tenant_id
--    - cria índice
--    - cria trigger de auto-fill
--    - habilita RLS + policies (isola por tenant)
-- ---------------------------------------------------------------------
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
    -- coluna
    execute format('alter table public.%I add column if not exists tenant_id uuid references public.tenants(id);', t);
    -- índice
    execute format('create index if not exists %I on public.%I (tenant_id);', t || '_tenant_idx', t);
    -- trigger auto-fill
    execute format('drop trigger if exists set_tenant_id_trg on public.%I;', t);
    execute format('create trigger set_tenant_id_trg before insert on public.%I for each row execute function public.set_tenant_id();', t);
    -- RLS: dropa TODAS as policies existentes (inclui "allow all" antigas que
    -- vazariam dados por serem combinadas com OR) e recria só a de isolamento.
    for pol in select policyname from pg_policies where schemaname='public' and tablename=t loop
      execute format('drop policy if exists %I on public.%I;', pol.policyname, t);
    end loop;
    execute format('alter table public.%I enable row level security;', t);
    execute format(
      'create policy tenant_isolation on public.%I
         using (tenant_id = public.current_tenant_id())
         with check (tenant_id = public.current_tenant_id());', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- 4. Backfill: move TODOS os dados atuais para um tenant default
--    e vincula TODOS os usuários existentes a ele.
--    (Hoje o sistema é single-tenant: tudo pertence à barbearia dona.)
-- ---------------------------------------------------------------------
do $$
declare
  default_tenant uuid;
  t text;
  tabelas text[] := array[
    'produtos','clientes','vendas','venda_itens','movimentos',
    'contas_receber','contas_pagar','fornecedores',
    'pedidos_compra','pedido_itens','despesas'
  ];
begin
  -- pega tenant default existente ou cria
  select id into default_tenant from public.tenants where nome = 'Quasar Barber (default)' limit 1;
  if default_tenant is null then
    insert into public.tenants (nome) values ('Quasar Barber (default)') returning id into default_tenant;
  end if;

  -- vincula todos usuários existentes ao tenant default (se ainda sem vínculo)
  insert into public.tenant_users (user_id, tenant_id, papel)
  select u.id, default_tenant, 'admin'
  from auth.users u
  where not exists (select 1 from public.tenant_users tu where tu.user_id = u.id);

  -- backfill das linhas órfãs
  foreach t in array tabelas loop
    execute format('update public.%I set tenant_id = %L where tenant_id is null;', t, default_tenant);
    -- agora torna obrigatório
    execute format('alter table public.%I alter column tenant_id set not null;', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- 5. RLS nas próprias tabelas de tenancy
-- ---------------------------------------------------------------------
alter table public.tenants enable row level security;
drop policy if exists tenants_self on public.tenants;
create policy tenants_self on public.tenants
  for select
  using (id = public.current_tenant_id());

alter table public.tenant_users enable row level security;
drop policy if exists tenant_users_self on public.tenant_users;
create policy tenant_users_self on public.tenant_users
  for select
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- 6. RPC de signup: cria a barbearia e vincula o usuário recém-criado.
--    Chamada pelo front logo após supabase.auth.signUp.
--    Bloqueia se o usuário já tem tenant (evita duplicar).
-- ---------------------------------------------------------------------
create or replace function public.create_tenant(nome_barbearia text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  novo uuid;
begin
  if auth.uid() is null then
    raise exception 'não autenticado';
  end if;

  if exists (select 1 from public.tenant_users where user_id = auth.uid()) then
    raise exception 'usuário já vinculado a uma barbearia';
  end if;

  insert into public.tenants (nome) values (coalesce(nullif(trim(nome_barbearia), ''), 'Minha Barbearia'))
  returning id into novo;

  insert into public.tenant_users (user_id, tenant_id, papel)
  values (auth.uid(), novo, 'admin');

  return novo;
end;
$$;

grant execute on function public.create_tenant(text) to authenticated;
grant execute on function public.current_tenant_id() to authenticated;

-- =====================================================================
-- FIM. Após rodar:
--  - dados antigos seguem visíveis para o usuário dono (tenant default).
--  - novas contas via signup ficam isoladas.
-- =====================================================================
