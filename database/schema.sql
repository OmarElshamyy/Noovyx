-- =====================================================================
-- Noovyx store database (PostgreSQL 15+; Neon / Supabase free tier)
-- Firebase Auth is used ONLY to authenticate the admin page. This DB
-- stores no passwords; admin actions are logged by Firebase UID.
-- Idempotent: safe to run multiple times.
-- =====================================================================
create extension if not exists pg_trgm;

create or replace function set_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end $$ language plpgsql;

do $$ begin
  create type order_status as enum ('new','confirmed','fulfilled','cancelled');
exception when duplicate_object then null; end $$;

-- ---------- catalog ----------
create table if not exists categories (
  id          text primary key,
  label       text not null unique,
  sort_order  int  not null default 0,
  is_visible  boolean not null default true
);

create table if not exists products (
  id                   text primary key,
  slug                 text not null unique,
  name                 text not null,
  category_id          text not null references categories(id) on update cascade,
  price                numeric(12,2) not null check (price >= 0),
  badge                text not null default '',
  description          text not null default '',
  specs                text[] not null default '{}',
  stock_quantity       int  not null default 0 check (stock_quantity >= 0),
  low_stock_threshold  int  not null default 3 check (low_stock_threshold >= 0),
  is_active            boolean not null default true,
  featured             boolean not null default false,
  sort_order           int not null default 0,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create index if not exists products_category_idx on products (category_id) where is_active;
create index if not exists products_featured_idx on products (featured) where is_active and featured;
create index if not exists products_name_trgm    on products using gin (name gin_trgm_ops);
drop trigger if exists products_updated on products;
create trigger products_updated before update on products
  for each row execute function set_updated_at();

create table if not exists product_images (
  id          bigserial primary key,
  product_id  text not null references products(id) on delete cascade on update cascade,
  url         text not null,                 -- path or object-storage URL (avoid base64 in DB)
  position    int  not null default 0,       -- 0 = primary image
  unique (product_id, position)
);

-- ---------- orders (COD) ----------
create sequence if not exists order_number_seq start 1001;

create table if not exists orders (
  id             uuid primary key default gen_random_uuid(),
  order_number   text not null unique default ('NX-' || nextval('order_number_seq')),
  customer_name  text not null check (length(customer_name) between 1 and 120),
  contact        text not null check (length(contact) between 3 and 120),
  address        text not null check (length(address) between 3 and 500),
  notes          text not null default '' check (length(notes) <= 1000),
  status         order_status not null default 'new',
  subtotal       numeric(12,2) not null check (subtotal >= 0),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists orders_status_created_idx on orders (status, created_at desc);
create index if not exists orders_created_idx        on orders (created_at desc);
drop trigger if exists orders_updated on orders;
create trigger orders_updated before update on orders
  for each row execute function set_updated_at();

create table if not exists order_items (
  id          bigserial primary key,
  order_id    uuid not null references orders(id) on delete cascade,
  product_id  text references products(id) on delete set null on update cascade,
  name        text not null,                 -- snapshot, survives product edits
  unit_price  numeric(12,2) not null check (unit_price >= 0),
  quantity    int not null check (quantity > 0)
);
create index if not exists order_items_order_idx   on order_items (order_id);
create index if not exists order_items_product_idx on order_items (product_id);

create table if not exists order_events (
  id          bigserial primary key,
  order_id    uuid not null references orders(id) on delete cascade,
  from_status order_status,
  to_status   order_status not null,
  admin_uid   text,                          -- Firebase UID (null = customer/system)
  created_at  timestamptz not null default now()
);
create index if not exists order_events_order_idx on order_events (order_id, created_at);

-- ---------- homepage CMS (StorefrontConfig JSON) ----------
create table if not exists storefront_config (
  id          smallint primary key default 1 check (id = 1),
  config      jsonb not null,
  version     int  not null default 1,
  updated_by  text,
  updated_at  timestamptz not null default now()
);
create table if not exists storefront_config_revisions (
  id          bigserial primary key,
  version     int not null,
  config      jsonb not null,
  updated_by  text,
  created_at  timestamptz not null default now()
);
create or replace function storefront_config_snapshot() returns trigger as $$
begin
  insert into storefront_config_revisions(version, config, updated_by)
  values (old.version, old.config, old.updated_by);
  delete from storefront_config_revisions   -- keep last 30: stays inside free-tier size
   where id in (select id from storefront_config_revisions order by id desc offset 30);
  new.version = old.version + 1;
  new.updated_at = now();
  return new;
end $$ language plpgsql;
drop trigger if exists storefront_config_rev on storefront_config;
create trigger storefront_config_rev before update on storefront_config
  for each row execute function storefront_config_snapshot();

-- ---------- admin audit ----------
create table if not exists admin_audit_log (
  id          bigserial primary key,
  admin_uid   text not null,
  admin_email text,
  action      text not null,
  entity      text,
  entity_id   text,
  details     jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists audit_created_idx on admin_audit_log (created_at desc);

-- ---------- place_order: server-priced, stock-locked, atomic ----------
-- payload: {customerName, contact, address, notes, items:[{productId, quantity}]}
create or replace function place_order(payload jsonb)
returns table (out_order_id uuid, out_order_number text, out_subtotal numeric)
language plpgsql as $$
declare
  v_order uuid; v_num text; v_total numeric(12,2) := 0;
  it record; p products%rowtype;
begin
  if jsonb_typeof(payload->'items') <> 'array' or jsonb_array_length(payload->'items') = 0 then
    raise exception 'empty order';
  end if;

  insert into orders as o (customer_name, contact, address, notes, subtotal)
  values (trim(payload->>'customerName'), trim(payload->>'contact'),
          trim(payload->>'address'), coalesce(payload->>'notes',''), 0)
  returning o.id, o.order_number into v_order, v_num;

  for it in
    select (e->>'productId') as pid, (e->>'quantity')::int as qty
      from jsonb_array_elements(payload->'items') e
     order by 1
  loop
    select * into p from products where id = it.pid and is_active for update;
    if not found then raise exception 'product unavailable: %', it.pid; end if;
    if it.qty <= 0 or it.qty > 50 then raise exception 'bad quantity for %', it.pid; end if;
    if p.stock_quantity < it.qty then raise exception 'insufficient stock: %', p.name; end if;

    update products set stock_quantity = stock_quantity - it.qty where id = p.id;
    insert into order_items(order_id, product_id, name, unit_price, quantity)
    values (v_order, p.id, p.name, p.price, it.qty);
    v_total := v_total + p.price * it.qty;
  end loop;

  update orders set subtotal = v_total where id = v_order;
  insert into order_events(order_id, to_status) values (v_order, 'new');
  return query select v_order, v_num, v_total;
end $$;

-- ---------- admin status change (auto restock on cancel) ----------
create or replace function set_order_status(p_order uuid, p_status order_status, p_admin_uid text)
returns void language plpgsql as $$
declare old_status order_status;
begin
  select status into old_status from orders where id = p_order for update;
  if not found then raise exception 'order not found'; end if;
  if old_status = p_status then return; end if;

  if p_status = 'cancelled' then
    update products p set stock_quantity = p.stock_quantity + oi.quantity
      from order_items oi where oi.order_id = p_order and oi.product_id = p.id;
  elsif old_status = 'cancelled' then
    update products p set stock_quantity = greatest(p.stock_quantity - oi.quantity, 0)
      from order_items oi where oi.order_id = p_order and oi.product_id = p.id;
  end if;

  update orders set status = p_status where id = p_order;
  insert into order_events(order_id, from_status, to_status, admin_uid)
  values (p_order, old_status, p_status, p_admin_uid);
end $$;

-- ---------- dashboard views ----------
create or replace view v_low_stock as
  select id, name, stock_quantity, low_stock_threshold, (stock_quantity = 0) as is_out
    from products
   where is_active and stock_quantity <= low_stock_threshold
   order by stock_quantity;

create or replace view v_order_stats as
  select count(*) as total_orders,
         count(*) filter (where status = 'new') as new_orders,
         count(*) filter (where status = 'confirmed') as confirmed_orders,
         coalesce(sum(subtotal) filter (where status in ('confirmed','fulfilled')), 0) as revenue
    from orders;

create or replace view v_top_products as
  select oi.product_id, oi.name, sum(oi.quantity) as units_sold,
         sum(oi.quantity * oi.unit_price) as revenue
    from order_items oi join orders o on o.id = oi.order_id
   where o.status <> 'cancelled'
   group by oi.product_id, oi.name
   order by units_sold desc;