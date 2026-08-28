import "server-only";
import { createClient } from "@/lib/supabase/server";
import { COMMENT_SELECT, avatarUrl, toComment, toPhoto } from "@/lib/photos";
import { toHistoricalMap } from "@/lib/historical-maps";
import { STORY_COMMENT_SELECT, toStory, toStoryComment } from "@/lib/stories";
import type {
  Comment,
  HistoricalMap,
  Photo,
  PhotoStatus,
  Profile,
  Role,
  SiteContent,
  Story,
  StoryComment,
  Viewer,
} from "@/lib/types";

/** Columnas de `photos` + conteos incrustados + nombre del autor. */
const PHOTO_SELECT =
  "*, likes(count), comments(count), author:profiles!photos_author_id_fkey(display_name)";

/** Columnas de `stories` + conteos incrustados + nombre del autor. */
const STORY_SELECT =
  "*, likes:story_likes(count), comments:story_comments(count), author:profiles!stories_author_id_fkey(display_name)";

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


/** Las historias publicadas, para el listado público. */
export async function getPublishedStories(): Promise<Story[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("stories")
    .select(STORY_SELECT)
    .eq("status", "published")
    .order("published_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map(toStory);
}

/** Una historia publicada por su slug, para la ficha. RLS ya filtra el resto. */
export async function getStoryBySlug(slug: string): Promise<Story | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("stories")
    .select(STORY_SELECT)
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw error;
  return data ? toStory(data) : null;
}

/** Las historias que puede ver el panel: staff todas, autor las suyas. */
export async function getManagedStories(status?: PhotoStatus): Promise<Story[]> {
  const supabase = await createClient();
  let query = supabase
    .from("stories")
    .select(STORY_SELECT)
    .order("created_at", { ascending: false });
  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(toStory);
}

/** Las historias que ha enviado quien mira, sea cual sea su estado. */
export async function getMyStories(userId: string): Promise<Story[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("stories")
    .select(STORY_SELECT)
    .eq("author_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map(toStory);
}

/** Los comentarios de historias que puede ver el panel: staff todos, para moderar. */
export async function getManagedStoryComments(status?: PhotoStatus): Promise<StoryComment[]> {
  const supabase = await createClient();
  let query = supabase
    .from("story_comments")
    .select(STORY_COMMENT_SELECT)
    .order("created_at", { ascending: false });
  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(toStoryComment);
}

/** Ids de las historias a las que el visitante ya ha dado me gusta. */
export async function getMyStoryLikes(): Promise<string[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("story_likes")
    .select("story_id")
    .eq("user_id", user.id);
  return (data ?? []).map((r) => r.story_id as string);
}

/** Los mapas históricos publicados, para superponerlos en el mapa público. */
export async function getPublishedHistoricalMaps(): Promise<HistoricalMap[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("historical_maps")
    .select("*")
    .eq("published", true)
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return (data ?? []).map(toHistoricalMap);
}

/** Todos los mapas históricos que puede ver el panel: staff los ve todos. */
export async function getManagedHistoricalMaps(): Promise<HistoricalMap[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("historical_maps")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return (data ?? []).map(toHistoricalMap);
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
