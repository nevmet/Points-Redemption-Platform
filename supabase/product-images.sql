-- Run after schema.sql for existing projects. The cover remains image_url.
alter table public.products add column if not exists image_urls text[] not null default '{}';
update public.products set image_urls = array[image_url]
where cardinality(image_urls) = 0 and image_url is not null;
alter table public.products drop constraint if exists products_image_count;
alter table public.products add constraint products_image_count check (cardinality(image_urls) <= 8);
update storage.buckets set file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id = 'product-images';
