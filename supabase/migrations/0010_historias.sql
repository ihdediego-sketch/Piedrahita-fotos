-- Piedrahíta · historias (blog)
--
-- Mismo modelo que las fotos: envío abierto y revisión por staff, con
-- me gusta y comentarios propios. Tablas nuevas en vez de generalizar
-- photos/likes/comments, para no tocar sus triggers ni políticas.
--
-- Ejecutar entero en el SQL Editor del proyecto, después de 0001-0009.

-- -------------------------------------------------------------- historias ----

create table public.stories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  excerpt text not null default '',
  content_md text not null default '',
  -- Ruta dentro del bucket 'photos' (el mismo que /fotos), no una URL
  cover_image_path text not null default '',
  seo_title text not null default '',
  seo_description text not null default '',
  status public.photo_status not null default 'pending',
  author_id uuid references public.profiles (id) on delete set null,
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  review_note text,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint stories_slug_ok check (slug ~ '^[a-z0-9-]+$'),
  constraint stories_title_ok check (btrim(title) <> '')
);

create index stories_status_idx on public.stories (status);
create index stories_author_idx on public.stories (author_id);

-- Igual que guard_photo: el estado y la autoría no se tocan desde el
-- cliente. Además sella published_at la primera vez que se publica.
create or replace function public.guard_story()
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
    if not privileged then
      new.status := 'pending';
    end if;
    if new.status <> 'pending' then
      new.reviewed_by := auth.uid();
      new.reviewed_at := now();
    end if;
    if new.status = 'published' then
      new.published_at := now();
    end if;
  else
    -- La autoría es inmutable: quien escribió la historia sigue siendo su autor
    new.author_id := old.author_id;
    if new.status is distinct from old.status then
      if not privileged then
        raise exception 'Solo un colaborador o administrador puede cambiar el estado';
      end if;
      new.reviewed_by := auth.uid();
      new.reviewed_at := now();
    end if;
    if new.status = 'published' and old.published_at is null then
      new.published_at := now();
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger stories_guard
  before insert or update on public.stories
  for each row execute function public.guard_story();

alter table public.stories enable row level security;

-- Visitante anónimo: solo lo publicado. Autor: además lo suyo. Staff: todo.
create policy stories_select on public.stories
  for select
  using (status = 'published' or author_id = auth.uid() or public.is_staff());

create policy stories_insert on public.stories
  for insert to authenticated
  with check (author_id = auth.uid());

-- El autor puede corregir su envío mientras siga pendiente; una vez
-- publicado o rechazado, solo staff.
create policy stories_update on public.stories
  for update to authenticated
  using (public.is_staff() or (author_id = auth.uid() and status = 'pending'))
  with check (public.is_staff() or (author_id = auth.uid() and status = 'pending'));

create policy stories_delete on public.stories
  for delete to authenticated
  using (public.is_admin() or (author_id = auth.uid() and status = 'pending'));

-- ------------------------------------------------------------- me gusta ----

create table public.story_likes (
  story_id uuid not null references public.stories (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (story_id, user_id)
);

alter table public.story_likes enable row level security;

create policy story_likes_select on public.story_likes for select using (true);

create policy story_likes_insert on public.story_likes
  for insert to authenticated with check (user_id = auth.uid());

create policy story_likes_delete on public.story_likes
  for delete to authenticated using (user_id = auth.uid());

-- ---------------------------------------------------------- comentarios ----

create table public.story_comments (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.stories (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  status public.photo_status not null default 'pending',
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint story_comments_body_ok check (length(btrim(body)) between 1 and 2000)
);

create index story_comments_story_idx on public.story_comments (story_id, created_at);
create index story_comments_status_idx on public.story_comments (status);

-- Igual que guard_comment: el estado y la autoría los fija el servidor.
create or replace function public.guard_story_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  privileged boolean := auth.uid() is null or public.is_staff();
begin
  if tg_op = 'INSERT' then
    new.user_id := coalesce(new.user_id, auth.uid());
    if not privileged then
      new.status := 'pending';
    end if;
    if new.status <> 'pending' then
      new.reviewed_by := auth.uid();
      new.reviewed_at := now();
    end if;
  else
    -- La autoría es inmutable: quien escribió el comentario sigue siendo su autor
    new.user_id := old.user_id;
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

create trigger story_comments_guard
  before insert or update on public.story_comments
  for each row execute function public.guard_story_comment();

alter table public.story_comments enable row level security;

-- Visitante anónimo y usuarios: solo lo publicado. Autor: además lo suyo.
-- Staff: todo.
create policy story_comments_select on public.story_comments
  for select
  using (status = 'published' or user_id = auth.uid() or public.is_staff());

create policy story_comments_insert on public.story_comments
  for insert to authenticated with check (user_id = auth.uid());

create policy story_comments_update on public.story_comments
  for update to authenticated
  using (user_id = auth.uid() or public.is_staff())
  with check (user_id = auth.uid() or public.is_staff());

-- Staff modera: puede borrar un comentario ajeno
create policy story_comments_delete on public.story_comments
  for delete to authenticated
  using (user_id = auth.uid() or public.is_staff());
