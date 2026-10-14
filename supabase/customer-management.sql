-- Run after schema.sql and order-points.sql. No service-role key belongs in the browser.
begin;
alter table public.point_transactions
  add column if not exists operation_id uuid,
  add column if not exists created_by uuid references auth.users(id),
  add column if not exists operator_name text,
  add column if not exists balance_after bigint;
create unique index if not exists point_adjustment_operation on public.point_transactions(operation_id) where operation_id is not null;
-- Associate legacy entries before switching account management to immutable user IDs.
update public.point_transactions t set customer_id = u.id from auth.users u
where t.customer_id is null and lower(t.customer_email) = lower(u.email);

create or replace function public.list_admin_customers()
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'forbidden'; end if;
  return (select coalesce(jsonb_agg(to_jsonb(c) order by c.created_at desc), '[]'::jsonb) from (
    select u.id, coalesce(nullif(u.raw_user_meta_data->>'name',''), u.email, '') as username,
      coalesce(u.email,'') as email, u.created_at,
      coalesce(sum(case when t.type = 'credit' then t.points else -t.points end),0)::bigint as balance,
      coalesce(sum(t.points) filter (where t.type = 'credit'),0)::bigint as total_credit,
      coalesce(sum(t.points) filter (where t.type = 'debit'),0)::bigint as total_debit
    from auth.users u left join public.point_transactions t on t.customer_id = u.id
    where coalesce(u.raw_app_meta_data->>'role','customer') <> 'admin'
    group by u.id
  ) c);
end; $$;

create or replace function public.list_admin_customer_transactions(p_customer_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'forbidden'; end if;
  if not exists(select 1 from auth.users where id = p_customer_id and coalesce(raw_app_meta_data->>'role','customer') <> 'admin') then raise exception 'notFound'; end if;
  return (select coalesce(jsonb_agg(to_jsonb(t) order by t.created_at desc), '[]'::jsonb) from public.point_transactions t where t.customer_id = p_customer_id);
end; $$;

-- Every insert, including order credits and future gift debits, locks the same user.
-- Direct client ledger writes are revoked below; records cannot be edited or removed.
create or replace function public.guard_points_ledger()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_balance bigint;
begin
  if tg_op <> 'INSERT' then raise exception 'immutable_points_ledger'; end if;
  if new.customer_id is null then raise exception 'invalid'; end if;
  perform 1 from auth.users where id = new.customer_id for update;
  if not found then raise exception 'notFound'; end if;
  select coalesce(sum(case when type = 'credit' then points else -points end),0) into v_balance from public.point_transactions where customer_id = new.customer_id;
  if new.points is null or new.points <= 0 or new.type not in ('credit','debit') then raise exception 'invalid'; end if;
  if new.type = 'debit' and v_balance < new.points then raise exception 'insufficient'; end if;
  new.balance_after := v_balance + case when new.type = 'credit' then new.points else -new.points end;
  new.created_by := auth.uid();
  select coalesce(nullif(raw_user_meta_data->>'name',''),email) into new.operator_name from auth.users where id = auth.uid();
  return new;
end; $$;
drop trigger if exists points_ledger_guard on public.point_transactions;
create trigger points_ledger_guard before insert or update or delete on public.point_transactions for each row execute function public.guard_points_ledger();
revoke insert, update, delete on public.point_transactions from anon, authenticated;

create or replace function public.adjust_customer_points(p_customer_id uuid, p_type text, p_points integer, p_note text, p_operation_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_email text; v_transaction public.point_transactions%rowtype;
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'forbidden'; end if;
  if p_type is null or p_type not in ('credit','debit') or p_points is null or p_points <= 0
    or p_operation_id is null or length(coalesce(p_note,'')) > 1000 then raise exception 'invalid'; end if;
  -- Serialize both retries and adjustments to this customer's ledger.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_operation_id::text,0));
  select email into v_email from auth.users where id = p_customer_id and coalesce(raw_app_meta_data->>'role','customer') <> 'admin' for update;
  if not found then raise exception 'notFound'; end if;
  select * into v_transaction from public.point_transactions where operation_id = p_operation_id;
  if found then
    if v_transaction.customer_id <> p_customer_id or v_transaction.created_by <> auth.uid() or v_transaction.type <> p_type
      or v_transaction.points <> p_points or v_transaction.description <> btrim(coalesce(p_note,'')) then raise exception 'adjustmentConflict'; end if;
    return to_jsonb(v_transaction);
  end if;
  insert into public.point_transactions(customer_id, customer_email, description, points, type, operation_id)
  values (p_customer_id,v_email,btrim(coalesce(p_note,'')),p_points,p_type,p_operation_id) returning * into v_transaction;
  return to_jsonb(v_transaction);
end; $$;
revoke all on function public.list_admin_customers(), public.list_admin_customer_transactions(uuid), public.adjust_customer_points(uuid,text,integer,text,uuid), public.guard_points_ledger() from public, anon;
grant execute on function public.list_admin_customers(), public.list_admin_customer_transactions(uuid), public.adjust_customer_points(uuid,text,integer,text,uuid) to authenticated;
commit;
