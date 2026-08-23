-- Piedrahíta · esquema inicial
--
-- Roles:
--   admin       — dueño del archivo. Todo, incluido gestionar roles y borrar.
--   colaborador — publica fotos y textos directamente y aprueba lo que envían
--                 los usuarios registrados.
--   usuario     — envía fotos (quedan pendientes de aprobación), da me gusta
--                 y comenta.
--
-- Ejecutar entero en el SQL Editor del proyecto.

-- ---------------------------------------------------------------- tipos ----

create type public.app_role as enum ('admin', 'colaborador', 'usuario');
create type public.photo_status as enum ('pending', 'published', 'rejected');

-- -------------------------------------------------------------- perfiles ----

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  role public.app_role not null default 'usuario',
  created_at timestamptz not null default now()
);

comment on table public.profiles is
  'Datos públicos de cada persona registrada. El email vive solo en auth.users.';

-- Cada alta en auth.users crea su perfil. security definer: el trigger corre
-- con permisos del dueño, no los del usuario que se acaba de registrar.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''),
      split_part(new.email, '@', 1)
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------- helpers de permisos ----

-- Van en security definer para que las políticas RLS de otras tablas puedan
-- consultar profiles sin que la RLS de profiles se llame a sí misma.

create or replace function public.my_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.my_role() = 'admin', false);
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.my_role() in ('admin', 'colaborador'), false);
$$;

-- Nadie se sube el rol a sí mismo. El bypass con auth.uid() null es para el
-- SQL Editor y la service_role key; anon y authenticated siempre traen uid.
create or replace function public.guard_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role then
    if auth.uid() is not null and not public.is_admin() then
      raise exception 'Solo un administrador puede cambiar el rol';
    end if;
    -- Nunca dejar el archivo sin dueño
    if old.role = 'admin'
       and (select count(*) from public.profiles where role = 'admin') <= 1 then
      raise exception 'No se puede quitar el último administrador';
    end if;
  end if;
  return new;
end;
$$;

create trigger profiles_guard_role
  before update on public.profiles
  for each row execute function public.guard_profile_role();

alter table public.profiles enable row level security;

-- Lectura pública: hace falta el nombre para firmar comentarios.
create policy profiles_select on public.profiles
  for select using (true);

create policy profiles_update on public.profiles
  for update to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- ---------------------------------------------------------------- fotos ----

create table public.photos (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text not null default '',
  lat double precision not null,
  lng double precision not null,
  year_from int not null,
  year_to int not null,
  date_label text not null default '',
  -- Ruta dentro del bucket 'photos' de Storage, no una URL completa
  image_path text not null,
  featured boolean not null default false,
  status public.photo_status not null default 'pending',
  -- Apuntan a profiles, no a auth.users, para que PostgREST pueda incrustar
  -- el nombre del autor en una sola consulta (profiles.id ya cuelga de auth.users).
  author_id uuid references public.profiles (id) on delete set null,
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint photos_years_ok check (year_from <= year_to),
  constraint photos_slug_ok check (slug ~ '^[a-z0-9-]+$'),
  constraint photos_title_ok check (btrim(title) <> ''),
  constraint photos_lat_ok check (lat between -90 and 90),
  constraint photos_lng_ok check (lng between -180 and 180)
);

create index photos_status_idx on public.photos (status);
create index photos_author_idx on public.photos (author_id);

-- El estado y la autoría no se tocan desde el cliente: los fija el servidor.
create or replace function public.guard_photo()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  privileged boolean := auth.uid() is null or public.is_staff();
begin
  if tg_op = 'INSERT' then
    new.author_id := coalesce(new.author_id, auth.uid());
    -- Lo que envía un usuario registrado entra siempre como pendiente
    if not privileged then
      new.status := 'pending';
    end if;
    if new.status <> 'pending' then
      new.reviewed_by := auth.uid();
      new.reviewed_at := now();
    end if;
  else
    -- La autoría es inmutable: quien envió la foto sigue siendo su autor
    new.author_id := old.author_id;
    if new.status is distinct from old.status then
      if not privileged then
        raise exception 'Solo un colaborador o administrador puede cambiar el estado';
      end if;
      new.reviewed_by := auth.uid();
      new.reviewed_at := now();
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger photos_guard
  before insert or update on public.photos
  for each row execute function public.guard_photo();

