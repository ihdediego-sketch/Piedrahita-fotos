import "server-only";
import { createClient } from "@/lib/supabase/server";
import { COMMENT_SELECT, avatarUrl, toComment, toPhoto } from "@/lib/photos";
import type {
  Comment,
  Photo,
  PhotoStatus,
  Profile,
  Role,
  SiteContent,
  Viewer,
} from "@/lib/types";

/** Columnas de `photos` + conteos incrustados + nombre del autor. */
const PHOTO_SELECT =
  "*, likes(count), comments(count), author:profiles!photos_author_id_fkey(display_name)";

const FALLBACK_SITE: SiteContent = {
  title: "Piedrahíta",
  subtitle: "Memoria de un pueblo",
  metaTitle: "Piedrahíta — Memoria visual",
  metaDescription:
    "Archivo fotográfico e histórico de Piedrahíta (Ávila), de 1800 a la actualidad, sobre un mapa interactivo.",
  loginTitle: "Entrar",
  loginIntro:
    "Pon tu correo y te mandamos un enlace para entrar. Si no tienes cuenta, se crea sola.",
  submitTitle: "Enviar una fotografía",
  submitIntro:
    "Tu fotografía no aparecerá en el mapa hasta que un colaborador la apruebe. Mientras esté pendiente puedes seguir editándola.",
};

/** Quién está mirando, con su rol. `null` si no ha iniciado sesión. */
export async function getViewer(): Promise<Viewer> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("id, display_name, bio, avatar_path, role")
    .eq("id", user.id)
    .single();

  // El perfil lo crea un trigger al registrarse; si aún no está, se trata como
  // usuario raso en vez de expulsarlo.
  return {
    id: user.id,
    displayName: data?.display_name || user.email?.split("@")[0] || "",
    bio: data?.bio ?? "",
    avatarPath: data?.avatar_path ?? "",
    avatar: avatarUrl(data?.avatar_path ?? ""),
    role: (data?.role as Role) ?? "usuario",
  };
}

export async function getSiteContent(): Promise<SiteContent> {
  const supabase = await createClient();
  // `*` y no la lista de columnas: así, si la migración de un texto nuevo aún
  // no se ha ejecutado, se cae al valor por defecto de ese campo en vez de
  // perder toda la fila.
  const { data } = await supabase.from("site_content").select("*").single();

  if (!data) return FALLBACK_SITE;
  return {
    title: data.title ?? FALLBACK_SITE.title,
    subtitle: data.subtitle ?? FALLBACK_SITE.subtitle,
    metaTitle: data.meta_title ?? FALLBACK_SITE.metaTitle,
    metaDescription: data.meta_description ?? FALLBACK_SITE.metaDescription,
    loginTitle: data.login_title ?? FALLBACK_SITE.loginTitle,
    loginIntro: data.login_intro ?? FALLBACK_SITE.loginIntro,
    submitTitle: data.submit_title ?? FALLBACK_SITE.submitTitle,
    submitIntro: data.submit_intro ?? FALLBACK_SITE.submitIntro,
  };
}

/** Las fotos del mapa público. La RLS ya filtra a `published` para anónimos. */
export async function getPublishedPhotos(): Promise<Photo[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("photos")
    .select(PHOTO_SELECT)
    .eq("status", "published")
    .order("year_from", { ascending: true });

  if (error) throw error;
  return (data ?? []).map(toPhoto);
}

/** Las fotos que puede ver quien está dentro: staff todas, autor las suyas. */
export async function getManagedPhotos(status?: PhotoStatus): Promise<Photo[]> {
  const supabase = await createClient();
  let query = supabase
    .from("photos")
    .select(PHOTO_SELECT)
    .order("created_at", { ascending: false });
  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(toPhoto);
}

/** Los comentarios que puede ver el panel: staff todos, para moderar. */
export async function getManagedComments(status?: PhotoStatus): Promise<Comment[]> {
  const supabase = await createClient();
  let query = supabase
    .from("comments")
    .select(COMMENT_SELECT)
    .order("created_at", { ascending: false });
  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(toComment);
}

/** Las fotos que ha enviado quien mira, sean cual sea su estado. */
export async function getMyPhotos(userId: string): Promise<Photo[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("photos")
    .select(PHOTO_SELECT)
    .eq("author_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map(toPhoto);
}

/** Los comentarios que ha escrito quien mira, sea cual sea su estado. */
export async function getMyComments(userId: string): Promise<Comment[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("comments")
    .select(COMMENT_SELECT)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map(toComment);
}

/** Ids de las fotos a las que el visitante ya ha dado me gusta. */
export async function getMyLikes(): Promise<string[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("likes")
    .select("photo_id")
    .eq("user_id", user.id);
  return (data ?? []).map((r) => r.photo_id as string);
}

/** Las fotos publicadas a las que quien mira ha dado me gusta. */
export async function getMyLikedPhotos(userId: string): Promise<Photo[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("likes")
    .select(`photo:photos!inner(${PHOTO_SELECT})`)
    .eq("user_id", userId)
    .eq("photo.status", "published")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? [])
    .map((r) => (Array.isArray(r.photo) ? r.photo[0] : r.photo))
    .filter(Boolean)
    .map(toPhoto);
}


/** Listado de personas para el panel. Solo tiene sentido para un admin. */
export async function getProfiles(): Promise<Profile[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, display_name, bio, avatar_path, role, created_at")
    .order("created_at", { ascending: true });
  return (data ?? []) as Profile[];
}
