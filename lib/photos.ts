import photosData from "@/content/photos.json";

export type Photo = {
  id: string;
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
  image: string;
  /** Hito relevante: se marca en el mapa con un punto marrón más grande. */
  featured?: boolean;
};

export const TIMELINE_MIN = 1800;
export const TIMELINE_MAX = new Date().getFullYear();

export const photos: Photo[] = photosData;
