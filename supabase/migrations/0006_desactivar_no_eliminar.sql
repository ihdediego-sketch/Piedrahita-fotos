-- Piedrahíta · nadie borra, solo se desactiva
--
-- Antes, el autor de una foto o comentario podía retirar lo suyo
-- eliminándolo de la base de datos. A partir de ahora eso ya no existe para
-- nadie, ni siquiera para un admin desde la propia app: retirar algo lo
-- deja como "rechazado" (mismo estado que usa la moderación), en vez de
-- borrar la fila. El autor conserva la posibilidad de retirar lo suyo sin
-- pasar por staff, solo que ahora es un cambio de estado, no un borrado.
--
-- Ejecutar entero en el SQL Editor del proyecto, después de 0001-0005.

-- El autor puede pasar lo suyo a 'rejected' aunque no sea staff (retirada
-- propia); cualquier otro cambio de estado lo sigue reservando a staff.
create or replace function public.guard_photo()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  privileged boolean := auth.uid() is null or public.is_staff();
  self_withdraw boolean := tg_op = 'UPDATE' and auth.uid() = old.author_id and new.status = 'rejected';
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
  else
    new.author_id := old.author_id;
    if new.status is distinct from old.status then
      if not privileged and not self_withdraw then
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

create or replace function public.guard_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  privileged boolean := auth.uid() is null or public.is_staff();
  self_withdraw boolean := tg_op = 'UPDATE' and auth.uid() = old.user_id and new.status = 'rejected';
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
    new.user_id := old.user_id;
    if new.status is distinct from old.status then
      if not privileged and not self_withdraw then
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

-- El autor puede seguir tocando su foto mientras esté pendiente, y ahora
-- también dejarla en 'rejected' (retirada) sin ser staff.
drop policy if exists photos_update on public.photos;
create policy photos_update on public.photos
  for update to authenticated
  using (public.is_staff() or (author_id = auth.uid() and status = 'pending'))
  with check (
    public.is_staff() or (author_id = auth.uid() and status in ('pending', 'rejected'))
  );

-- Sin borrado para nadie: ni el autor ni el staff. Lo que antes se
-- eliminaba ahora se desactiva (status = 'rejected').
drop policy if exists photos_delete on public.photos;
drop policy if exists comments_delete on public.comments;
