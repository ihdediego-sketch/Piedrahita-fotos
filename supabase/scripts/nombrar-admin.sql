-- Piedrahíta · nombrar administrador a mano
--
-- Solo hace falta cuando aún no hay ningún admin, o cuando el que hay no
-- puede entrar. Con un admin dentro, lo normal es hacerlo desde el panel
-- (/admin → Personas), que es la misma operación con dos clics.
--
-- La persona tiene que haber entrado al sitio al menos una vez: el perfil lo
-- crea un trigger a partir del alta en auth.users, y hasta entonces no hay
-- fila que actualizar. Si no ha entrado, el script avisa y no toca nada.
--
-- Ejecutar entero en el SQL Editor. Cambiar el correo de la primera línea.

do $$
declare
  correo constant text := 'ihdediego@gmail.com';
  uid uuid;
  anterior public.app_role;
begin
  select id into uid from auth.users where lower(email) = lower(correo);

  if uid is null then
    raise exception
      'No hay ninguna cuenta con el correo %. Que entre una vez en el sitio y vuelve a ejecutar esto.',
      correo;
  end if;

  select role into anterior from public.profiles where id = uid;

  if anterior is null then
    raise exception
      'La cuenta % existe pero no tiene perfil. Revisa el trigger de alta.',
      correo;
  end if;

  if anterior = 'admin' then
    raise notice '% ya era administrador. Sin cambios.', correo;
    return;
  end if;

  -- El trigger profiles_guard_role deja pasar esto porque en el SQL Editor
  -- auth.uid() es null; desde la web exigiría ser admin ya.
  update public.profiles set role = 'admin' where id = uid;

  raise notice '% pasa de % a admin.', correo, anterior;
end
$$;

-- Para comprobarlo:
-- select u.email, p.role
-- from public.profiles p join auth.users u on u.id = p.id
-- order by p.role, u.email;
