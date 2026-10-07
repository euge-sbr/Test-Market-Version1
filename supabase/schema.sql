create extension if not exists "pgcrypto";

create table if not exists public.shops (
  id uuid primary key,
  name text not null,
  slug text not null unique,
  admin_email text unique,
  admin_password_hash text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.shops add column if not exists is_active boolean not null default true;

insert into public.shops (id, name, slug)
values ('00000000-0000-4000-8000-000000000001', 'Pearl & Pour', 'pearl-and-pour')
on conflict (id) do nothing;

alter table public.shops enable row level security;

create table if not exists public.products (
  id text primary key,
  shop_id uuid not null references public.shops(id),
  name text not null,
  description text not null default '',
  category text not null default 'Milk Tea',
  price numeric(10, 2) not null check (price >= 0),
  image_url text,
  rating numeric(2, 1) check (rating between 0 and 5),
  is_available boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.products add column if not exists shop_id uuid references public.shops(id);
update public.products
set shop_id = '00000000-0000-4000-8000-000000000001'
where shop_id is null;
alter table public.products alter column shop_id set not null;
alter table public.products drop constraint if exists products_shop_id_fkey;
alter table public.products add constraint products_shop_id_fkey
  foreign key (shop_id) references public.shops(id) on delete cascade;

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id),
  order_number text not null unique,
  customer_name text not null,
  customer_email text not null,
  customer_phone text not null,
  delivery_address text not null,
  delivery_city text not null,
  delivery_postal_code text not null,
  delivery_note text,
  payment_method text not null check (payment_method in ('card', 'cash')),
  total numeric(10, 2) not null check (total >= 0),
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'preparing', 'delivered', 'cancelled')),
  tracking_token_hash text,
  created_at timestamptz not null default now()
);

alter table public.orders add column if not exists shop_id uuid references public.shops(id);
alter table public.orders add column if not exists tracking_token_hash text;
update public.orders
set shop_id = '00000000-0000-4000-8000-000000000001'
where shop_id is null;
alter table public.orders alter column shop_id set not null;
alter table public.orders drop constraint if exists orders_shop_id_fkey;
alter table public.orders add constraint orders_shop_id_fkey
  foreign key (shop_id) references public.shops(id) on delete cascade;

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id text not null,
  product_name text not null,
  quantity integer not null check (quantity > 0),
  unit_price numeric(10, 2) not null check (unit_price >= 0)
);

create index if not exists products_availability_idx on public.products (is_available);
create index if not exists products_shop_id_idx on public.products (shop_id);
create index if not exists orders_shop_id_created_at_idx on public.orders (shop_id, created_at desc);
create unique index if not exists orders_tracking_token_hash_idx
  on public.orders (tracking_token_hash)
  where tracking_token_hash is not null;

create or replace function public.delete_shop_and_data(target_shop_id uuid)
returns boolean
language plpgsql
security invoker
set search_path = public
as $$
begin
  if target_shop_id is null
     or target_shop_id = '00000000-0000-4000-8000-000000000001'::uuid then
    raise exception 'Invalid shop. The platform shop cannot be deleted.';
  end if;

  delete from public.order_items
  where order_id in (
    select id from public.orders where shop_id = target_shop_id
  );

  delete from public.orders where shop_id = target_shop_id;
  delete from public.products where shop_id = target_shop_id;
  delete from public.shops where id = target_shop_id;

  return found;
end;
$$;

revoke all on function public.delete_shop_and_data(uuid) from public, anon, authenticated;
grant execute on function public.delete_shop_and_data(uuid) to service_role;

insert into public.products (id, shop_id, name, description, category, price, image_url, rating)
values
  ('prod-1', '00000000-0000-4000-8000-000000000001', 'Matcha Boba Latte', 'Creamy iced matcha with chewy brown sugar tapioca pearls.', 'Milk Tea', 6.50, '/team/p1.png', 4.9),
  ('prod-2', '00000000-0000-4000-8000-000000000001', 'Classic Brown Sugar Boba', 'A smooth brown sugar milk tea finished with soft boba pearls.', 'Milk Tea', 6.25, '/team/p2.png', 4.8),
  ('prod-3', '00000000-0000-4000-8000-000000000001', 'Honey Milk Tea', 'Lightly sweetened milk tea with a mellow honey finish.', 'Milk Tea', 5.75, '/team/p3.png', 4.7),
  ('prod-4', '00000000-0000-4000-8000-000000000001', 'Signature Brown Sugar Splash', 'A dramatic brown sugar boba drink for an extra-special treat.', 'Signature Drinks', 7.25, '/team/p4.png', 5.0)
on conflict (id) do nothing;

alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

drop policy if exists "Public can read available products" on public.products;
create policy "Public can read available products"
  on public.products for select to anon, authenticated
  using (is_available = true);

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "Public can read product images" on storage.objects;
create policy "Public can read product images"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'product-images');

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'products'
     ) then
    execute 'alter publication supabase_realtime add table public.products';
  end if;
end $$;

-- Admin writes use SUPABASE_SERVICE_ROLE_KEY on the server only.
-- Public clients can read available products and product images only.
