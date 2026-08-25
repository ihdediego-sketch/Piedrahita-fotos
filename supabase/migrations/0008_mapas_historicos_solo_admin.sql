-- Restringe los mapas históricos a solo administradores (no colaboradores):
-- georreferenciarlos con cuidado importa más que aprobar una foto, así que
-- se trata como "Personas" y "Textos", no como "Fotos"/"Comentarios".
--
-- Ejecutar entero en el SQL Editor del proyecto, después de 0007.

drop policy historical_maps_select on public.historical_maps;
create policy historical_maps_select on public.historical_maps
  for select using (published or public.is_admin());

drop policy historical_maps_insert on public.historical_maps;
create policy historical_maps_insert on public.historical_maps
  for insert to authenticated with check (public.is_admin());

drop policy historical_maps_update on public.historical_maps;
create policy historical_maps_update on public.historical_maps
  for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy historical_maps_delete on public.historical_maps;
create policy historical_maps_delete on public.historical_maps
  for delete to authenticated using (public.is_admin());

drop policy historical_maps_storage_write on storage.objects;
create policy historical_maps_storage_write on storage.objects
  for insert to authenticated
  with check (bucket_id = 'historical-maps' and public.is_admin());

drop policy historical_maps_storage_update on storage.objects;
create policy historical_maps_storage_update on storage.objects
  for update to authenticated
  using (bucket_id = 'historical-maps' and public.is_admin());

drop policy historical_maps_storage_delete on storage.objects;
create policy historical_maps_storage_delete on storage.objects
  for delete to authenticated using (bucket_id = 'historical-maps' and public.is_admin());
