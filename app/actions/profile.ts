"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { AVATAR_BUCKET } from "@/lib/photos";
import { BIO_MAX } from "@/lib/types";

export type Result = { ok: true } | { ok: false; error: string };

export type ProfileInput = {
  displayName: string;
  bio: string;
  /** Ruta en el bucket `avatars`. Vacía para quedarse sin foto. */
  avatarPath: string;
};

/**
 * Guarda el perfil de quien está dentro. La RLS de `profiles` ya impide tocar
 * el de otra persona, y el trigger `profiles_guard_role` que el rol cambie
 * por aquí.
 */
export async function saveProfile(input: ProfileInput): Promise<Result> {
  const displayName = input.displayName.trim();
  const bio = input.bio.trim();

  if (displayName.length < 2)
    return { ok: false, error: "El nombre necesita al menos dos letras." };
  if (displayName.length > 60)
    return { ok: false, error: "El nombre no puede pasar de 60 caracteres." };
  if (bio.length > BIO_MAX)
    return { ok: false, error: `El texto no puede pasar de ${BIO_MAX} caracteres.` };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Necesitas iniciar sesión." };

  // Si el avatar cambia, el anterior se queda huérfano en Storage
  const { data: previous } = await supabase
    .from("profiles")
    .select("avatar_path")
    .eq("id", user.id)
    .maybeSingle();

  const { data, error } = await supabase
    .from("profiles")
    .update({
      display_name: displayName,
      bio,
      avatar_path: input.avatarPath,
    })
    .eq("id", user.id)
    .select("id")
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "No se pudo guardar el perfil." };

  if (previous?.avatar_path && previous.avatar_path !== input.avatarPath) {
    await supabase.storage.from(AVATAR_BUCKET).remove([previous.avatar_path]);
  }

  revalidatePath("/", "layout");
  return { ok: true };
}
