"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { PHOTO_BUCKET, defaultDateLabel, slugify } from "@/lib/photos";
import { TIMELINE_MAX, TIMELINE_MIN } from "@/lib/photos";
import type { PhotoStatus, Role, SiteContent } from "@/lib/types";

export type Result = { ok: true; slug?: string } | { ok: false; error: string };

export type PhotoInput = {
  /** Vacío al crear. */
  id?: string;
  title: string;
  description: string;
  lat: number;
  lng: number;
  yearFrom: number;
  yearTo: number;
  dateLabel: string;
  imagePath: string;
  /** Dimensiones en píxeles del original, leídas en el navegador al subir. */
  width?: number | null;
  height?: number | null;
  featured: boolean;
  /** Solo lo respeta el servidor si quien guarda es staff. */
  status?: PhotoStatus;
};

function validate(input: PhotoInput): string | null {
  if (!input.title.trim()) return "Falta el título.";
  if (!input.imagePath) return "Falta la imagen.";
  if (!Number.isFinite(input.lat) || !Number.isFinite(input.lng))
    return "Coloca la foto en el mapa.";
  if (input.lat < -90 || input.lat > 90 || input.lng < -180 || input.lng > 180)
    return "Las coordenadas están fuera de rango.";
  if (!Number.isInteger(input.yearFrom) || !Number.isInteger(input.yearTo))
    return "Los años deben ser números enteros.";
  if (input.yearFrom > input.yearTo)
    return "El año inicial no puede ser posterior al final.";
  if (input.yearFrom < TIMELINE_MIN || input.yearTo > TIMELINE_MAX)
    return `Los años deben estar entre ${TIMELINE_MIN} y ${TIMELINE_MAX}.`;
  return null;
}

/** Un slug libre a partir del título, con sufijo numérico si ya existe. */
async function uniqueSlug(
  supabase: Awaited<ReturnType<typeof createClient>>,
  title: string,
  ignoreId?: string
): Promise<string> {
  const base = slugify(title) || "foto";
  for (let n = 0; n < 50; n++) {
    const candidate = n === 0 ? base : `${base}-${n + 1}`;
    let query = supabase.from("photos").select("id").eq("slug", candidate);
    if (ignoreId) query = query.neq("id", ignoreId);
    const { data } = await query.maybeSingle();
    if (!data) return candidate;
  }
  return `${base}-${Date.now()}`;
}

export async function savePhoto(input: PhotoInput): Promise<Result> {
  const problem = validate(input);
  if (problem) return { ok: false, error: problem };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Necesitas iniciar sesión." };

  const row = {
    title: input.title.trim(),
    description: input.description.trim(),
    lat: input.lat,
    lng: input.lng,
    year_from: input.yearFrom,
    year_to: input.yearTo,
    date_label: input.dateLabel.trim() || defaultDateLabel(input),
    image_path: input.imagePath,
    width: input.width ?? null,
    height: input.height ?? null,
    featured: input.featured,
  };

  if (input.id) {
    // Si la imagen cambia, la anterior se queda huérfana en Storage
    const { data: previous } = await supabase
      .from("photos")
      .select("image_path")
      .eq("id", input.id)
      .maybeSingle();

    const { data, error } = await supabase
      .from("photos")
      .update({ ...row, ...(input.status ? { status: input.status } : {}) })
      .eq("id", input.id)
      .select("slug")
      .maybeSingle();

    if (error) return { ok: false, error: error.message };
    if (!data) return { ok: false, error: "No tienes permiso para editarla." };

    if (previous?.image_path && previous.image_path !== input.imagePath) {
      await supabase.storage.from(PHOTO_BUCKET).remove([previous.image_path]);
    }

    revalidatePath("/", "layout");
    return { ok: true, slug: data.slug };
  }

  // El trigger de la base de datos fuerza `pending` si quien inserta no es
  // staff, así que aquí basta con pedir lo que se quiere.
  const slug = await uniqueSlug(supabase, row.title);
  const { data, error } = await supabase
    .from("photos")
    .insert({
      ...row,
      slug,
      author_id: user.id,
      status: input.status ?? "pending",
    })
    .select("slug")
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  revalidatePath("/", "layout");
  return { ok: true, slug: data?.slug };
}

/**
 * Aprobar, rechazar o retirar una foto. Staff puede moverla a cualquier
 * estado; el propio autor solo puede dejarla en 'rejected' (retirar su
 * envío), nunca publicarla ni tocar la de otra persona: lo decide la RLS
 * y el trigger `guard_photo`, esta función solo pide el cambio.
 *
 * No hay borrado: desactivar (rejected) es la única forma de quitar algo
 * de en medio, tanto para staff como para el autor.
 */
export async function setPhotoStatus(
  id: string,
  status: PhotoStatus,
  note?: string
): Promise<Result> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("photos")
    .update({ status, review_note: note?.trim() || null })
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "No tienes permiso para moderarla." };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function saveSiteContent(input: SiteContent): Promise<Result> {
  if (!input.title.trim()) return { ok: false, error: "Falta el título." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("site_content")
    .update({
      title: input.title.trim(),
      subtitle: input.subtitle.trim(),
      meta_title: input.metaTitle.trim(),
      meta_description: input.metaDescription.trim(),
      login_title: input.loginTitle.trim(),
      login_intro: input.loginIntro.trim(),
      submit_title: input.submitTitle.trim(),
      submit_intro: input.submitIntro.trim(),
    })
    .eq("id", true)
    .select("id")
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "Solo un administrador puede cambiar los textos." };
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Cambiar el rol de otra persona. La RLS y un trigger lo limitan a admins. */
export async function setRole(userId: string, role: Role): Promise<Result> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .update({ role })
    .eq("id", userId)
    .select("id")
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "No se pudo cambiar el rol." };
  revalidatePath("/", "layout");
  return { ok: true };
}
