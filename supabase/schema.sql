-- Lifted Extracts CRM — Supabase schema
-- Run this in the Supabase SQL editor to bootstrap the database.

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- REPS
create table if not exists reps (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  territory text not null default '',
  phone text not null default '',
  payment_type text not null default 'commission' check (payment_type in ('commission', 'salary', 'hybrid')),
  commission_rate numeric not null default 10,
  start_date date not null,
  user_id uuid references auth.users(id),
  created_at timestamptz not null default now()
);

-- STORES
create table if not exists stores (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  license_number text not null default '',
  address text not null default '',
  city text not null default '',
  region text not null default 'five_boroughs' check (region in ('long_island','five_boroughs','rockland_orange','westchester','upstate')),
  lat numeric,
  lng numeric,
  contact_name text not null default '',
  contact_phone text not null default '',
  contact_email text not null default '',
  status text not null default 'prospect' check (status in ('prospect','sampled','active','damage_control')),
  credit_rating int check (credit_rating between 1 and 5),
  credit_notes text not null default '',
  pricing_tier text not null default 'list' check (pricing_tier in ('list','floor')),
  assigned_rep_id uuid references reps(id),
  last_order_date date,
  next_reorder_date date,
  units_on_hand int not null default 0,
  needs_damage_control boolean not null default false,
  created_at timestamptz not null default now()
);

-- INVENTORY BATCHES
create table if not exists inventory_batches (
  id uuid primary key default uuid_generate_v4(),
  batch_code text not null unique,
  sku text not null,
  name text not null,
  total_units int not null default 0,
  units_allocated int not null default 0,
  expires_at date not null,
  created_at timestamptz not null default now()
);

-- ORDERS
create table if not exists orders (
  id uuid primary key default uuid_generate_v4(),
  store_id uuid not null references stores(id) on delete cascade,
  rep_id uuid references reps(id),
  sku text not null default 'VP20260331',
  batch_id text not null default 'VP20260331',
  units int not null check (units >= 60),
  price_per_unit numeric not null default 32.50,
  order_date date not null,
  delivered_date date,
  units_sold int not null default 0,
  sell_through_days int,
  created_at timestamptz not null default now()
);

-- COMMISSIONS
create table if not exists commissions (
  id uuid primary key default uuid_generate_v4(),
  rep_id uuid not null references reps(id) on delete cascade,
  order_id uuid not null references orders(id) on delete cascade,
  base_amount numeric not null default 0,
  velocity_bonus numeric not null default 0,
  total numeric generated always as (base_amount + velocity_bonus) stored,
  paid boolean not null default false,
  period text not null,
  created_at timestamptz not null default now()
);

-- ACTIVITY LOGS
create table if not exists activity_logs (
  id uuid primary key default uuid_generate_v4(),
  rep_id uuid not null references reps(id) on delete cascade,
  store_id uuid references stores(id),
  type text not null default 'visit' check (type in ('visit','sample','call','email','event')),
  notes text not null default '',
  created_at timestamptz not null default now()
);

-- ROUTES
create table if not exists routes (
  id uuid primary key default uuid_generate_v4(),
  rep_id uuid references reps(id),
  date date not null,
  region text not null,
  store_ids uuid[] not null default '{}',
  created_at timestamptz not null default now()
);

-- TIMELINE ITEMS
create table if not exists timeline_items (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  category text not null default 'new_door' check (category in ('new_door','damage_control','rep_onboarding','batch_launch')),
  status text not null default 'todo' check (status in ('todo','in_progress','done','blocked')),
  target_date date not null,
  actual_date date,
  week_number int not null default 1 check (week_number between 1 and 13),
  assignee_id uuid references reps(id),
  notes text not null default '',
  created_at timestamptz not null default now()
);

