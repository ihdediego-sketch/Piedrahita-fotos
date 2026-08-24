export type Role = "admin" | "colaborador" | "usuario";
export type PhotoStatus = "pending" | "published" | "rejected";

export type Profile = {
  id: string;
  display_name: string;
  bio: string;
  /** Ruta dentro del bucket `avatars`, no una URL. */
  avatar_path: string;
  role: Role;
  created_at: string;
};

/** Fila tal cual vive en la tabla `photos`. */
export type PhotoRow = {
  id: string;
  slug: string;
  title: string;
  description: string;
  lat: number;
  lng: number;
  year_from: number;
  year_to: number;
  date_label: string;
  /** Ruta dentro del bucket `photos`, no una URL. */
  image_path: string;
  featured: boolean;
  status: PhotoStatus;
  author_id: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_note: string | null;
  created_at: string;
  updated_at: string;
};

/** Lo que consumen el mapa y el modal: la fila con la URL ya resuelta. */
export type Photo = {
  id: string;
  slug: string;
  title: string;
  description: string;
  lat: number;
  lng: number;
  /** Primer año del rango. Igual a yearTo si la fecha es exacta. */
  yearFrom: number;
  /** Último año del rango. */
  yearTo: number;
  /** Texto de fecha para mostrar: exacta ("12 de junio de 1955") o rango ("c. 1890–1910"). */
  dateLabel: string;
  /** URL pública de la imagen en Storage. */
  image: string;
  imagePath: string;
  /** Hito relevante: se marca en el mapa con un punto marrón más grande. */
  featured: boolean;
  status: PhotoStatus;
  authorId: string | null;
  authorName: string;
  reviewNote: string | null;
  createdAt: string;
  likes: number;
  comments: number;
};

/** Fila tal cual vive en la tabla `comments`. */
export type CommentRow = {
  id: string;
  photo_id: string;
  user_id: string;
  body: string;
  status: PhotoStatus;
  review_note: string | null;
  created_at: string;
};

export type Comment = {
  id: string;
  photoId: string;
  photoTitle: string;
  photoSlug: string;
  userId: string;
  authorName: string;
  body: string;
  status: PhotoStatus;
  reviewNote: string | null;
  createdAt: string;
};

export type SiteContent = {
  title: string;
  subtitle: string;
  metaTitle: string;
  metaDescription: string;
  loginTitle: string;
  loginIntro: string;
  submitTitle: string;
  submitIntro: string;
};

export type SiteTextField = {
  key: keyof SiteContent;
  label: string;
  /** Texto largo: se edita en un área en vez de en una línea. */
  long?: boolean;
};

/** Los textos del panel, agrupados por la pantalla en la que se leen. */
export const SITE_TEXT_GROUPS: {
  title: string;
  note: string;
  fields: SiteTextField[];
}[] = [
  {
    title: "Cabecera del mapa",
    note: "Lo primero que se ve al entrar, sobre el mapa.",
    fields: [
      { key: "title", label: "Título" },
      { key: "subtitle", label: "Subtítulo" },
    ],
  },
  {
    title: "Pestaña del navegador y buscadores",
    note: "No se ve en la página: es lo que muestran Google y la pestaña.",
    fields: [
      { key: "metaTitle", label: "Título (SEO)" },
      { key: "metaDescription", label: "Descripción (SEO)", long: true },
    ],
  },
  {
    title: "Pantalla de acceso",
    note: "La página de entrar, la primera que lee quien aún no tiene cuenta.",
    fields: [
      { key: "loginTitle", label: "Titular" },
      { key: "loginIntro", label: "Explicación", long: true },
    ],
  },
  {
    title: "Enviar una fotografía",
    note: "La página desde la que cualquiera aporta una foto al archivo.",
    fields: [
      { key: "submitTitle", label: "Titular" },
      {
        key: "submitIntro",
        label: "Aviso de revisión (solo lo ven quienes no publican)",
        long: true,
      },
    ],
  },
];

/** Quién está mirando: se pasa a los componentes cliente para decidir qué ofrecer. */
export type Viewer = {
  id: string;
  displayName: string;
  bio: string;
  /** Ruta dentro del bucket `avatars`. Vacía si no ha puesto foto. */
  avatarPath: string;
  /** URL pública del avatar, ya resuelta. Vacía si no hay. */
  avatar: string;
  role: Role;
} | null;

/** Tope del texto «sobre mí», igual que el check de la base de datos. */
export const BIO_MAX = 600;

export const isStaff = (viewer: Viewer) =>
  viewer?.role === "admin" || viewer?.role === "colaborador";

export const isAdmin = (viewer: Viewer) => viewer?.role === "admin";

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Administrador",
  colaborador: "Colaborador",
  usuario: "Usuario registrado",
};

export const ROLE_LABELS_PLURAL: Record<Role, string> = {
  admin: "Admins",
  colaborador: "Colaboradores",
  usuario: "Usuarios",
};

export const STATUS_LABELS: Record<PhotoStatus, string> = {
  pending: "Pendiente",
  published: "Publicada",
  rejected: "Descartada",
};

export const STATUS_LABELS_PLURAL: Record<PhotoStatus, string> = {
  pending: "Pendientes",
  published: "Publicadas",
  rejected: "Descartadas",
};
