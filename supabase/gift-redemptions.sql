-- Run after customer-management.sql, product-variants.sql and product-options.sql.
-- Gift requests and their ledger entries are written only by these atomic RPCs.
begin;
alter table public.redemption_requests
  add column if not exists customer_id uuid references auth.users(id) on delete restrict,
  add column if not exists operation_id uuid,
  add column if not exists operation_fingerprint text,
  add column if not exists resolution_note text not null default '',
  add column if not exists refunded_at timestamptz,
  add column if not exists status_history jsonb not null default '[]'::jsonb;
update public.redemption_requests r set customer_id = u.id from auth.users u
where r.customer_id is null and lower(r.customer_email) = lower(u.email);
-- Stop instead of silently exposing or losing an unowned legacy request.
alter table public.redemption_requests alter column customer_id set not null;
alter table public.redemption_requests drop constraint if exists redemption_requests_status_check;
alter table public.redemption_requests add constraint redemption_requests_status_check
  check (status in ('pending','processing','completed','cancelled','rejected'));
create unique index if not exists redemption_operation_id on public.redemption_requests(operation_id) where operation_id is not null;
create index if not exists redemption_customer_created on public.redemption_requests(customer_id, created_at desc);
alter table public.point_transactions
  add column if not exists redemption_request_id uuid references public.redemption_requests(id) on delete restrict,
  add column if not exists refund_redemption_id uuid references public.redemption_requests(id) on delete restrict;
create unique index if not exists gift_debit_once on public.point_transactions(redemption_request_id) where redemption_request_id is not null;
create unique index if not exists gift_refund_once on public.point_transactions(refund_redemption_id) where refund_redemption_id is not null;
create index if not exists transactions_customer_created on public.point_transactions(customer_id, created_at desc);

drop policy if exists redemption_customer_read on public.redemption_requests;
create policy redemption_customer_read on public.redemption_requests for select to authenticated
  using (customer_id = auth.uid() or public.is_admin());
drop policy if exists transactions_customer_read on public.point_transactions;
create policy transactions_customer_read on public.point_transactions for select to authenticated
  using (customer_id = auth.uid() or public.is_admin());
revoke all on public.redemption_requests, public.point_transactions from anon, authenticated;
grant select on public.redemption_requests, public.point_transactions to authenticated;
grant select on public.products to anon, authenticated;
grant insert, update, delete on public.products to authenticated;
grant select, insert, update, delete on public.product_categories to authenticated;

create or replace function public.redeem_gift(
  p_product_id uuid, p_variant_id text, p_expected_points integer,
  p_selected_options jsonb, p_operation_id uuid
)
returns public.redemption_requests
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_product public.products%rowtype;
  v_request public.redemption_requests%rowtype;
  v_variant jsonb;
  v_option jsonb;
  v_choice jsonb;
  v_options jsonb := '[]'::jsonb;
  v_cost integer;
  v_email text;
  v_name text;
  v_company text;
  v_fingerprint text;
