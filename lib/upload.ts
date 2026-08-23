import { createClient } from "@/lib/supabase/client";
import { ACCEPTED_IMAGE_TYPES, PHOTO_BUCKET } from "@/lib/photos";

const MAX_BYTES = 20 * 1024 * 1024;

/**
 * Sube la imagen a Storage desde el navegador y devuelve su ruta.
 *
 * Va directa al bucket y no por una Server Action a propósito: el límite de
 * cuerpo de las acciones es de 1 MB y estas fotos pesan mucho más. La ruta
 * cuelga de la carpeta del usuario, que es lo que exige la política de Storage.
 */
export async function uploadPhotoImage(
  file: File
): Promise<{ path: string } | { error: string }> {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type))
    return { error: `Formato no admitido: ${file.type || "desconocido"}` };
  if (file.size > MAX_BYTES) return { error: "La imagen supera los 20 MB." };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Tu sesión ha caducado. Vuelve a entrar." };

  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${user.id}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from(PHOTO_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });

  if (error) return { error: error.message };
  return { path };
}