alter table public.photos enable row level security;

-- Visitante anónimo: solo lo publicado. Autor: además lo suyo. Staff: todo.
create policy photos_select on public.photos
  for select
  using (status = 'published' or author_id = auth.uid() or public.is_staff());

create policy photos_insert on public.photos
  for insert to authenticated
  with check (author_id = auth.uid());

-- El autor puede corregir su envío mientras siga pendiente; una vez publicado
-- o rechazado, solo staff.
create policy photos_update on public.photos
  for update to authenticated
  using (public.is_staff() or (author_id = auth.uid() and status = 'pending'))
  with check (public.is_staff() or (author_id = auth.uid() and status = 'pending'));

create policy photos_delete on public.photos
  for delete to authenticated
  using (public.is_admin() or (author_id = auth.uid() and status = 'pending'));

-- ------------------------------------------------------------- me gusta ----

create table public.likes (
  photo_id uuid not null references public.photos (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (photo_id, user_id)
);

alter table public.likes enable row level security;

create policy likes_select on public.likes for select using (true);

create policy likes_insert on public.likes
  for insert to authenticated with check (user_id = auth.uid());

create policy likes_delete on public.likes
  for delete to authenticated using (user_id = auth.uid());

-- ---------------------------------------------------------- comentarios ----

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  photo_id uuid not null references public.photos (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint comments_body_ok check (length(btrim(body)) between 1 and 2000)
);

create index comments_photo_idx on public.comments (photo_id, created_at);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger comments_touch
  before update on public.comments
  for each row execute function public.touch_updated_at();

alter table public.comments enable row level security;

create policy comments_select on public.comments for select using (true);

create policy comments_insert on public.comments
  for insert to authenticated with check (user_id = auth.uid());

create policy comments_update on public.comments
  for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Staff modera: puede borrar un comentario ajeno
create policy comments_delete on public.comments
  for delete to authenticated
  using (user_id = auth.uid() or public.is_staff());

-- ------------------------------------------------- textos de la portada ----

-- Fila única: la clave booleana con check (id) impide que haya una segunda.
create table public.site_content (
  id boolean primary key default true,
  title text not null,
  subtitle text not null,
  meta_title text not null,
  meta_description text not null,
  updated_at timestamptz not null default now(),
  constraint site_content_singleton check (id)
);

insert into public.site_content (title, subtitle, meta_title, meta_description)
values (
  'Piedrahíta',
  'Memoria de un pueblo',
  'Piedrahíta — Memoria visual',
  'Archivo fotográfico e histórico de Piedrahíta (Ávila), de 1800 a la actualidad, sobre un mapa interactivo.'
);

create trigger site_content_touch
  before update on public.site_content
  for each row execute function public.touch_updated_at();

alter table public.site_content enable row level security;

create policy site_content_select on public.site_content for select using (true);

create policy site_content_update on public.site_content
  for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- -------------------------------------------------------------- storage ----

-- Bucket público: las imágenes del archivo se ven sin iniciar sesión, y las
-- pendientes tampoco son secretas (su URL no se publica en ningún sitio).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'photos', 'photos', true, 20971520,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy photos_storage_read on storage.objects
  for select using (bucket_id = 'photos');

-- Cada quien sube dentro de su carpeta <uid>/…, para que un usuario no pueda
-- sobrescribir la imagen de otro.
create policy photos_storage_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy photos_storage_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'photos'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_staff())
  );

create policy photos_storage_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'photos'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_staff())
  );
