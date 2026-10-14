-- Run after schema.sql and product-variants.sql.
begin;
alter table public.products add column if not exists options jsonb not null default '[]'::jsonb;
alter table public.redemption_requests add column if not exists selected_options jsonb not null default '[]'::jsonb;

create or replace function public.validate_product_options()
returns trigger language plpgsql set search_path = public as $$
declare
  item jsonb;
  entry jsonb;
  option_id text;
  option_name text;
  option_value text;
  ids text[] := '{}';
  names text[] := '{}';
  seen_values text[];
  option_values jsonb;
  normalized jsonb := '[]'::jsonb;
begin
  if new.options is null or jsonb_typeof(new.options) <> 'array' then raise exception 'optionInvalid'; end if;
  if jsonb_array_length(new.options) > 5 then raise exception 'optionInvalid'; end if;
  for item in select value from jsonb_array_elements(new.options) loop
    if jsonb_typeof(item->'id') is distinct from 'string' or jsonb_typeof(item->'name') is distinct from 'string'
      or jsonb_typeof(item->'values') is distinct from 'array' then raise exception 'optionInvalid'; end if;
    option_id := item->>'id';
    option_name := regexp_replace(btrim(item->>'name'), '\s+', ' ', 'g');
    if option_id !~ '^[a-zA-Z0-9_-]{1,80}$' or option_id = any(ids) or length(option_name) not between 1 and 30
      or lower(option_name) = any(names) or jsonb_array_length(item->'values') not between 1 and 30 then raise exception 'optionInvalid'; end if;
    seen_values := '{}';
    option_values := '[]'::jsonb;
    for entry in select value from jsonb_array_elements(item->'values') loop
      if jsonb_typeof(entry) <> 'string' then raise exception 'optionInvalid'; end if;
      option_value := regexp_replace(btrim(entry #>> '{}'), '\s+', ' ', 'g');
      if length(option_value) not between 1 and 60 or lower(option_value) = any(seen_values) then raise exception 'optionInvalid'; end if;
      seen_values := array_append(seen_values, lower(option_value));
      option_values := option_values || jsonb_build_array(option_value);
    end loop;
    ids := array_append(ids, option_id);
    names := array_append(names, lower(option_name));
    normalized := normalized || jsonb_build_array(jsonb_build_object('id', option_id, 'name', option_name, 'values', option_values));
  end loop;
  new.options := normalized;
  return new;
end;
$$;
drop trigger if exists products_validate_options on public.products;
create trigger products_validate_options before insert or update on public.products
for each row execute function public.validate_product_options();
commit;
-- Production redemption is still disabled until the atomic RPC is implemented.
-- The RPC must resolve every option ID/value against the current product, reject
-- missing/removed/unknown choices, and store selected_options snapshots atomically
-- with the request and points debit. Options never alter the variant's points.