-- QR INCIDENTS
create table if not exists qr_incidents (
  id uuid primary key default uuid_generate_v4(),
  store_id uuid not null references stores(id) on delete cascade,
  reported_date date not null,
  description text not null,
  remediation_status text not null default 'pending' check (remediation_status in ('pending','revisit_scheduled','resolved')),
  resolved_date date,
  notes text not null default '',
  created_at timestamptz not null default now()
);

-- LEADS
create table if not exists leads (
  id uuid primary key default uuid_generate_v4(),
  store_name text not null,
  contact_name text not null default '',
  contact_phone text not null default '',
  address text not null default '',
  stage text not null default 'cold' check (stage in ('cold','sampled','first_order','repeat')),
  assigned_rep_id uuid references reps(id),
  notes text not null default '',
  created_at timestamptz not null default now()
);

-- ROW-LEVEL SECURITY

alter table reps enable row level security;
alter table stores enable row level security;
alter table orders enable row level security;
alter table inventory_batches enable row level security;
alter table commissions enable row level security;
alter table activity_logs enable row level security;
alter table routes enable row level security;
alter table timeline_items enable row level security;
alter table qr_incidents enable row level security;
alter table leads enable row level security;

-- Admin email (Ryan) gets full access, reps get filtered access

-- Helper function to check if current user is admin
create or replace function is_admin()
returns boolean
language sql security definer
as $$
  select coalesce(auth.jwt() ->> 'email', '') = 'ryan@liftedextracts.co';
$$;

-- Helper function to get current rep id
create or replace function my_rep_id()
returns uuid
language sql security definer
as $$
  select id from reps where user_id = auth.uid() limit 1;
$$;

-- STORES policies
create policy "Admin sees all stores" on stores for all using (is_admin());
create policy "Rep sees assigned stores" on stores for select using (assigned_rep_id = my_rep_id());
create policy "Rep updates assigned stores" on stores for update using (assigned_rep_id = my_rep_id());

-- REPS policies
create policy "Admin manages reps" on reps for all using (is_admin());
create policy "Rep reads own profile" on reps for select using (user_id = auth.uid());

-- ORDERS policies
create policy "Admin manages orders" on orders for all using (is_admin());
create policy "Rep sees own orders" on orders for select using (rep_id = my_rep_id());
create policy "Rep creates orders" on orders for insert with check (rep_id = my_rep_id() or rep_id is null);

-- INVENTORY_BATCHES policies
create policy "All authenticated see batches" on inventory_batches for select using (auth.role() = 'authenticated');
create policy "Admin manages batches" on inventory_batches for all using (is_admin());

-- COMMISSIONS policies
create policy "Admin manages commissions" on commissions for all using (is_admin());
create policy "Rep sees own commissions" on commissions for select using (rep_id = my_rep_id());

-- ACTIVITY_LOGS policies
create policy "Admin manages logs" on activity_logs for all using (is_admin());
create policy "Rep manages own logs" on activity_logs for all using (rep_id = my_rep_id());

-- ROUTES policies
create policy "Admin manages routes" on routes for all using (is_admin());
create policy "Rep manages own routes" on routes for all using (rep_id = my_rep_id());

-- TIMELINE, QR_INCIDENTS, LEADS — admin only + rep read
create policy "Admin manages timeline" on timeline_items for all using (is_admin());
create policy "Rep reads timeline" on timeline_items for select using (auth.role() = 'authenticated');
create policy "Admin manages qr_incidents" on qr_incidents for all using (is_admin());
create policy "Rep reads incidents" on qr_incidents for select using (auth.role() = 'authenticated');
create policy "Admin manages leads" on leads for all using (is_admin());
create policy "Rep reads leads" on leads for select using (auth.role() = 'authenticated');

-- Seed initial batch
insert into inventory_batches (batch_code, sku, name, total_units, units_allocated, expires_at)
values ('VP20260331', 'LIFTED-VP-60', 'Vape Pen 60ct - March 2026 Batch', 5000, 0, '2027-03-31')
on conflict (batch_code) do nothing;
