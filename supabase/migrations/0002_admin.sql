-- Nombrar administrador.
--
-- Ejecutar DESPUÉS de haber entrado una vez en el sitio con ese email: el
-- perfil no existe hasta que existe el usuario en auth.users.
--
-- Para nombrar más admins o colaboradores más adelante se usa el panel
-- (/admin → Personas), no hace falta volver aquí.

update public.profiles
set role = 'admin'
where id = (select id from auth.users where email = 'didelco@gmail.com');
