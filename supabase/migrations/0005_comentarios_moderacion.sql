-- Piedrahíta · moderación de comentarios
--
-- Los comentarios pasaban a la vista de todo el mundo al momento de
-- escribirlos. Se les da el mismo tratamiento que a las fotos: quien no es
-- staff envía a revisión, y solo se ven publicados (más los propios y los
-- de staff, que siempre puede verlo todo).
--
-- Ejecutar entero en el SQL Editor del proyecto, después de 0001-0004.

-- Los comentarios que ya existen se dieron por buenos sin moderación: se
-- rellenan como publicados para no hacerlos desaparecer de golpe. El valor
-- por defecto pasa a 'pending' justo después, para lo que se escriba desde
-- ahora (el guard_comment de más abajo lo fuerza igual, esto es cinturón).
alter table public.comments
  add column status public.photo_status not null default 'published',
  add column reviewed_by uuid references public.profiles (id) on delete set null,
  add column reviewed_at timestamptz,
  add column review_note text;

alter table public.comments alter column status set default 'pending';

create index comments_status_idx on public.comments (status);

-- Mismo guardián que las fotos: el estado y la autoría los fija el
-- servidor, no el cliente.
create or replace function public.guard_comment()
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
    -- Lo que envía un usuario registrado entra siempre como pendiente
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

-- Sustituye al trigger de solo "updated_at": guard_comment ya lo hace y
-- además fija estado y autoría.
drop trigger if exists comments_touch on public.comments;
create trigger comments_guard
  before insert or update on public.comments
  for each row execute function public.guard_comment();

-- Visitante anónimo y usuarios: solo lo publicado. Autor: además lo suyo.
-- Staff: todo.
drop policy if exists comments_select on public.comments;
create policy comments_select on public.comments
  for select
  using (status = 'published' or user_id = auth.uid() or public.is_staff());
