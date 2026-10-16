-- Account-owned read receipts; atomic merging across browsers and devices.
begin;
create table if not exists public.notification_reads (
  customer_id uuid not null references auth.users(id) on delete cascade,
  notification_id text not null check (length(notification_id) between 1 and 300),
  read_at timestamptz not null default now(),
  primary key(customer_id, notification_id)
);
alter table public.notification_reads enable row level security;
revoke all on public.notification_reads from anon, authenticated;
grant select on public.notification_reads to authenticated;
drop policy if exists notification_reads_owner on public.notification_reads;
create policy notification_reads_owner on public.notification_reads for select to authenticated using(customer_id=auth.uid());
create or replace function public.mark_notifications_read(p_ids text[])
returns text[] language plpgsql security definer set search_path = '' as $$
declare v_user uuid:=auth.uid(); v_result text[];
begin
  if v_user is null then raise exception 'signin'; end if;
  if p_ids is null or cardinality(p_ids)>300 or exists(select 1 from unnest(p_ids) n where n is null or length(n) not between 1 and 300) then raise exception 'invalid'; end if;
  perform 1 from auth.users where id=v_user for update;
  insert into public.notification_reads(customer_id,notification_id)
    select v_user,n from unnest(p_ids) n on conflict do nothing;
  delete from public.notification_reads where customer_id=v_user and notification_id not in (
    select notification_id from public.notification_reads where customer_id=v_user order by read_at desc,notification_id limit 300
  );
  select coalesce(array_agg(notification_id order by read_at desc,notification_id),'{}') into v_result
    from public.notification_reads where customer_id=v_user;
  return v_result;
end; $$;
revoke all on function public.mark_notifications_read(text[]) from public, anon, authenticated;
grant execute on function public.mark_notifications_read(text[]) to authenticated;
commit;
