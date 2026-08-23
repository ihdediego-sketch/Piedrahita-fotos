/**
 * Sube al proyecto de Supabase las cuatro fotografías con las que arrancó el
 * sitio, cuando el contenido vivía en `content/photos.json` y `public/photos/`.
 *
 * Se ejecuta una sola vez, después del SQL:
 *
 *   SUPABASE_SECRET_KEY=sb_secret_… node supabase/seed/migrate.mjs
 *
 * Usa la clave secreta (no la publishable) porque escribe saltándose la RLS:
 * las filas se insertan ya publicadas y sin autor, que es lo que corresponde a
 * un archivo que existía antes de que hubiera cuentas.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, "..", "..");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;

if (!url || !key) {
  console.error(
    "Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SECRET_KEY.\n" +
      "La clave secreta está en el panel de Supabase → Project Settings → API keys."
  );
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false },
});

const MIME = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".gif": "image/gif",
};

const photos = JSON.parse(
  await readFile(path.join(here, "photos.json"), "utf-8")
);

for (const photo of photos) {
  const { data: existing } = await supabase
    .from("photos")
    .select("id")
    .eq("slug", photo.id)
    .maybeSingle();

  if (existing) {
    console.log(`· ${photo.id} ya estaba, se salta`);
    continue;
  }

  const source = path.join(root, "public", photo.image);
  const ext = path.extname(source).toLowerCase();
  const file = await readFile(source);
  // Carpeta 'archivo/' en vez de un uuid de usuario: estas fotos no tienen
  // autor, venían con el sitio.
  const objectPath = `archivo/${photo.id}${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("photos")
    .upload(objectPath, file, {
      contentType: MIME[ext] ?? "image/jpeg",
      upsert: true,
    });

  if (uploadError) {
    console.error(`✗ ${photo.id}: ${uploadError.message}`);
    process.exitCode = 1;
    continue;
  }

  const { error } = await supabase.from("photos").insert({
    slug: photo.id,
    title: photo.title,
    description: photo.description,
    lat: photo.lat,
    lng: photo.lng,
    year_from: photo.yearFrom,
    year_to: photo.yearTo,
    date_label: photo.dateLabel,
    image_path: objectPath,
    featured: photo.featured ?? false,
    status: "published",
  });

  if (error) {
    console.error(`✗ ${photo.id}: ${error.message}`);
    process.exitCode = 1;
    continue;
  }

  console.log(`✓ ${photo.id}`);
}

console.log("\nListo.");
