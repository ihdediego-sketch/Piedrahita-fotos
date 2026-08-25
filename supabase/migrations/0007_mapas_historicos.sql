-- Mapas históricos superpuestos.
--
-- A diferencia de `photos`, aquí solo sube contenido el staff (admin o
-- colaborador): no hay flujo de moderación de terceros, así que basta un
-- `published` booleano y el borrado puede ser real, no solo un estado más.
--
-- Ejecutar entero en el SQL Editor del proyecto.

create table public.historical_maps (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  date_label text not null default '',
  -- Ruta dentro del bucket 'historical-maps' de Storage, no una URL completa
  image_path text not null,
  -- [top-left, top-right, bottom-right, bottom-left], cada uno [lng, lat]:
  -- el mismo orden y forma que espera maplibregl.ImageSource.coordinates
  corners jsonb not null,
  default_opacity real not null default 0.75,
  published boolean not null default false,
  sort_order int not null default 0,
  author_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint historical_maps_title_ok check (btrim(title) <> ''),
  constraint historical_maps_opacity_ok check (default_opacity between 0 and 1),
  constraint historical_maps_corners_ok check (
    jsonb_typeof(corners) = 'array' and jsonb_array_length(corners) = 4
  )
);

create index historical_maps_published_idx on public.historical_maps (published);

-- Reutiliza la función ya declarada en 0001_init.sql
create trigger historical_maps_touch
  before update on public.historical_maps
  for each row execute function public.touch_updated_at();

alter table public.historical_maps enable row level security;

-- Visitante anónimo: solo lo publicado. Staff: todo (para poder revisarlo
-- en el panel antes de publicar).
create policy historical_maps_select on public.historical_maps
  for select using (published or public.is_staff());

create policy historical_maps_insert on public.historical_maps
  for insert to authenticated with check (public.is_staff());

create policy historical_maps_update on public.historical_maps
  for update to authenticated
  using (public.is_staff()) with check (public.is_staff());

create policy historical_maps_delete on public.historical_maps
  for delete to authenticated using (public.is_staff());

-- -------------------------------------------------------------- storage ----

-- Bucket público: como las fotos, las imágenes se ven sin iniciar sesión.
-- Solo jpeg/png/webp (son escaneos de archivo, no hace falta gif ni el
-- coste de decodificar avif en imágenes pesadas) y hasta 40 MB.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'historical-maps', 'historical-maps', true, 41943040,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy historical_maps_storage_read on storage.objects
  for select using (bucket_id = 'historical-maps');

-- Sin carpeta por usuario: a diferencia de 'photos', aquí solo escribe
-- staff, no hay envíos de terceros que aislar.
create policy historical_maps_storage_write on storage.objects
  for insert to authenticated
  with check (bucket_id = 'historical-maps' and public.is_staff());

create policy historical_maps_storage_update on storage.objects
  for update to authenticated
  using (bucket_id = 'historical-maps' and public.is_staff());

create policy historical_maps_storage_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'historical-maps' and public.is_staff());
