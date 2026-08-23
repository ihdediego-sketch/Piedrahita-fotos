import type { Photo, PhotoRow } from "./types";

export type { Photo } from "./types";

export const TIMELINE_MIN = 1800;
/* El archivo es de fotografía antigua: por ahora se corta en el fin de siglo,
   y ya se ampliará si entran fotos posteriores. */
export const TIMELINE_MAX = 1999;

export const PHOTO_BUCKET = "photos";
export const AVATAR_BUCKET = "avatars";

export const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
];

export const ACCEPTED_IMAGE_EXT = ".jpg,.jpeg,.png,.webp,.avif,.gif";

/** URL pública de un objeto de un bucket de Storage. */
export function publicUrl(bucket: string, path: string): string {
  if (!path) return "";
  // Las rutas ya absolutas (o de la carpeta public/) se dejan tal cual: así el
  // panel puede previsualizar una imagen antes de que exista en Storage.
  if (/^(https?:)?\/\//.test(path) || path.startsWith("/") || path.startsWith("blob:"))
    return path;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
}

/** URL pública de un objeto del bucket de fotos. */
export const imageUrl = (path: string) => publicUrl(PHOTO_BUCKET, path);

/** URL pública de un avatar. */
export const avatarUrl = (path: string) => publicUrl(AVATAR_BUCKET, path);

/**
 * Fila de la base de datos → objeto de la interfaz.
 *
 * `likes` y `comments` llegan de los conteos incrustados de PostgREST
 * (`likes(count)`), que devuelve `[{ count: n }]`.
 */
export function toPhoto(
  row: PhotoRow & {
    likes?: { count: number }[] | null;
    comments?: { count: number }[] | null;
    author?: { display_name: string } | null;
  }
): Photo {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    lat: row.lat,
    lng: row.lng,
    yearFrom: row.year_from,
    yearTo: row.year_to,
    dateLabel: row.date_label,
    image: imageUrl(row.image_path),
    imagePath: row.image_path,
    featured: row.featured,
    status: row.status,
    authorId: row.author_id,
    authorName: row.author?.display_name ?? "",
    reviewNote: row.review_note,
    createdAt: row.created_at,
    likes: row.likes?.[0]?.count ?? 0,
    comments: row.comments?.[0]?.count ?? 0,
  };
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export function defaultDateLabel(p: { yearFrom: number; yearTo: number }): string {
  return p.yearFrom === p.yearTo
    ? String(p.yearFrom)
    : `c. ${p.yearFrom}–${p.yearTo}`;
}
