-- Piedrahíta · perfil editable
--
-- Añade a cada perfil un texto de presentación y un avatar, y crea el bucket
-- donde viven esas imágenes. Ejecutar entero en el SQL Editor.

-- --------------------------------------------------------- campos nuevos ----

alter table public.profiles
  add column if not exists bio text not null default '',
  -- Ruta dentro del bucket 'avatars', no una URL completa (igual que photos)
  add column if not exists avatar_path text not null default '';

alter table public.profiles
  drop constraint if exists profiles_bio_ok;

alter table public.profiles
  add constraint profiles_bio_ok check (length(bio) <= 600);

comment on column public.profiles.bio is
  'Presentación que la persona escribe sobre sí misma. Se muestra en público.';

-- El nombre firma comentarios y fotos: no puede quedarse en blanco. Se limpia
-- aquí antes de exigirlo, por si algún alta antigua se quedó vacía.
update public.profiles
set display_name = 'Vecino'
where btrim(display_name) = '';

alter table public.profiles
  drop constraint if exists profiles_display_name_ok;

-- Solo el mínimo imprescindible: el alta lo rellena un trigger a partir del
-- correo y no puede fallar por un nombre corto. El mínimo de dos letras lo
-- pide el formulario del perfil.
alter table public.profiles
  add constraint profiles_display_name_ok
  check (length(btrim(display_name)) between 1 and 60);

-- -------------------------------------------------------------- storage ----

-- Bucket propio y no la carpeta de fotos: los avatares son pequeños, se
-- reemplazan a menudo y no deben mezclarse con el archivo histórico.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars', 'avatars', true, 5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists avatars_storage_read on storage.objects;
drop policy if exists avatars_storage_insert on storage.objects;
drop policy if exists avatars_storage_update on storage.objects;
drop policy if exists avatars_storage_delete on storage.objects;

create policy avatars_storage_read on storage.objects
  for select using (bucket_id = 'avatars');

-- Cada quien sube dentro de su carpeta <uid>/…, para que nadie pise el
-- avatar de otro.
create policy avatars_storage_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy avatars_storage_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'avatars'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );

create policy avatars_storage_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'avatars'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );
