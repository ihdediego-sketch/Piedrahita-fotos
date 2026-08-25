"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { HISTORICAL_MAP_BUCKET } from "@/lib/historical-maps";

export type Result = { ok: true } | { ok: false; error: string };

export type HistoricalMapInput = {
  /** Vacío al crear. */
  id?: string;
  title: string;
  dateLabel: string;
  imagePath: string;
  corners: [number, number][];
  defaultOpacity: number;
};

function validate(input: HistoricalMapInput): string | null {
  if (!input.title.trim()) return "Falta el título.";
  if (!input.imagePath) return "Falta la imagen.";
  if (input.corners.length !== 4) return "Faltan esquinas por colocar.";
  if (input.corners.some(([lng, lat]) => !Number.isFinite(lng) || !Number.isFinite(lat)))
    return "Hay esquinas sin colocar.";
  if (
    input.corners.some(
      ([lng, lat]) => lat < -90 || lat > 90 || lng < -180 || lng > 180
    )
  )
    return "Alguna esquina está fuera de rango.";
  if (!Number.isFinite(input.defaultOpacity) || input.defaultOpacity < 0 || input.defaultOpacity > 1)
    return "La opacidad debe estar entre 0 y 1.";
  return null;
}

export async function saveHistoricalMap(
  input: HistoricalMapInput
): Promise<Result> {
  const problem = validate(input);
  if (problem) return { ok: false, error: problem };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Necesitas iniciar sesión." };

  const row = {
    title: input.title.trim(),
    date_label: input.dateLabel.trim(),
    image_path: input.imagePath,
    corners: input.corners,
    default_opacity: input.defaultOpacity,
  };

  if (input.id) {
    // Si la imagen cambia, la anterior se queda huérfana en Storage
    const { data: previous } = await supabase
      .from("historical_maps")
      .select("image_path")
      .eq("id", input.id)
      .maybeSingle();

    const { data, error } = await supabase
      .from("historical_maps")
      .update(row)
      .eq("id", input.id)
      .select("id")
      .maybeSingle();

    if (error) return { ok: false, error: error.message };
    if (!data) return { ok: false, error: "No tienes permiso para editarlo." };

    if (previous?.image_path && previous.image_path !== input.imagePath) {
      await supabase.storage
        .from(HISTORICAL_MAP_BUCKET)
        .remove([previous.image_path]);
    }

    revalidatePath("/", "layout");
    return { ok: true };
  }

  const { error } = await supabase
    .from("historical_maps")
    .insert({ ...row, author_id: user.id });

  if (error) return { ok: false, error: error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function setHistoricalMapPublished(
  id: string,
  published: boolean
): Promise<Result> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("historical_maps")
    .update({ published })
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "No tienes permiso para publicarlo." };
  revalidatePath("/", "layout");
  return { ok: true };
}

/**
 * Borrado real: a diferencia de las fotos, aquí no hay envíos de terceros
 * que preservar, así que quitar un mapa histórico lo elimina de verdad.
 */
export async function deleteHistoricalMap(id: string): Promise<Result> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("historical_maps")
    .delete()
    .eq("id", id)
    .select("image_path")
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "No tienes permiso para borrarlo." };

  if (data.image_path) {
    await supabase.storage.from(HISTORICAL_MAP_BUCKET).remove([data.image_path]);
  }

  revalidatePath("/", "layout");
  return { ok: true };
}
