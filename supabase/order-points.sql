-- Run after schema.sql. Customers submit order numbers; staff choose the award.
-- No client may set its own customer identity, approval status or point amount.
create table if not exists public.order_point_requests (
  id uuid primary key default gen_random_uuid(),
  order_number text not null check (char_length(order_number) between 1 and 100 and order_number = btrim(order_number)),
  customer_id uuid not null references auth.users(id) on delete restrict,
  customer_email text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  awarded_points integer,
  review_note text not null default '' check (char_length(review_note) <= 1000),
  reviewed_by uuid references auth.users(id) on delete restrict,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint order_points_review_state check (
    (status = 'pending' and awarded_points is null and reviewed_by is null and reviewed_at is null)
    or (status = 'approved' and awarded_points is not null and awarded_points > 0 and reviewed_by is not null and reviewed_at is not null)
    or (status = 'rejected' and awarded_points is null and reviewed_by is not null and reviewed_at is not null)
  )
);

create unique index if not exists order_points_customer_order
  on public.order_point_requests (customer_id, lower(order_number));
-- Multiple people may submit a number, but staff can award it only once.
create unique index if not exists order_points_approved_order
  on public.order_point_requests (lower(order_number)) where status = 'approved';

alter table public.point_transactions
  add column if not exists order_point_request_id uuid references public.order_point_requests(id) on delete restrict,
  add column if not exists customer_id uuid references auth.users(id) on delete restrict;
create unique index if not exists transactions_order_point_request
  on public.point_transactions (order_point_request_id) where order_point_request_id is not null;

alter table public.order_point_requests enable row level security;
revoke all on public.order_point_requests from anon, authenticated;
grant select on public.order_point_requests to authenticated;
drop policy if exists order_points_read on public.order_point_requests;
create policy order_points_read on public.order_point_requests for select to authenticated
  using (customer_id = auth.uid() or public.is_admin());

-- New order credits follow the immutable customer ID; legacy rows retain email access.
drop policy if exists transactions_customer_read on public.point_transactions;
create policy transactions_customer_read on public.point_transactions for select to authenticated
  using (public.is_admin() or customer_id = auth.uid()
    or (customer_id is null and (auth.jwt() ->> 'email') = customer_email));

create or replace function public.submit_order_point_request(p_order_number text)
returns setof public.order_point_requests
language plpgsql security definer set search_path = ''
as $$
declare
  v_order text := btrim(p_order_number);
  v_email text := auth.jwt() ->> 'email';
begin
  if auth.uid() is null or nullif(v_email, '') is null then
    raise exception 'order_points_signin';
  end if;
  if v_order is null or char_length(v_order) not between 1 and 100 then
    raise exception 'order_points_invalid_order';
  end if;
  return query insert into public.order_point_requests (order_number, customer_id, customer_email)
    values (v_order, auth.uid(), v_email) returning *;
end;
$$;

create or replace function public.review_order_point_request(
  p_request_id uuid, p_approve boolean, p_points integer, p_note text
)
returns setof public.order_point_requests
language plpgsql security definer set search_path = ''
as $$
declare
  v_request public.order_point_requests%rowtype;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'order_points_forbidden';
  end if;
  if p_approve is null or (p_approve and (p_points is null or p_points <= 0))
    or char_length(coalesce(p_note, '')) > 1000 then
    raise exception 'order_points_invalid_review';
  end if;
  select * into v_request from public.order_point_requests where id = p_request_id for update;
  if not found then raise exception 'order_points_not_found'; end if;
  if v_request.status <> 'pending' then raise exception 'order_points_already_reviewed'; end if;

  -- The lock, unique indexes and single transaction protect against double awards.
  update public.order_point_requests set
    status = case when p_approve then 'approved' else 'rejected' end,
    awarded_points = case when p_approve then p_points else null end,
    review_note = btrim(coalesce(p_note, '')),
    reviewed_by = auth.uid(), reviewed_at = now()
    where id = p_request_id;

  if p_approve then
    insert into public.point_transactions
      (customer_id, customer_email, description, points, type, order_point_request_id)
    values (v_request.customer_id, v_request.customer_email,
      'Order ' || v_request.order_number, p_points, 'credit', v_request.id);
  end if;
  return query select * from public.order_point_requests where id = p_request_id;
end;
$$;

revoke all on function public.submit_order_point_request(text) from public, anon;
revoke all on function public.review_order_point_request(uuid, boolean, integer, text) from public, anon;
grant execute on function public.submit_order_point_request(text) to authenticated;
grant execute on function public.review_order_point_request(uuid, boolean, integer, text) to authenticated;
