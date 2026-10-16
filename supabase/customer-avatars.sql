-- Private avatars: customers can access only their own folder.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('customer-avatars', 'customer-avatars', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy customer_avatars_read_own on storage.objects for select to authenticated
using (bucket_id = 'customer-avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy customer_avatars_insert_own on storage.objects for insert to authenticated
with check (bucket_id = 'customer-avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy customer_avatars_delete_own on storage.objects for delete to authenticated
using (bucket_id = 'customer-avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
