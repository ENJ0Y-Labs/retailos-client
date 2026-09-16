-- RetailOS PostgreSQL schema
create extension if not exists pgcrypto;

do $$ begin
  create type user_role as enum ('ADMIN','MANAGER','EMPLOYEE');
exception when duplicate_object then null; end $$;
do $$ begin
  create type payment_method as enum ('CASH','TRANSFER','POS');
exception when duplicate_object then null; end $$;
do $$ begin
  create type sale_status as enum ('COMPLETED','CANCELLED');
exception when duplicate_object then null; end $$;
do $$ begin
  create type purchase_status as enum ('PENDING','APPROVED','CANCELLED');
exception when duplicate_object then null; end $$;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  username varchar(80) unique not null,
  full_name varchar(160) not null,
  password_hash text not null,
  role user_role not null default 'EMPLOYEE',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  name varchar(180) not null,
  category varchar(120),
  selling_price numeric(14,2) not null check (selling_price >= 0),
  cost_price numeric(14,2) not null default 0 check (cost_price >= 0),
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists products_name_idx on products(name);

create table if not exists sales (
  id uuid primary key default gen_random_uuid(),
  receipt_no varchar(40) unique not null,
  employee_id uuid not null references users(id),
  payment payment_method not null,
  status sale_status not null default 'COMPLETED',
  total_amount numeric(14,2) not null default 0,
  total_cost numeric(14,2) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references sales(id) on delete cascade,
  product_id uuid not null references products(id),
  quantity integer not null check (quantity > 0),
  unit_price numeric(14,2) not null,
  unit_cost numeric(14,2) not null default 0,
  line_total numeric(14,2) not null
);
create index if not exists sales_created_at_idx on sales(created_at desc);
create index if not exists sale_items_sale_idx on sale_items(sale_id);

create table if not exists purchases (
  id uuid primary key default gen_random_uuid(),
  supplier varchar(180) not null,
  status purchase_status not null default 'PENDING',
  total_cost numeric(14,2) not null default 0,
  created_by uuid not null references users(id),
  created_at timestamptz not null default now(),
  approved_at timestamptz
);

create table if not exists purchase_items (
  id uuid primary key default gen_random_uuid(),
  purchase_id uuid not null references purchases(id) on delete cascade,
  product_id uuid not null references products(id),
  quantity integer not null check (quantity > 0),
  unit_cost numeric(14,2) not null check (unit_cost >= 0),
  line_total numeric(14,2) not null
);

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  title varchar(180) not null,
  message text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id),
  action varchar(100) not null,
  entity varchar(80) not null,
  entity_id uuid,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_idx on notifications(user_id, created_at desc);
create index if not exists audit_logs_created_idx on audit_logs(created_at desc);

create or replace function set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists users_updated_at on users;
create trigger users_updated_at before update on users for each row execute function set_updated_at();
drop trigger if exists products_updated_at on products;
create trigger products_updated_at before update on products for each row execute function set_updated_at();