begin
  if v_user is null then raise exception 'signin'; end if;
  if p_product_id is null or p_operation_id is null or p_expected_points is null or p_expected_points <= 0 then raise exception 'invalid'; end if;
  if jsonb_typeof(p_selected_options) is distinct from 'array' then raise exception 'optionUnavailable'; end if;
  if jsonb_array_length(p_selected_options) > 5 then raise exception 'optionUnavailable'; end if;
  v_fingerprint := jsonb_build_object('product',p_product_id,'variant',p_variant_id,'points',p_expected_points,'options',p_selected_options)::text;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_operation_id::text,0));
  select * into v_request from public.redemption_requests where operation_id = p_operation_id;
  if found then
    if v_request.customer_id <> v_user or v_request.operation_fingerprint is distinct from v_fingerprint then raise exception 'adjustmentConflict'; end if;
    return v_request;
  end if;
  -- Keep the selected price/configuration stable until both records are committed.
  select * into v_product from public.products where id = p_product_id and status = 'published' for share;
  if not found then raise exception 'notFound'; end if;
  if jsonb_array_length(v_product.variants) > 0 then
    select value into v_variant from jsonb_array_elements(v_product.variants) where value->>'id' = p_variant_id;
    if not found then raise exception 'variantUnavailable'; end if;
    v_cost := (v_variant->>'points')::integer;
  else
    if p_variant_id is not null then raise exception 'variantUnavailable'; end if;
    v_cost := v_product.points;
  end if;
  if v_cost <> p_expected_points then raise exception 'priceChanged'; end if;
  if jsonb_array_length(p_selected_options) <> jsonb_array_length(v_product.options) then raise exception 'optionUnavailable'; end if;
  for v_choice in select value from jsonb_array_elements(p_selected_options) loop
    if jsonb_typeof(v_choice->'optionId') is distinct from 'string' or jsonb_typeof(v_choice->'value') is distinct from 'string' then raise exception 'optionUnavailable'; end if;
  end loop;
  if (select count(distinct value->>'optionId') from jsonb_array_elements(p_selected_options)) <> jsonb_array_length(p_selected_options) then raise exception 'optionUnavailable'; end if;
  for v_option in select value from jsonb_array_elements(v_product.options) loop
    select value into v_choice from jsonb_array_elements(p_selected_options) where value->>'optionId' = v_option->>'id';
    if not found or not (v_option->'values' @> jsonb_build_array(v_choice->>'value')) then raise exception 'optionUnavailable'; end if;
    v_options := v_options || jsonb_build_array(jsonb_build_object('name',v_option->>'name','value',v_choice->>'value'));
  end loop;
  -- All point writers lock this same user, including the ledger trigger.
  select email, coalesce(nullif(raw_user_meta_data->>'name',''),email), raw_user_meta_data->>'company'
    into v_email,v_name,v_company from auth.users where id = v_user for update;
  if not found then raise exception 'signin'; end if;
  insert into public.redemption_requests(customer_id, customer_name, customer_email, company,
    product_id, product_name, variant_id, variant_name, selected_options, points,
    operation_id, operation_fingerprint, status_history)
  values(v_user,v_name,v_email,v_company,v_product.id,v_product.name,v_variant->>'id',v_variant->>'name',v_options,v_cost,
    p_operation_id,v_fingerprint,jsonb_build_array(jsonb_build_object('status','pending','at',now(),'by',v_user,'note','')))
  returning * into v_request;
  -- Insufficient funds abort the entire transaction, including the request above.
  insert into public.point_transactions(customer_id,customer_email,description,points,type,redemption_request_id)
    values(v_user,v_email,v_product.name,v_cost,'debit',v_request.id);
  return v_request;
end; $$;

create or replace function public.set_gift_request_status(p_request_id uuid, p_status text, p_note text)
returns public.redemption_requests
language plpgsql security definer set search_path = '' as $$
declare
  v_request public.redemption_requests%rowtype;
  v_admin boolean := public.is_admin();
  v_user uuid := auth.uid();
  v_note text := btrim(coalesce(p_note,''));
  v_refund boolean := p_status in ('cancelled','rejected');
begin
  if v_user is null then raise exception 'signin'; end if;
  select * into v_request from public.redemption_requests where id = p_request_id for update;
  if not found then raise exception 'notFound'; end if;
  if not v_admin and (v_request.customer_id <> v_user or p_status is distinct from 'cancelled') then raise exception 'forbidden'; end if;
  if p_status = v_request.status then return v_request; end if;
  if not (
    (v_request.status = 'pending' and p_status in ('processing','completed','cancelled','rejected'))
    or (v_request.status = 'processing' and p_status in ('completed','rejected') and v_admin)
  ) or p_status is null then raise exception 'redemptionState'; end if;
  if length(v_note) > 1000 then raise exception 'invalid'; end if;
  if v_refund and v_note = '' then raise exception 'resolutionRequired'; end if;
  if v_refund then
    insert into public.point_transactions(customer_id,customer_email,description,points,type,refund_redemption_id)
      values(v_request.customer_id,v_request.customer_email,v_request.request_code,v_request.points,'credit',v_request.id);
  end if;
  update public.redemption_requests set status=p_status,resolution_note=v_note,
    refunded_at=case when v_refund then now() else refunded_at end,
    status_history=status_history || jsonb_build_array(jsonb_build_object('status',p_status,'at',now(),'by',v_user,'note',v_note))
    where id=p_request_id returning * into v_request;
  return v_request;
end; $$;
revoke all on function public.redeem_gift(uuid,text,integer,jsonb,uuid), public.set_gift_request_status(uuid,text,text) from public, anon, authenticated;
grant execute on function public.redeem_gift(uuid,text,integer,jsonb,uuid), public.set_gift_request_status(uuid,text,text) to authenticated;
commit;
