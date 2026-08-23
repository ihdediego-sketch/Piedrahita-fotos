import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";
import type { Photo } from "@/lib/photos";
import type { SiteContent } from "@/lib/site";

const CONTENT_DIR = path.join(process.cwd(), "content");
const SITE_FILE = path.join(CONTENT_DIR, "site.json");
const PHOTOS_FILE = path.join(CONTENT_DIR, "photos.json");
const PHOTOS_DIR = path.join(process.cwd(), "public", "photos");

const isDev = process.env.NODE_ENV === "development";

export async function GET() {
  if (!isDev) return new NextResponse(null, { status: 404 });

  const [site, photos] = await Promise.all([
    fs.readFile(SITE_FILE, "utf-8").then(JSON.parse),
    fs.readFile(PHOTOS_FILE, "utf-8").then(JSON.parse),
  ]);
  return NextResponse.json({ site, photos });
}

export async function PUT(req: Request) {
  if (!isDev) return new NextResponse(null, { status: 404 });

  const body = (await req.json()) as {
    site: SiteContent;
    photos: Photo[];
  };

  const errors: string[] = [];
  const ids = new Set<string>();
  for (const p of body.photos) {
    if (!p.id || !/^[a-z0-9-]+$/.test(p.id)) errors.push(`id inválido: "${p.id}"`);
    if (ids.has(p.id)) errors.push(`id duplicado: "${p.id}"`);
    ids.add(p.id);
    if (!p.title?.trim()) errors.push(`"${p.id}": falta el título`);
    if (!p.image) errors.push(`"${p.id}": falta la imagen`);
    if (!Number.isFinite(p.lat) || !Number.isFinite(p.lng))
      errors.push(`"${p.id}": coordenadas inválidas`);
    if (!Number.isInteger(p.yearFrom) || !Number.isInteger(p.yearTo) || p.yearFrom > p.yearTo)
      errors.push(`"${p.id}": rango de años inválido`);
  }
  if (errors.length) {
    return NextResponse.json({ errors }, { status: 400 });
  }

  // Imágenes que dejan de estar referenciadas (fotos borradas o reemplazadas)
  const oldPhotos: Photo[] = JSON.parse(await fs.readFile(PHOTOS_FILE, "utf-8"));
  const kept = new Set(body.photos.map((p) => p.image));
  const orphans = oldPhotos
    .map((p) => p.image)
    .filter((img) => img.startsWith("/photos/") && !kept.has(img));

  await Promise.all([
    fs.writeFile(SITE_FILE, JSON.stringify(body.site, null, 2) + "\n"),
    fs.writeFile(PHOTOS_FILE, JSON.stringify(body.photos, null, 2) + "\n"),
    ...orphans.map((img) =>
      fs
        .unlink(path.join(PHOTOS_DIR, path.basename(img)))
        .catch(() => {}) // si el archivo ya no existe, no pasa nada
    ),
  ]);
  return NextResponse.json({ ok: true });
}
