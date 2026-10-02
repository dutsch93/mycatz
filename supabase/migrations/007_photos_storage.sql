-- Profilbilder für Katzen und Gruppen: öffentlicher Storage-Bucket, Schreibrechte nur für
-- Owner des jeweiligen Haushalts. Pfad-Konvention: <household_id>/<cat|group>-<id>-<timestamp>.<ext>
-- -- der erste Pfad-Teil wird in den Policies gegen my_household_id() geprüft.

insert into storage.buckets (id, name, public)
values ('cat-photos', 'cat-photos', true)
on conflict (id) do nothing;

create policy "cat_photos_read" on storage.objects
  for select using (bucket_id = 'cat-photos');

create policy "cat_photos_insert" on storage.objects
  for insert with check (
    bucket_id = 'cat-photos'
    and my_role() = 'owner'
    and (storage.foldername(name))[1] = my_household_id()::text
  );

create policy "cat_photos_update" on storage.objects
  for update using (
    bucket_id = 'cat-photos'
    and my_role() = 'owner'
    and (storage.foldername(name))[1] = my_household_id()::text
  );

create policy "cat_photos_delete" on storage.objects
  for delete using (
    bucket_id = 'cat-photos'
    and my_role() = 'owner'
    and (storage.foldername(name))[1] = my_household_id()::text
  );
