import { createClient } from "@/lib/supabase/client";
import { ACCEPTED_IMAGE_TYPES, AVATAR_BUCKET, PHOTO_BUCKET } from "@/lib/photos";

const MAX_PHOTO_BYTES = 20 * 1024 * 1024;
const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

export const ACCEPTED_AVATAR_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
];

export const ACCEPTED_AVATAR_EXT = ".jpg,.jpeg,.png,.webp,.avif";

type UploadResult = { path: string } | { error: string };

/**
 * Sube una imagen a Storage desde el navegador y devuelve su ruta.
 *
 * Va directa al bucket y no por una Server Action a propósito: el límite de
 * cuerpo de las acciones es de 1 MB y estas imágenes pesan mucho más. La ruta
 * cuelga de la carpeta del usuario, que es lo que exigen las políticas de
 * Storage de ambos buckets.
 */
async function uploadImage(
  file: File,
  bucket: string,
  accepted: string[],
  maxBytes: number
): Promise<UploadResult> {
  if (!accepted.includes(file.type))
    return { error: `Formato no admitido: ${file.type || "desconocido"}` };
  if (file.size > maxBytes)
    return {
      error: `La imagen supera los ${Math.round(maxBytes / (1024 * 1024))} MB.`,
    };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Tu sesión ha caducado. Vuelve a entrar." };

  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${user.id}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { contentType: file.type, upsert: false });

  if (error) return { error: error.message };
  return { path };
}

export const uploadPhotoImage = (file: File) =>
  uploadImage(file, PHOTO_BUCKET, ACCEPTED_IMAGE_TYPES, MAX_PHOTO_BYTES);

export const uploadAvatarImage = (file: File) =>
  uploadImage(file, AVATAR_BUCKET, ACCEPTED_AVATAR_TYPES, MAX_AVATAR_BYTES);
