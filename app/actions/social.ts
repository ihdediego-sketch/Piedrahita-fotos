"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Comment } from "@/lib/types";

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

  const { data, error } = await supabase
    .from("comments")
    .insert({ photo_id: photoId, user_id: user.id, body: text })
    .select("id, photo_id, user_id, body, created_at, author:profiles(display_name)")
    .single();

  if (error) return { ok: false, error: error.message };

  revalidatePath("/", "layout");
  return {
    ok: true,
    comment: {
      id: data.id,
      photoId: data.photo_id,
      userId: data.user_id,
      authorName:
        (data.author as unknown as { display_name: string } | null)?.display_name ?? "",
      body: data.body,
      createdAt: data.created_at,
    },
  };
}

/** Borra un comentario propio; staff puede borrar cualquiera (lo decide la RLS). */
export async function deleteComment(
  id: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("comments")
    .delete()
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "No tienes permiso para borrarlo." };
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Los comentarios de una foto, para cargarlos al abrir el modal. */
export async function listComments(photoId: string): Promise<Comment[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("comments")
    .select("id, photo_id, user_id, body, created_at, author:profiles(display_name)")
    .eq("photo_id", photoId)
    .order("created_at", { ascending: true });

  return (data ?? []).map((c) => ({
    id: c.id,
    photoId: c.photo_id,
    userId: c.user_id,
    authorName:
      (c.author as unknown as { display_name: string } | null)?.display_name || "Anónimo",
    body: c.body,
    createdAt: c.created_at,
  }));
}
