-- Estrutura empresarial do Harmony Hub
-- Aplicada no projeto Supabase como migration 20261002052000.

create table if not exists public.businesses (
 id uuid primary key default gen_random_uuid(), household_id uuid not null references public.households(id) on delete cascade,
 name text not null, legal_name text, document text, tax_regime text, phone text, email text, address text, city text, state text, notes text,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(household_id,name)
);
create table if not exists public.business_suppliers (
 id uuid primary key default gen_random_uuid(), household_id uuid not null references public.households(id) on delete cascade,
 business_id uuid not null references public.businesses(id) on delete cascade, name text not null, document text, phone text, email text, address text, notes text,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.business_ingredients (
 id uuid primary key default gen_random_uuid(), household_id uuid not null references public.households(id) on delete cascade,
 business_id uuid not null references public.businesses(id) on delete cascade, supplier_id uuid references public.business_suppliers(id) on delete set null,
 name text not null, category text, base_unit text not null check(base_unit in('G','ML','UN')),
 purchase_quantity numeric(14,3) not null default 0 check(purchase_quantity>=0), purchase_unit text not null default 'UN' check(purchase_unit in('G','KG','ML','L','UN')),
 purchase_cost numeric(14,2) not null default 0 check(purchase_cost>=0), cost_per_base_unit numeric(14,6) not null default 0 check(cost_per_base_unit>=0),
 stock_quantity numeric(14,3) not null default 0 check(stock_quantity>=0), minimum_stock numeric(14,3) not null default 0 check(minimum_stock>=0), notes text,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.business_recipes (
 id uuid primary key default gen_random_uuid(), household_id uuid not null references public.households(id) on delete cascade,
 business_id uuid not null references public.businesses(id) on delete cascade, name text not null, category text,
 yield_quantity numeric(14,3) not null default 1 check(yield_quantity>0), yield_unit text not null default 'UN', preparation text, notes text,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.business_recipe_items (
 id uuid primary key default gen_random_uuid(), household_id uuid not null references public.households(id) on delete cascade,
 business_id uuid not null references public.businesses(id) on delete cascade, recipe_id uuid not null references public.business_recipes(id) on delete cascade,
 ingredient_id uuid not null references public.business_ingredients(id) on delete restrict, quantity numeric(14,3) not null check(quantity>0),
 waste_percent numeric(6,2) not null default 0 check(waste_percent between 0 and 100), created_at timestamptz not null default now(), unique(recipe_id,ingredient_id)
);
create table if not exists public.business_products (
 id uuid primary key default gen_random_uuid(), household_id uuid not null references public.households(id) on delete cascade,
 business_id uuid not null references public.businesses(id) on delete cascade, recipe_id uuid references public.business_recipes(id) on delete set null,
 name text not null, category text, product_type text not null default 'PRODUTO' check(product_type in('PRODUTO','SERVICO')),
 price numeric(14,2) not null default 0 check(price>=0), margin_percent numeric(8,2) not null default 0, markup numeric(10,4) not null default 1,
 extra_cost numeric(14,2) not null default 0, packaging_cost numeric(14,2) not null default 0, labor_cost numeric(14,2) not null default 0, fee_percent numeric(8,2) not null default 0, notes text,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.business_stock_movements (
 id uuid primary key default gen_random_uuid(), household_id uuid not null references public.households(id) on delete cascade,
 business_id uuid not null references public.businesses(id) on delete cascade, ingredient_id uuid not null references public.business_ingredients(id) on delete cascade,
 movement_type text not null check(movement_type in('COMPRA','PRODUCAO','VENDA','AJUSTE','ESTORNO')), quantity numeric(14,3) not null,
 unit_cost numeric(14,6) not null default 0, reference_id uuid, description text, created_at timestamptz not null default now()
);
create table if not exists public.business_productions (
 id uuid primary key default gen_random_uuid(), household_id uuid not null references public.households(id) on delete cascade,
 business_id uuid not null references public.businesses(id) on delete cascade, product_id uuid not null references public.business_products(id) on delete restrict,
 quantity numeric(14,3) not null check(quantity>0), produced_at date not null default current_date, total_cost numeric(14,2) not null default 0, notes text, created_at timestamptz not null default now()
);
create table if not exists public.business_sales (
 id uuid primary key default gen_random_uuid(), household_id uuid not null references public.households(id) on delete cascade,
 business_id uuid not null references public.businesses(id) on delete cascade, sale_date date not null default current_date, customer_name text, payment_method text,
 total_amount numeric(14,2) not null default 0, status text not null default 'RECEBIDA' check(status in('PENDENTE','RECEBIDA','CANCELADA')), notes text, created_at timestamptz not null default now()
);
create table if not exists public.business_sale_items (
 id uuid primary key default gen_random_uuid(), household_id uuid not null references public.households(id) on delete cascade,
 business_id uuid not null references public.businesses(id) on delete cascade, sale_id uuid not null references public.business_sales(id) on delete cascade,
 product_id uuid not null references public.business_products(id) on delete restrict, quantity numeric(14,3) not null check(quantity>0), unit_price numeric(14,2) not null check(unit_price>=0),
 total numeric(14,2) generated always as(quantity*unit_price) stored
);
create table if not exists public.business_purchases (
 id uuid primary key default gen_random_uuid(), household_id uuid not null references public.households(id) on delete cascade,
 business_id uuid not null references public.businesses(id) on delete cascade, supplier_id uuid references public.business_suppliers(id) on delete set null,
 purchase_date date not null default current_date, due_date date, total_amount numeric(14,2) not null default 0,
 status text not null default 'PENDENTE' check(status in('PENDENTE','PAGA','CANCELADA')), notes text, created_at timestamptz not null default now()
);
create table if not exists public.business_purchase_items (
 id uuid primary key default gen_random_uuid(), household_id uuid not null references public.households(id) on delete cascade,
 business_id uuid not null references public.businesses(id) on delete cascade, purchase_id uuid not null references public.business_purchases(id) on delete cascade,
 ingredient_id uuid not null references public.business_ingredients(id) on delete restrict, quantity numeric(14,3) not null check(quantity>0), unit_cost numeric(14,6) not null check(unit_cost>=0),
 total numeric(14,2) generated always as(quantity*unit_cost) stored
);
create table if not exists public.business_accounts_receivable (
 id uuid primary key default gen_random_uuid(), household_id uuid not null references public.households(id) on delete cascade,
 business_id uuid not null references public.businesses(id) on delete cascade, description text not null, customer_name text, amount numeric(14,2) not null check(amount>=0),
 due_date date, received_at date, status text not null default 'PENDENTE' check(status in('PENDENTE','RECEBIDA','CANCELADA')), source_id uuid, notes text, created_at timestamptz not null default now()
);
create table if not exists public.business_accounts_payable (
 id uuid primary key default gen_random_uuid(), household_id uuid not null references public.households(id) on delete cascade,
 business_id uuid not null references public.businesses(id) on delete cascade, description text not null, supplier_id uuid references public.business_suppliers(id) on delete set null,
 amount numeric(14,2) not null check(amount>=0), due_date date, paid_at date, status text not null default 'PENDENTE' check(status in('PENDENTE','PAGA','CANCELADA')), source_id uuid, notes text, created_at timestamptz not null default now()
);
create table if not exists public.business_quotes (
 id uuid primary key default gen_random_uuid(), household_id uuid not null references public.households(id) on delete cascade,
 business_id uuid not null references public.businesses(id) on delete cascade, quote_date date not null default current_date, customer_name text, valid_until date,
 total_amount numeric(14,2) not null default 0, status text not null default 'ABERTO' check(status in('ABERTO','APROVADO','RECUSADO','EXPIRADO')), notes text, created_at timestamptz not null default now()
);
create table if not exists public.business_invoices (
 id uuid primary key default gen_random_uuid(), household_id uuid not null references public.households(id) on delete cascade,
 business_id uuid not null references public.businesses(id) on delete cascade, invoice_number text, invoice_type text not null default 'SERVICO',
 issue_date date not null default current_date, amount numeric(14,2) not null default 0, status text not null default 'PENDENTE', external_reference text, notes text, created_at timestamptz not null default now()
);
create table if not exists public.business_cash_entries (
 id uuid primary key default gen_random_uuid(), household_id uuid not null references public.households(id) on delete cascade,
 business_id uuid not null references public.businesses(id) on delete cascade, entry_date date not null default current_date, description text not null,
 entry_type text not null check(entry_type in('ENTRADA','SAIDA')), category text, amount numeric(14,2) not null check(amount>=0), source_type text, source_id uuid, notes text, created_at timestamptz not null default now()
);

do $$ declare t text; begin
 foreach t in array array['businesses','business_suppliers','business_ingredients','business_recipes','business_recipe_items','business_products','business_stock_movements','business_productions','business_sales','business_sale_items','business_purchases','business_purchase_items','business_accounts_receivable','business_accounts_payable','business_quotes','business_invoices','business_cash_entries'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('create policy %I_select on public.%I for select to authenticated using ((select public.current_household_id())=household_id)',t,t);
  execute format('create policy %I_insert on public.%I for insert to authenticated with check ((select public.current_household_id())=household_id)',t,t);
  execute format('create policy %I_update on public.%I for update to authenticated using ((select public.current_household_id())=household_id) with check ((select public.current_household_id())=household_id)',t,t);
  execute format('create policy %I_delete on public.%I for delete to authenticated using ((select public.current_household_id())=household_id)',t,t);
 end loop;
end $$;

create or replace function public.business_normalize_ingredient_cost() returns trigger language plpgsql set search_path=public as $$
declare base_qty numeric; begin
 base_qty:=case new.purchase_unit when 'KG' then new.purchase_quantity*1000 when 'L' then new.purchase_quantity*1000 else new.purchase_quantity end;
 new.cost_per_base_unit:=case when base_qty>0 then new.purchase_cost/base_qty else 0 end; return new;
end $$;
drop trigger if exists business_ingredient_cost on public.business_ingredients;
create trigger business_ingredient_cost before insert or update on public.business_ingredients for each row execute function public.business_normalize_ingredient_cost();

create or replace function public.business_consume_recipe_for_production() returns trigger language plpgsql set search_path=public as $$
declare item record; needed numeric; total_cost numeric:=0;
begin
 for item in select ri.ingredient_id,ri.quantity,ri.waste_percent,i.stock_quantity,i.cost_per_base_unit from public.business_recipe_items ri join public.business_ingredients i on i.id=ri.ingredient_id
 where ri.recipe_id=(select recipe_id from public.business_products where id=new.product_id) and ri.household_id=new.household_id and ri.business_id=new.business_id loop
  needed:=item.quantity*new.quantity*(1+item.waste_percent/100);
  if item.stock_quantity<needed then raise exception 'ESTOQUE_INSUFICIENTE: ingrediente % precisa de %, disponível %',item.ingredient_id,needed,item.stock_quantity; end if;
  update public.business_ingredients set stock_quantity=stock_quantity-needed,updated_at=now() where id=item.ingredient_id and household_id=new.household_id;
  insert into public.business_stock_movements(household_id,business_id,ingredient_id,movement_type,quantity,unit_cost,reference_id,description) values(new.household_id,new.business_id,item.ingredient_id,'PRODUCAO',-needed,item.cost_per_base_unit,new.id,'Consumo da produção');
  total_cost:=total_cost+needed*item.cost_per_base_unit;
 end loop;
 new.total_cost:=total_cost; return new;
end $$;
drop trigger if exists business_consume_production on public.business_productions;
create trigger business_consume_production before insert on public.business_productions for each row execute function public.business_consume_recipe_for_production();

create or replace function public.business_add_purchase_stock() returns trigger language plpgsql set search_path=public as $$
begin
 update public.business_ingredients set stock_quantity=stock_quantity+new.quantity, purchase_cost=new.unit_cost*new.quantity, cost_per_base_unit=new.unit_cost, updated_at=now()
 where id=new.ingredient_id and household_id=new.household_id and business_id=new.business_id;
 insert into public.business_stock_movements(household_id,business_id,ingredient_id,movement_type,quantity,unit_cost,reference_id,description)
 values(new.household_id,new.business_id,new.ingredient_id,'COMPRA',new.quantity,new.unit_cost,new.purchase_id,'Entrada de compra'); return new;
end $$;
drop trigger if exists business_purchase_stock on public.business_purchase_items;
create trigger business_purchase_stock after insert on public.business_purchase_items for each row execute function public.business_add_purchase_stock();

create or replace function public.business_recipe_cost(p_recipe_id uuid) returns numeric language sql stable set search_path=public as $$
 select coalesce(sum(ri.quantity*(1+ri.waste_percent/100)*i.cost_per_base_unit),0) from public.business_recipe_items ri join public.business_ingredients i on i.id=ri.ingredient_id where ri.recipe_id=p_recipe_id;
$$;
create or replace function public.business_product_cost(p_product_id uuid) returns numeric language sql stable set search_path=public as $$
 select coalesce(public.business_recipe_cost(p.recipe_id),0)+p.extra_cost+p.packaging_cost+p.labor_cost from public.business_products p where p.id=p_product_id;
$$;
grant execute on function public.business_recipe_cost(uuid) to authenticated;
grant execute on function public.business_product_cost(uuid) to authenticated;
