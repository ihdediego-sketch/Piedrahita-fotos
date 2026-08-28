-- Piedrahíta · historia destacada
--
-- Igual que las fotos: quien publica puede marcar una historia como
-- destacada, para que el listado la trate como portada de revista en vez
-- de como una entrada más del índice.
--
-- Ejecutar entero en el SQL Editor del proyecto, después de 0001-0010.

alter table public.stories
  add column featured boolean not null default false;
