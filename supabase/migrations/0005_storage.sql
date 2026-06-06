-- ════════════════════════════════════════════════════════════════════════════
-- Migració 0005: Storage per a fotos de llocs i objectes
-- Un sol bucket privat 'boat-photos' amb prefixos 'objects/' i 'locations/'.
-- ════════════════════════════════════════════════════════════════════════════

insert into storage.buckets (id, name, public)
values ('boat-photos', 'boat-photos', false)
on conflict (id) do nothing;

-- Lectura i escriptura per a usuaris autenticats (model de tripulació compartida).
drop policy if exists boat_photos_read on storage.objects;
create policy boat_photos_read on storage.objects
  for select to authenticated
  using (bucket_id = 'boat-photos');

drop policy if exists boat_photos_write on storage.objects;
create policy boat_photos_write on storage.objects
  for insert to authenticated
  with check (bucket_id = 'boat-photos');

drop policy if exists boat_photos_update on storage.objects;
create policy boat_photos_update on storage.objects
  for update to authenticated
  using (bucket_id = 'boat-photos')
  with check (bucket_id = 'boat-photos');
