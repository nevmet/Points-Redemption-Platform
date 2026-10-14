-- Run after schema.sql. Existing products keep their single-price behavior.
begin;
alter table public.products add column if not exists variants jsonb not null default '[]'::jsonb;
alter table public.redemption_requests add column if not exists product_name text;
alter table public.redemption_requests add column if not exists variant_id text;
alter table public.redemption_requests add column if not exists variant_name text;

create or replace function public.validate_product_variants()
returns trigger language plpgsql set search_path = public as $$
declare
  item jsonb;
  variant_id text;
  variant_name text;
  cost numeric;
  minimum_cost integer;
  seen_ids text[] := '{}';
  seen_names text[] := '{}';
  normalized jsonb := '[]'::jsonb;
  attribute jsonb;
  attributes jsonb;
  field_name text;
  field_value text;
  field_names text[];
  field_values text[];
  expected_fields text[];
  combination text;
begin
  if new.variants is null or jsonb_typeof(new.variants) <> 'array' then
    raise exception 'variantInvalid';
  end if;
  if jsonb_array_length(new.variants) > 30 then raise exception 'variantInvalid'; end if;
  for item in select value from jsonb_array_elements(new.variants) loop
    if jsonb_typeof(item) <> 'object' or jsonb_typeof(item->'id') is distinct from 'string'
      or jsonb_typeof(item->'points') is distinct from 'number' then raise exception 'variantInvalid'; end if;
    variant_id := item->>'id';
    variant_name := regexp_replace(btrim(item->>'name'), '\s+', ' ', 'g');
    attributes := '[]'::jsonb;
    field_names := '{}';
    field_values := '{}';
    if item ? 'attributes' then
      if jsonb_typeof(item->'attributes') is distinct from 'array' then raise exception 'variantInvalid'; end if;
      if jsonb_array_length(item->'attributes') not between 1 and 5 then raise exception 'variantInvalid'; end if;
      variant_name := '';
      for attribute in select value from jsonb_array_elements(item->'attributes') loop
        if jsonb_typeof(attribute->'name') is distinct from 'string' or jsonb_typeof(attribute->'value') is distinct from 'string' then raise exception 'variantInvalid'; end if;
        field_name := regexp_replace(btrim(attribute->>'name'), '\s+', ' ', 'g');
        field_value := regexp_replace(btrim(attribute->>'value'), '\s+', ' ', 'g');
        if length(field_name) not between 1 and 30 or length(field_value) not between 1 and 60
          or lower(field_name) in (select lower(value) from unnest(field_names) as value) then raise exception 'variantInvalid'; end if;
        field_names := array_append(field_names, field_name);
        field_values := array_append(field_values, lower(field_value));
        attributes := attributes || jsonb_build_array(jsonb_build_object('name', field_name, 'value', field_value));
        variant_name := variant_name || case when variant_name = '' then '' else ' / ' end || field_name || ': ' || field_value;
      end loop;
      combination := to_jsonb(field_values)::text;
    else
      if jsonb_typeof(item->'name') is distinct from 'string' or length(variant_name) < 1 or length(item->>'name') > 100 then raise exception 'variantInvalid'; end if;
      combination := to_jsonb(array[lower(variant_name)])::text;
    end if;
    if expected_fields is not null and expected_fields <> field_names then raise exception 'variantInvalid'; end if;
    expected_fields := field_names;
    cost := (item->>'points')::numeric;
    if variant_id !~ '^[a-zA-Z0-9_-]{1,80}$' or variant_id = any(seen_ids)
      or combination = any(seen_names)
      or cost <> trunc(cost) or cost < 1 or cost > 2147483647 then raise exception 'variantInvalid'; end if;
    seen_ids := array_append(seen_ids, variant_id);
    seen_names := array_append(seen_names, combination);
    minimum_cost := least(coalesce(minimum_cost, cost::integer), cost::integer);
    normalized := normalized || jsonb_build_array(jsonb_build_object('id', variant_id, 'name', variant_name, 'points', cost::integer) || case when item ? 'attributes' then jsonb_build_object('attributes', attributes) else '{}'::jsonb end);
  end loop;
  new.variants := normalized;
  if minimum_cost is not null then new.points := minimum_cost; end if;
  return new;
end;
$$;
drop trigger if exists products_validate_variants on public.products;
create trigger products_validate_variants before insert or update on public.products
for each row execute function public.validate_product_variants();
commit;
-- Production gift redemption remains disabled pending an atomic redemption RPC.
-- That RPC must validate variant ID and expected points, lock the balance, and
-- save product_name/variant_id/variant_name/points as immutable request snapshots.
