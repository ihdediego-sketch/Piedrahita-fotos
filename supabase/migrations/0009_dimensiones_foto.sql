-- Dimensiones en píxeles de la imagen original, para poder maquetar el
-- mosaico de /fotos (filas justificadas) sin cargar la imagen primero.
-- Admiten null: las fotos anteriores a esta migración se rellenan con un
-- backfill aparte y, mientras tanto, la interfaz asume 4:3.
alter table public.photos
  add column width int,
  add column height int;
