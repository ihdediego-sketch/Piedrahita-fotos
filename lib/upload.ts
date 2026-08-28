import { createClient } from "@/lib/supabase/client";
import { ACCEPTED_IMAGE_TYPES, AVATAR_BUCKET, PHOTO_BUCKET } from "@/lib/photos";
import {
  ACCEPTED_HISTORICAL_MAP_TYPES,
  HISTORICAL_MAP_BUCKET,
} from "@/lib/historical-maps";

const MAX_PHOTO_BYTES = 20 * 1024 * 1024;
const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const MAX_HISTORICAL_MAP_BYTES = 40 * 1024 * 1024;

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

/**
 * Dimensiones en píxeles de una imagen local, leídas en el navegador antes de
 * guardar. Devuelve null si el navegador no sabe decodificar el formato: la
 * foto se guarda igualmente y el mosaico asume 4:3 hasta un backfill.
 */
export async function readImageDimensions(
  file: File
): Promise<{ width: number; height: number } | null> {
  try {
    const bitmap = await createImageBitmap(file);
    const size = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return size;
  } catch {
    // Fallback con <img> para formatos que createImageBitmap no soporta
    // en algunos navegadores (p. ej. AVIF en Safari antiguos).
    return new Promise((resolve) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.naturalWidth, height: img.naturalHeight });
        URL.revokeObjectURL(url);
      };
      img.onerror = () => {
        resolve(null);
        URL.revokeObjectURL(url);
      };
      img.src = url;
    });
  }
}

export const uploadPhotoImage = (file: File) =>
  uploadImage(file, PHOTO_BUCKET, ACCEPTED_IMAGE_TYPES, MAX_PHOTO_BYTES);

export const uploadAvatarImage = (file: File) =>
  uploadImage(file, AVATAR_BUCKET, ACCEPTED_AVATAR_TYPES, MAX_AVATAR_BYTES);

export const uploadHistoricalMapImage = (file: File) =>
  uploadImage(
    file,
    HISTORICAL_MAP_BUCKET,
    ACCEPTED_HISTORICAL_MAP_TYPES,
    MAX_HISTORICAL_MAP_BYTES
  );
