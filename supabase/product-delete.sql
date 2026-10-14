-- Existing projects: only administrators can delete unpublished products.
-- Keep redemption history after removing a catalog product. Safe to re-run.
begin;

alter table public.redemption_requests add column if not exists product_name text;
alter table public.redemption_requests alter column product_id drop not null;
alter table public.redemption_requests drop constraint if exists redemption_requests_product_id_fkey;
alter table public.redemption_requests add constraint redemption_requests_product_id_fkey
  foreign key (product_id) references public.products(id) on delete set null;

create or replace function public.preserve_deleted_product_history()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if old.status <> 'draft' then raise exception 'product_not_draft'; end if;
  -- Older requests may not have a name snapshot yet. Never overwrite a saved name.
  update public.redemption_requests set product_name = old.name
    where product_id = old.id and nullif(product_name, '') is null;
  return old;
end;
$$;
revoke all on function public.preserve_deleted_product_history() from public, anon, authenticated;
drop trigger if exists products_preserve_history on public.products;
create trigger products_preserve_history before delete on public.products
  for each row execute function public.preserve_deleted_product_history();
drop policy if exists products_admin_delete on public.products;
create policy products_admin_delete on public.products for delete to authenticated
using (public.is_admin() and status = 'draft');
commit;
