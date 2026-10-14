-- Run after the existing schema/migrations and before allowing real customers.
-- Keep production redemptions closed until audited atomic redemption/refund RPCs are deployed.
begin;
drop policy if exists redemption_customer_insert on public.redemption_requests;
drop policy if exists redemption_admin_update on public.redemption_requests;
drop policy if exists redemption_admin_delete on public.redemption_requests;
revoke insert, update, delete on public.redemption_requests from anon, authenticated;
commit;
