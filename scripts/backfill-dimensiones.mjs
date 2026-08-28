/**
 * Rellena `width`/`height` de las fotos anteriores a la migración 0009.
 *
 * Descarga cada imagen del bucket público y lee sus dimensiones con
 * `image-size`. Necesita `SUPABASE_SERVICE_ROLE_KEY` en el entorno (o en
 * `.env.local`) porque la RLS no deja actualizar fotos ajenas:
 *
 *   node scripts/backfill-dimensiones.mjs
 *
 * Es idempotente: solo toca filas con `width` a null.
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { imageSize } from "image-size";

// Carga .env.local a mano para no depender de dotenv
try {
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
} catch {
  /* sin .env.local: se usan las variables del entorno */
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error(
    "Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el entorno."
  );
  process.exit(1);
}

const supabase = createClient(url, key);

const { data: photos, error } = await supabase
  .from("photos")
  .select("id, title, image_path")
  .is("width", null);
if (error) throw error;

console.log(`${photos.length} fotos sin dimensiones.`);

for (const photo of photos) {
  const publicUrl = `${url}/storage/v1/object/public/photos/${photo.image_path}`;
  try {
    const res = await fetch(publicUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const { width, height } = imageSize(
      new Uint8Array(await res.arrayBuffer())
    );
    const { error: updateError } = await supabase
      .from("photos")
      .update({ width, height })
      .eq("id", photo.id);
    if (updateError) throw updateError;
    console.log(`✓ ${photo.title}: ${width}×${height}`);
  } catch (e) {
    console.error(`✗ ${photo.title} (${photo.image_path}): ${e.message}`);
  }
}
