-- Run after schema.sql. First installation assigns existing products to Apple,
-- as requested; rerunning this migration preserves subsequent assignments.
begin;
create table if not exists public.product_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (name = btrim(name) and length(name) between 1 and 80),
  created_at timestamptz not null default now()
);
create unique index if not exists product_categories_name_lower on public.product_categories(lower(name));
alter table public.product_categories enable row level security;
drop policy if exists categories_read on public.product_categories;
create policy categories_read on public.product_categories for select to authenticated using (true);
drop policy if exists categories_admin_write on public.product_categories;
create policy categories_admin_write on public.product_categories for all to authenticated
using (public.is_admin()) with check (public.is_admin());

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'products_category_fk' and conrelid = 'public.products'::regclass) then
    insert into public.product_categories(name) values ('Apple'), ('Louis Vuitton') on conflict do nothing;
    update public.products set category = 'Apple';
    alter table public.products add constraint products_category_fk foreign key(category)
      references public.product_categories(name) on update cascade on delete restrict;
  end if;
end $$;
commit;
