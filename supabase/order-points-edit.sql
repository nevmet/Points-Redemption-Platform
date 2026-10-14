-- Run after order-points.sql. Only owners may change a pending order number.
create or replace function public.update_order_point_request(p_request_id uuid, p_order_number text)
returns setof public.order_point_requests
language plpgsql security definer set search_path = ''
as $$
declare
  v_request public.order_point_requests%rowtype;
  v_number text := btrim(p_order_number);
begin
  if auth.uid() is null then raise exception 'order_points_signin'; end if;
  if v_number is null or char_length(v_number) not between 1 and 100 then
    raise exception 'order_points_invalid_order';
  end if;
  select * into v_request from public.order_point_requests where id = p_request_id for update;
  if not found or v_request.customer_id <> auth.uid() then raise exception 'order_points_forbidden'; end if;
  if v_request.status <> 'pending' then raise exception 'order_points_already_reviewed'; end if;
  if exists (select 1 from public.order_point_requests where id <> p_request_id
    and lower(order_number) = lower(v_number) and status = 'approved') then
    raise exception 'duplicate_order' using errcode = '23505';
  end if;
  return query update public.order_point_requests set order_number = v_number
    where id = p_request_id returning *;
end;
$$;
revoke all on function public.update_order_point_request(uuid, text) from public, anon;
grant execute on function public.update_order_point_request(uuid, text) to authenticated;

-- Verify the number staff actually reviewed, holding the same lock as edits.
create or replace function public.review_current_order_point_request(
  p_request_id uuid, p_approve boolean, p_points integer, p_note text, p_expected_order_number text
)
returns setof public.order_point_requests
language plpgsql security definer set search_path = ''
as $$
declare v_request public.order_point_requests%rowtype;
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'order_points_forbidden'; end if;
  select * into v_request from public.order_point_requests where id = p_request_id for update;
  if not found then raise exception 'order_points_not_found'; end if;
  if v_request.order_number is distinct from p_expected_order_number then raise exception 'order_points_changed'; end if;
  return query select * from public.review_order_point_request(p_request_id, p_approve, p_points, p_note);
end;
$$;
revoke all on function public.review_current_order_point_request(uuid, boolean, integer, text, text) from public, anon;
grant execute on function public.review_current_order_point_request(uuid, boolean, integer, text, text) to authenticated;
