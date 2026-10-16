begin;
create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references auth.users(id) on delete cascade,
  customer_name text not null,
  customer_email text not null,
  body text not null check (length(btrim(body)) between 1 and 2000),
  reply text not null default '' check (length(reply)<=2000),
  replied_at timestamptz,
  operation_id uuid not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index contact_messages_customer_created on public.contact_messages(customer_id, created_at desc, id desc);
create index contact_messages_created on public.contact_messages(created_at desc, id desc);
alter table public.contact_messages enable row level security;
create policy contact_messages_read on public.contact_messages for select to authenticated
  using (customer_id=auth.uid() or public.is_admin());
revoke all on public.contact_messages from public,anon,authenticated;
grant select on public.contact_messages to authenticated;

create function public.submit_contact_message(p_body text,p_operation_id uuid)
returns public.contact_messages language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid(); v_row public.contact_messages%rowtype; v_body text := btrim(coalesce(p_body,''));
begin
  if v_user is null then raise exception 'signin'; end if;
  if v_body='' or length(v_body)>2000 or p_operation_id is null then raise exception 'invalid'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_operation_id::text,0));
  select * into v_row from public.contact_messages where operation_id=p_operation_id;
  if found then
    if v_row.customer_id<>v_user or v_row.body<>v_body then raise exception 'adjustmentConflict'; end if;
    return v_row;
  end if;
  insert into public.contact_messages(customer_id,customer_name,customer_email,body,operation_id)
    select id,coalesce(nullif(raw_user_meta_data->>'name',''),email),email,v_body,p_operation_id from auth.users where id=v_user
    returning * into v_row;
  if not found then raise exception 'signin'; end if;
  return v_row;
end; $$;

create function public.reply_contact_message(p_id uuid,p_reply text)
returns public.contact_messages language plpgsql security definer set search_path = '' as $$
declare v_row public.contact_messages%rowtype; v_reply text := btrim(coalesce(p_reply,''));
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'forbidden'; end if;
  if v_reply='' or length(v_reply)>2000 then raise exception 'invalid'; end if;
  update public.contact_messages set reply=v_reply,replied_at=now(),updated_at=now() where id=p_id returning * into v_row;
  if not found then raise exception 'notFound'; end if;
  return v_row;
end; $$;

create function public.delete_contact_message(p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'forbidden'; end if;
  delete from public.contact_messages where id=p_id;
end; $$;
revoke all on function public.submit_contact_message(text,uuid), public.reply_contact_message(uuid,text), public.delete_contact_message(uuid) from public,anon,authenticated;
grant execute on function public.submit_contact_message(text,uuid), public.reply_contact_message(uuid,text), public.delete_contact_message(uuid) to authenticated;
commit;
