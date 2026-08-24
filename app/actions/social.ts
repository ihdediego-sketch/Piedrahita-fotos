"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { COMMENT_SELECT, toComment } from "@/lib/photos";
import type { Comment, PhotoStatus } from "@/lib/types";

export type LikeResult =
  | { ok: true; liked: boolean; likes: number }
  | { ok: false; error: string };

/** Alterna el me gusta del visitante sobre una foto y devuelve el total. */
export async function toggleLike(photoId: string): Promise<LikeResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Entra para dar me gusta." };

  const { data: existing } = await supabase
    .from("likes")
    .select("photo_id")
    .eq("photo_id", photoId)
    .eq("user_id", user.id)
    .maybeSingle();

  const { error } = existing
    ? await supabase
        .from("likes")
        .delete()
        .eq("photo_id", photoId)
        .eq("user_id", user.id)
    : await supabase.from("likes").insert({ photo_id: photoId, user_id: user.id });

  if (error) return { ok: false, error: error.message };

  const { count } = await supabase
    .from("likes")
    .select("photo_id", { count: "exact", head: true })
    .eq("photo_id", photoId);

  revalidatePath("/", "layout");
  return { ok: true, liked: !existing, likes: count ?? 0 };
}

export type CommentResult =
  | { ok: true; comment: Comment }
  | { ok: false; error: string };

/** Igual que las fotos: un colaborador o admin publica al momento, el resto
 * envía a revisión (lo fuerza también el trigger `guard_comment`, esto es
 * solo para pedir lo que se quiere). */
export async function addComment(
  photoId: string,
  body: string
): Promise<CommentResult> {
  const text = body.trim();
  if (!text) return { ok: false, error: "Escribe algo antes de enviar." };
  if (text.length > 2000)
    return { ok: false, error: "El comentario es demasiado largo." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Entra para comentar." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  const canPublish = profile?.role === "admin" || profile?.role === "colaborador";

  const { data, error } = await supabase
    .from("comments")
    .insert({
      photo_id: photoId,
      user_id: user.id,
      body: text,
      status: canPublish ? "published" : "pending",
    })
    .select(COMMENT_SELECT)
    .single();

  if (error) return { ok: false, error: error.message };

  revalidatePath("/", "layout");
  return { ok: true, comment: toComment(data) };
}

/** Los comentarios de una foto, para cargarlos al abrir el modal. La RLS ya
 * limita lo que vuelve: publicados para cualquiera, más los propios. */
export async function listComments(photoId: string): Promise<Comment[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("comments")
    .select(COMMENT_SELECT)
    .eq("photo_id", photoId)
    .order("created_at", { ascending: true });

  return (data ?? []).map(toComment);
}

/**
 * Aprobar, rechazar o retirar un comentario. Staff puede moverlo a
 * cualquier estado; el propio autor solo puede dejarlo en 'rejected'
 * (retirar lo suyo). No hay borrado: esto es lo único que existe para
 * quitar un comentario de en medio.
 */
export async function setCommentStatus(
  id: string,
  status: PhotoStatus,
  note?: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("comments")
    .update({ status, review_note: note?.trim() || null })
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "No tienes permiso para moderarlo." };
  revalidatePath("/", "layout");
  return { ok: true };
}
