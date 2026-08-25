import type maplibregl from "maplibre-gl";
import { publicUrl } from "./photos";
import type { HistoricalMap, HistoricalMapRow } from "./types";

/**
 * maplibregl.ImageSource exige el array de 4 esquinas como tupla de longitud
 * fija; en la app se maneja como `[number, number][]` (más simple de mover
 * al arrastrar una sola esquina), así que aquí se afirma la forma una vez.
 */
export function toCornerTuple(
  corners: [number, number][]
): maplibregl.ImageSourceSpecification["coordinates"] {
  return corners as unknown as maplibregl.ImageSourceSpecification["coordinates"];
}

export const HISTORICAL_MAP_BUCKET = "historical-maps";

export const ACCEPTED_HISTORICAL_MAP_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

export const ACCEPTED_HISTORICAL_MAP_EXT = ".jpg,.jpeg,.png,.webp";

/** URL pública de un mapa histórico en Storage. */
export const historicalMapImageUrl = (path: string) =>
  publicUrl(HISTORICAL_MAP_BUCKET, path);

/** Fila de la base de datos → objeto de la interfaz. */
export function toHistoricalMap(row: HistoricalMapRow): HistoricalMap {
  return {
    id: row.id,
    title: row.title,
    dateLabel: row.date_label,
    image: historicalMapImageUrl(row.image_path),
    imagePath: row.image_path,
    corners: (row.corners as [number, number][]) ?? [],
    defaultOpacity: row.default_opacity,
    published: row.published,
    sortOrder: row.sort_order,
    authorId: row.author_id,
    createdAt: row.created_at,
  };
}

/**
 * Rectángulo por defecto centrado en `center`, para arrancar el editor con
 * algo ya colocado sobre el pueblo en vez de un mapa histórico invisible.
 */
export function defaultCorners(
  center: [number, number]
): [number, number][] {
  const [lng, lat] = center;
  const dLng = 0.01;
  const dLat = 0.007;
  return [
    [lng - dLng, lat + dLat], // top-left
    [lng + dLng, lat + dLat], // top-right
    [lng + dLng, lat - dLat], // bottom-right
    [lng - dLng, lat - dLat], // bottom-left
  ];
}

/** Área con signo (fórmula del shoelace): negativa si el orden está invertido. */
function signedArea(corners: [number, number][]): number {
  let sum = 0;
  for (let i = 0; i < corners.length; i++) {
    const [x1, y1] = corners[i];
    const [x2, y2] = corners[(i + 1) % corners.length];
    sum += x1 * y2 - x2 * y1;
  }
  return sum / 2;
}

/**
 * Las 4 esquinas deben ir en sentido horario (top-left → top-right →
 * bottom-right → bottom-left) para que `ImageSource` no dibuje la imagen
 * espejada o girada. En coordenadas lng/lat (lat crece hacia arriba) ese
 * sentido da área con signo negativa.
 */
export function hasValidWinding(corners: [number, number][]): boolean {
  if (corners.length !== 4) return false;
  if (corners.some(([lng, lat]) => !Number.isFinite(lng) || !Number.isFinite(lat)))
    return false;
  return signedArea(corners) < 0;
}
