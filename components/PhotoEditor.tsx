"use client";

import { useEffect, useRef, useState } from "react";
import { X, Maximize2 } from "lucide-react";
import maplibregl from "maplibre-gl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ACCEPTED_IMAGE_EXT, defaultDateLabel, imageUrl } from "@/lib/photos";
import { uploadPhotoImage } from "@/lib/upload";
import type { Photo, PhotoStatus } from "@/lib/types";

const PIEDRAHITA: [number, number] = [-5.3238, 40.4619];

const MAP_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    carto: {
      type: "raster",
      // Mismas teselas que el mapa público (ver MapView) para colocar el punto
      // sobre el mismo dibujo de calles que verá el visitante.
      tiles: [
        "https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png",
      ],
      tileSize: 256,
      attribution: "© OpenStreetMap © CARTO",
    },
  },
  layers: [{ id: "carto", type: "raster", source: "carto" }],
};

/** Lo que se edita en el formulario, antes de mandarlo al servidor. */
export type Draft = {
  id?: string;
  title: string;
  description: string;
  lat: number;
  lng: number;
  yearFrom: number;
  yearTo: number;
  dateLabel: string;
  imagePath: string;
  featured: boolean;
  status: PhotoStatus;
};

export const emptyDraft = (): Draft => ({
  title: "",
  description: "",
  lat: NaN,
  lng: NaN,
  yearFrom: 1900,
  yearTo: 1900,
  dateLabel: "",
  imagePath: "",
  featured: false,
  status: "pending",
});

export const toDraft = (p: Photo): Draft => ({
  id: p.id,
  title: p.title,
  description: p.description,
  lat: p.lat,
  lng: p.lng,
  yearFrom: p.yearFrom,
  yearTo: p.yearTo,
  dateLabel: p.dateLabel,
  imagePath: p.imagePath,
  featured: p.featured,
  status: p.status,
});

/** Mini-mapa para elegir la posición de la foto con un clic. */
export function LocationPicker({
  lat,
  lng,
  onPick,
}: {
  lat: number;
  lng: number;
  onPick: (lat: number, lng: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;
  const [full, setFull] = useState(false);

  useEffect(() => {
    if (!ref.current) return;
    const hasPos = Number.isFinite(lat) && Number.isFinite(lng);
    const center: [number, number] = hasPos ? [lng, lat] : PIEDRAHITA;

    const map = new maplibregl.Map({
      container: ref.current,
      style: MAP_STYLE,
      center,
      zoom: 15,
      attributionControl: { compact: true },
    });
    mapRef.current = map;
    // La rueda debe desplazar el panel, no hacer zoom: el zoom va por botones.
    // A pantalla completa sí se activa (no hay nada que desplazar detrás).
    map.scrollZoom.disable();
    map.addControl(
      new maplibregl.NavigationControl({ showCompass: false }),
      "top-right"
    );

    const marker = new maplibregl.Marker({ color: "#111" })
      .setLngLat(center)
      .addTo(map);
    markerRef.current = marker;

    map.on("click", (e) => {
      marker.setLngLat(e.lngLat);
      onPickRef.current(
        Number(e.lngLat.lat.toFixed(5)),
        Number(e.lngLat.lng.toFixed(5))
      );
    });

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // El componente se remonta al cambiar de foto (key en PhotoFields), así que
    // basta con crear el mapa una vez; las coordenadas escritas a mano se
    // reflejan en el efecto de abajo sin recrearlo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (markerRef.current && Number.isFinite(lat) && Number.isFinite(lng)) {
      markerRef.current.setLngLat([lng, lat]);
    }
  }, [lat, lng]);

  // El contenedor cambia de tamaño al abrir/cerrar la pantalla completa, así que
  // hay que avisar al mapa; de paso la rueda hace zoom solo en modo grande.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.resize();
    if (full) map.scrollZoom.enable();
    else map.scrollZoom.disable();

    if (!full) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFull(false);
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [full]);

  return (
    <div className={`admin-map-wrap${full ? " fullscreen" : ""}`}>
      <div className="admin-map" ref={ref} />
      {full ? (
        <Button
          type="button"
          variant="ghost"
          className="map-close-btn"
          onClick={() => setFull(false)}
          title="Cerrar pantalla completa (Esc)"
          aria-label="Cerrar pantalla completa"
        >
          <X aria-hidden size={22} strokeWidth={1.8} />
        </Button>
      ) : (
        <Button
          type="button"
          variant="ghost"
          className="map-full-btn"
          onClick={() => setFull(true)}
          title="Pantalla completa"
        >
          Ampliar <Maximize2 aria-hidden size={13} strokeWidth={1.8} />
        </Button>
      )}
    </div>
  );
}

