"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type AuthState = { error?: string; sent?: string };

/** Envía el enlace de acceso. No hay contraseñas en todo el sitio. */
export async function sendMagicLink(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const displayName = String(formData.get("display_name") ?? "").trim();
  const rawNext = String(formData.get("next") ?? "/");
  const next =
    rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/";

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Escribe un correo válido." };
  }

  // El origen real de la petición: así funciona igual en local y desplegado
  const origin =
    process.env.SITE_URL ??
    (await headers()).get("origin") ??
    "http://localhost:3000";

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${origin}/auth/confirm?next=${encodeURIComponent(next)}`,
      // El nombre solo se usa si es un alta nueva; el trigger lo copia al perfil
      data: displayName ? { display_name: displayName } : undefined,
    },
  });

  if (error) return { error: error.message };
  return { sent: email };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}

