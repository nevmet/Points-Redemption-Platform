-- Pending release: apply before publishing the administrator address viewer.
-- Customer addresses are saved in their own Supabase Auth user metadata.
begin;
create or replace function public.get_admin_customer_shipping_address(p_customer_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_address jsonb;
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'forbidden'; end if;
  select raw_user_meta_data->'shipping_address' into v_address
  from auth.users
  where id = p_customer_id and coalesce(raw_app_meta_data->>'role','customer') <> 'admin';
  if not found then raise exception 'notFound'; end if;
  if v_address is null or jsonb_typeof(v_address) <> 'object' then return null; end if;
  -- Do not expose unrelated account metadata, credentials, or extra submitted keys.
  return jsonb_build_object(
    'recipient', v_address->>'recipient', 'phone', v_address->>'phone',
    'country', v_address->>'country', 'region', v_address->>'region',
    'city', v_address->>'city', 'postalCode', v_address->>'postalCode',
    'line1', v_address->>'line1', 'line2', v_address->>'line2'
  );
end; $$;
revoke all on function public.get_admin_customer_shipping_address(uuid) from public, anon;
grant execute on function public.get_admin_customer_shipping_address(uuid) to authenticated;
commit;
