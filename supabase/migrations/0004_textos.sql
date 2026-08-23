-- Piedrahíta · más textos editables
--
-- `site_content` solo guardaba la cabecera del mapa y el SEO. Las pantallas de
-- acceso y de envío tenían su texto escrito en el código, así que cambiar una
-- coma exigía desplegar. Se suben a la tabla, agrupados por dónde salen.
-- Ejecutar entero en el SQL Editor.

alter table public.site_content
  add column if not exists login_title text not null default 'Entrar',
  add column if not exists login_intro text not null default
    'Pon tu correo y te mandamos un enlace para entrar. Si no tienes cuenta, se crea sola.',
  add column if not exists submit_title text not null default 'Enviar una fotografía',
  add column if not exists submit_intro text not null default
    'Tu fotografía no aparecerá en el mapa hasta que un colaborador la apruebe. Mientras esté pendiente puedes seguir editándola.';

comment on column public.site_content.login_title is
  'Titular de /entrar.';
comment on column public.site_content.login_intro is
  'Párrafo bajo el titular de /entrar: explica el enlace por correo.';
comment on column public.site_content.submit_title is
  'Titular de /subir cuando se envía una fotografía nueva.';
comment on column public.site_content.submit_intro is
  'Aviso de /subir para quien no puede publicar: su envío queda pendiente.';
