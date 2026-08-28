"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { PHOTO_BUCKET } from "@/lib/photos";
import { slugify } from "@/lib/stories";
import type { PhotoStatus } from "@/lib/types";

export type Result = { ok: true; slug?: string } | { ok: false; error: string };

export type StoryInput = {
  /** Vacío al crear. */
  id?: string;
  title: string;
  excerpt: string;
  contentMd: string;
  coverImagePath: string;
  seoTitle: string;
  seoDescription: string;
  /** Solo lo respeta el servidor si quien guarda es staff. */
  status?: PhotoStatus;
};

function validate(input: StoryInput): string | null {
  if (!input.title.trim()) return "Falta el título.";
  return null;
}

/** Un slug libre a partir del título, con sufijo numérico si ya existe. */
async function uniqueSlug(
  supabase: Awaited<ReturnType<typeof createClient>>,
  title: string,
  ignoreId?: string
): Promise<string> {
  const base = slugify(title) || "historia";
  for (let n = 0; n < 50; n++) {
    const candidate = n === 0 ? base : `${base}-${n + 1}`;
    let query = supabase.from("stories").select("id").eq("slug", candidate);
    if (ignoreId) query = query.neq("id", ignoreId);
    const { data } = await query.maybeSingle();
    if (!data) return candidate;
  }
  return `${base}-${Date.now()}`;
}

export async function saveStory(input: StoryInput): Promise<Result> {
  const problem = validate(input);
  if (problem) return { ok: false, error: problem };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Necesitas iniciar sesión." };

  const row = {
    title: input.title.trim(),
    excerpt: input.excerpt.trim(),
    content_md: input.contentMd,
    cover_image_path: input.coverImagePath,
    seo_title: input.seoTitle.trim(),
    seo_description: input.seoDescription.trim(),
  };

  if (input.id) {
    // Si la portada cambia, la anterior se queda huérfana en Storage
    const { data: previous } = await supabase
      .from("stories")
      .select("cover_image_path")
      .eq("id", input.id)
      .maybeSingle();

    const { data, error } = await supabase
      .from("stories")
      .update({ ...row, ...(input.status ? { status: input.status } : {}) })
      .eq("id", input.id)
      .select("slug")
      .maybeSingle();

    if (error) return { ok: false, error: error.message };
    if (!data) return { ok: false, error: "No tienes permiso para editarla." };

    if (
      previous?.cover_image_path &&
      previous.cover_image_path !== input.coverImagePath
    ) {
      await supabase.storage.from(PHOTO_BUCKET).remove([previous.cover_image_path]);
    }

    revalidatePath("/", "layout");
    return { ok: true, slug: data.slug };
  }

  // El trigger de la base de datos fuerza `pending` si quien inserta no es
  // staff, así que aquí basta con pedir lo que se quiere.
  const slug = await uniqueSlug(supabase, row.title);
  const { data, error } = await supabase
    .from("stories")
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
 * Aprobar, rechazar o retirar una historia. Staff puede moverla a cualquier
 * estado; el propio autor solo puede dejarla en 'rejected' (retirar su
 * envío). Lo decide la RLS y el trigger `guard_story`, esta función solo
 * pide el cambio.
 */
export async function setStoryStatus(
  id: string,
  status: PhotoStatus,
  note?: string
): Promise<Result> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("stories")
    .update({ status, review_note: note?.trim() || null })
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "No tienes permiso para moderarla." };
  revalidatePath("/", "layout");
  return { ok: true };
}
