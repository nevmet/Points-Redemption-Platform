create extension if not exists pgcrypto;

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  points integer not null check (points > 0),
  image_url text,
  image_urls text[] not null default '{}' check (cardinality(image_urls) <= 8),
  variants jsonb not null default '[]'::jsonb,
  options jsonb not null default '[]'::jsonb,
  description text not null default '',
  status text not null default 'draft' check (status in ('published', 'draft')),
  featured boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.redemption_requests (
  id uuid primary key default gen_random_uuid(),
  request_code text not null unique default ('REW-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))),
  customer_name text not null,
  customer_email text not null,
  company text,
  product_id uuid references public.products(id) on delete set null,
  product_name text,
  variant_id text,
  variant_name text,
  selected_options jsonb not null default '[]'::jsonb,
  points integer not null check (points > 0),
  status text not null default 'pending' check (status in ('pending', 'processing', 'completed')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.point_transactions (
  id uuid primary key default gen_random_uuid(),
  customer_email text not null,
  description text not null,
  points integer not null check (points > 0),
  type text not null check (type in ('credit', 'debit')),
  created_at timestamptz not null default timezone('utc', now())
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at
before update on public.products
for each row execute function public.set_updated_at();

drop trigger if exists redemption_requests_set_updated_at on public.redemption_requests;
create trigger redemption_requests_set_updated_at
before update on public.redemption_requests
for each row execute function public.set_updated_at();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false);
$$;

alter table public.products enable row level security;
alter table public.redemption_requests enable row level security;
alter table public.point_transactions enable row level security;

drop policy if exists products_public_read on public.products;
create policy products_public_read
on public.products for select
using (status = 'published' or public.is_admin());

drop policy if exists products_admin_insert on public.products;
create policy products_admin_insert
on public.products for insert to authenticated
with check (public.is_admin());

drop policy if exists products_admin_update on public.products;
create policy products_admin_update
on public.products for update to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists products_admin_delete on public.products;
create policy products_admin_delete
on public.products for delete to authenticated
using (public.is_admin() and status = 'draft');

drop policy if exists redemption_customer_read on public.redemption_requests;
create policy redemption_customer_read
on public.redemption_requests for select
using (public.is_admin() or (auth.jwt() ->> 'email') = customer_email);

-- Customer gift writes stay disabled until atomic redemption/refund RPCs are deployed.
drop policy if exists redemption_customer_insert on public.redemption_requests;
drop policy if exists redemption_admin_update on public.redemption_requests;
drop policy if exists redemption_admin_delete on public.redemption_requests;
revoke insert, update, delete on public.redemption_requests from anon, authenticated;

drop policy if exists transactions_customer_read on public.point_transactions;
create policy transactions_customer_read
on public.point_transactions for select
using (public.is_admin() or (auth.jwt() ->> 'email') = customer_email);

drop policy if exists transactions_admin_insert on public.point_transactions;
create policy transactions_admin_insert
on public.point_transactions for insert to authenticated
with check (public.is_admin());

drop policy if exists transactions_admin_update on public.point_transactions;
create policy transactions_admin_update
on public.point_transactions for update to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists transactions_admin_delete on public.point_transactions;
create policy transactions_admin_delete
on public.point_transactions for delete to authenticated
using (public.is_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = excluded.public,
  file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists product_images_public_read on storage.objects;
create policy product_images_public_read
on storage.objects for select
using (bucket_id = 'product-images');

drop policy if exists product_images_admin_insert on storage.objects;
create policy product_images_admin_insert
on storage.objects for insert to authenticated
with check (bucket_id = 'product-images' and public.is_admin());

drop policy if exists product_images_admin_update on storage.objects;
create policy product_images_admin_update
on storage.objects for update to authenticated
using (bucket_id = 'product-images' and public.is_admin())
with check (bucket_id = 'product-images' and public.is_admin());

drop policy if exists product_images_admin_delete on storage.objects;
create policy product_images_admin_delete
on storage.objects for delete to authenticated
using (bucket_id = 'product-images' and public.is_admin());