/**
 * Los campos de una fotografía. La imagen se sube a Storage nada más elegirla,
 * de forma que al guardar solo viaja la ruta.
 */
export default function PhotoFields({
  draft,
  onChange,
  canFeature,
}: {
  draft: Draft;
  onChange: (d: Draft) => void;
  /** Marcar hitos es cosa de quien publica, no de quien envía. */
  canFeature: boolean;
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    onChange({ ...draft, [key]: value });

  const upload = async (file: File) => {
    setUploading(true);
    setUploadError(null);
    // Vista previa local mientras sube: la foto puede pesar varios MB
    const local = URL.createObjectURL(file);
    setPreview(local);

    const res = await uploadPhotoImage(file);
    setUploading(false);
    if ("error" in res) {
      setUploadError(res.error);
      setPreview(null);
      URL.revokeObjectURL(local);
      return;
    }
    onChange({ ...draft, imagePath: res.path });
    setPreview(null);
    URL.revokeObjectURL(local);
  };

  const shown = preview ?? (draft.imagePath ? imageUrl(draft.imagePath) : "");

  return (
    <div className="photo-form-cols">
      <div className="photo-form-fields">
        <label>
          Título
          <Input
            type="text"
            value={draft.title}
            onChange={(e) => set("title", e.target.value)}
          />
        </label>

        <label>
          Descripción
          <Textarea
            rows={7}
            value={draft.description}
            onChange={(e) => set("description", e.target.value)}
          />
        </label>

        <div className="field-row">
          <label>
            Año desde
            <Input
              type="number"
              value={draft.yearFrom || ""}
              onChange={(e) => {
                const y = Number(e.target.value);
                onChange({
                  ...draft,
                  yearFrom: y,
                  yearTo: draft.yearTo < y ? y : draft.yearTo,
                });
              }}
            />
          </label>
          <label>
            Año hasta
            <Input
              type="number"
              value={draft.yearTo || ""}
              onChange={(e) => set("yearTo", Number(e.target.value))}
            />
          </label>
        </div>

        <label>
          Fecha mostrada
          <Input
            type="text"
            value={draft.dateLabel}
            placeholder={defaultDateLabel(draft)}
            onChange={(e) => set("dateLabel", e.target.value)}
          />
          <span className="hint">
            Ej.: «14 de agosto de 1932» o «c. 1890–1910». Si se deja vacía se usa
            el rango de años.
          </span>
        </label>

        {canFeature && (
          <label className="check-field">
            <Checkbox
              checked={draft.featured}
              onCheckedChange={(checked) => set("featured", checked === true)}
              className="data-checked:bg-[#5c3317] data-checked:border-[#5c3317]"
            />
            <span>Hito relevante</span>
            <span className="hint">
              Se marca en el mapa con un punto marrón más grande.
            </span>
          </label>
        )}

        <div className="field-row">
          <label>
            Latitud
            <Input
              type="number"
              step="0.00001"
              value={Number.isFinite(draft.lat) ? draft.lat : ""}
              onChange={(e) => set("lat", Number(e.target.value))}
            />
          </label>
          <label>
            Longitud
            <Input
              type="number"
              step="0.00001"
              value={Number.isFinite(draft.lng) ? draft.lng : ""}
              onChange={(e) => set("lng", Number(e.target.value))}
            />
          </label>
        </div>
      </div>

      <div className="photo-form-side">
        <div className="image-box">
          {shown ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={shown} alt={draft.title} />
          ) : (
            <span className="image-placeholder">Sin imagen</span>
          )}
        </div>
        <label className="upload-btn">
          {uploading ? "Subiendo…" : draft.imagePath ? "Cambiar imagen" : "Subir imagen"}
          <Input
            type="file"
            accept={ACCEPTED_IMAGE_EXT}
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) upload(f);
              e.target.value = "";
            }}
          />
        </label>
        {uploadError && <p className="admin-error">{uploadError}</p>}

        <LocationPicker
          lat={draft.lat}
          lng={draft.lng}
          onPick={(lat, lng) => onChange({ ...draft, lat, lng })}
        />
        <span className="hint">Haz clic en el mapa para colocar la foto.</span>
      </div>
    </div>
  );
}
