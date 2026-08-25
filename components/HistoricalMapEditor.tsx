"use client";

import { useEffect, useRef, useState } from "react";
import { Maximize2, X } from "lucide-react";
import maplibregl from "maplibre-gl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ACCEPTED_HISTORICAL_MAP_EXT,
  defaultCorners,
  hasValidWinding,
  historicalMapImageUrl,
  toCornerTuple,
} from "@/lib/historical-maps";
import { uploadHistoricalMapImage } from "@/lib/upload";
import type { HistoricalMap } from "@/lib/types";

const PIEDRAHITA: [number, number] = [-5.3238, 40.4619];

const MAP_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    carto: {
      type: "raster",
      tiles: [
        "https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png",
      ],
      tileSize: 256,
      attribution: "© OpenStreetMap © CARTO",
    },
  },
  layers: [{ id: "carto", type: "raster", source: "carto" }],
};

const PREVIEW_SOURCE = "historical-preview";
const PREVIEW_LAYER = "historical-preview-layer";

/** Una esquina por posición, para que el arrastre no invierta el orden por error. */
const CORNER_LABELS = ["Sup. izq.", "Sup. der.", "Inf. der.", "Inf. izq."] as const;
const CORNER_COLORS = ["#5c3317", "#8a5a2e", "#b5824f", "#d9ad7c"];

export type Draft = {
  id?: string;
  title: string;
  dateLabel: string;
  imagePath: string;
  corners: [number, number][];
  defaultOpacity: number;
  /** Solo de lectura aquí: publicar/despublicar va por su propia acción, no por guardar. */
  published: boolean;
};

export const emptyDraft = (): Draft => ({
  title: "",
  dateLabel: "",
  imagePath: "",
  corners: defaultCorners(PIEDRAHITA),
  defaultOpacity: 0.75,
  published: false,
});

export const toDraft = (m: HistoricalMap): Draft => ({
  id: m.id,
  title: m.title,
  dateLabel: m.dateLabel,
  imagePath: m.imagePath,
  corners: m.corners,
  defaultOpacity: m.defaultOpacity,
  published: m.published,
});

/**
 * Mapa con las 4 esquinas de la imagen arrastrables, cada una sincronizada
 * con la fuente `image` de vista previa: al soltar, se actualiza en vivo.
 */
function CornerPicker({
  imagePath,
  corners,
  opacity,
  onChange,
  onOpacityChange,
}: {
  imagePath: string;
  corners: [number, number][];
  opacity: number;
  onChange: (corners: [number, number][]) => void;
  onOpacityChange: (opacity: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const cornersRef = useRef(corners);
  cornersRef.current = corners;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const [full, setFull] = useState(false);

  // El mapa se crea una sola vez.
  useEffect(() => {
    if (!ref.current) return;
    const center = corners.length
      ? [
          corners.reduce((s, c) => s + c[0], 0) / corners.length,
          corners.reduce((s, c) => s + c[1], 0) / corners.length,
        ]
      : PIEDRAHITA;

    const map = new maplibregl.Map({
      container: ref.current,
      style: MAP_STYLE,
      center: center as [number, number],
      zoom: 15,
      attributionControl: { compact: true },
    });
    mapRef.current = map;
    map.scrollZoom.disable();
    map.addControl(
      new maplibregl.NavigationControl({ showCompass: false }),
      "top-right"
    );

    markersRef.current = cornersRef.current.map((lngLat, i) => {
      const el = document.createElement("div");
      el.className = "corner-handle";
      el.style.setProperty("--corner-color", CORNER_COLORS[i]);
      el.title = CORNER_LABELS[i];
      el.textContent = String(i + 1);

      const marker = new maplibregl.Marker({ element: el, draggable: true })
        .setLngLat(lngLat)
        .addTo(map);

      marker.on("dragend", () => {
        const { lng, lat } = marker.getLngLat();
        const next = [...cornersRef.current] as [number, number][];
        next[i] = [lng, lat];
        onChangeRef.current(next);
      });

      return marker;
    });

    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Las coordenadas escritas a mano (o revertidas) mueven los marcadores sin
  // recrear el mapa.
  useEffect(() => {
    markersRef.current.forEach((marker, i) => {
      const c = corners[i];
      if (c) marker.setLngLat(c);
    });
  }, [corners]);

  // La imagen de vista previa se recrea entera al cambiar: ImageSource no
  // admite cambiar su url in-place.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const rebuild = () => {
      if (map.getLayer(PREVIEW_LAYER)) map.removeLayer(PREVIEW_LAYER);
      if (map.getSource(PREVIEW_SOURCE)) map.removeSource(PREVIEW_SOURCE);
      if (!imagePath) return;
      map.addSource(PREVIEW_SOURCE, {
        type: "image",
        url: historicalMapImageUrl(imagePath),
        coordinates: toCornerTuple(cornersRef.current),
      });
      map.addLayer({
        id: PREVIEW_LAYER,
        type: "raster",
        source: PREVIEW_SOURCE,
        paint: { "raster-opacity": opacity },
      });
    };

    if (map.loaded()) rebuild();
    else map.once("load", rebuild);
    // La opacidad inicial ya se aplica en rebuild(); el efecto de abajo cubre
    // los cambios en vivo del slider.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imagePath]);

  // Al arrastrar una esquina, la fuente ya existente se actualiza sin
  // recrearla.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.getSource(PREVIEW_SOURCE)) return;
    (map.getSource(PREVIEW_SOURCE) as maplibregl.ImageSource).setCoordinates(
      toCornerTuple(corners)
    );
  }, [corners]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.getLayer(PREVIEW_LAYER)) return;
    map.setPaintProperty(PREVIEW_LAYER, "raster-opacity", opacity);
  }, [opacity]);

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
      <div className="admin-map corner-picker-map" ref={ref} />

      {/* Sobre el propio mapa, no arriba en el formulario: hace falta bajar
          la opacidad mientras se arrastran las esquinas para ver las calles
          de debajo y encajar la imagen, no solo después de colocarla. */}
      {imagePath && (
        <div className="corner-opacity-control">
          <span>Transparencia</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={opacity}
            onChange={(e) => onOpacityChange(Number(e.target.value))}
            aria-label="Transparencia del mapa histórico mientras se encaja"
          />
        </div>
      )}

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

export default function HistoricalMapFields({
  draft,
  onChange,
}: {
  draft: Draft;
  onChange: (d: Draft) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    onChange({ ...draft, [key]: value });

  const setCorner = (i: number, key: 0 | 1, value: number) => {
    const next = [...draft.corners] as [number, number][];
    next[i] = [...next[i]] as [number, number];
    next[i][key] = value;
    set("corners", next);
  };

  const upload = async (file: File) => {
    setUploading(true);
    setUploadError(null);
    const local = URL.createObjectURL(file);
    setPreview(local);

    const res = await uploadHistoricalMapImage(file);
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

  const shown =
    preview ?? (draft.imagePath ? historicalMapImageUrl(draft.imagePath) : "");

  return (
    <div className="hm-fields">
      <div className="field-row">
        <label>
          Título
          <Input
            type="text"
            value={draft.title}
            onChange={(e) => set("title", e.target.value)}
          />
        </label>

        <label>
          Fecha mostrada
          <Input
            type="text"
            value={draft.dateLabel}
            placeholder="Ej.: «1956» o «c. 1930–1940»"
            onChange={(e) => set("dateLabel", e.target.value)}
          />
        </label>
      </div>

      <div className="hm-upload-row">
        <div className="hm-thumb-box">
          {shown ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={shown} alt={draft.title} />
          ) : (
            <span className="image-placeholder">Sin imagen</span>
          )}
        </div>
        <div className="hm-upload-side">
          <label className="upload-btn">
            {uploading
              ? "Subiendo…"
              : draft.imagePath
                ? "Cambiar imagen"
                : "Subir imagen"}
            <Input
              type="file"
              accept={ACCEPTED_HISTORICAL_MAP_EXT}
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) upload(f);
                e.target.value = "";
              }}
            />
          </label>
          {uploadError && <p className="admin-error">{uploadError}</p>}
        </div>
      </div>

      {!hasValidWinding(draft.corners) && (
        <p className="admin-error">
          Las esquinas parecen estar en un orden inválido: revisa que no se
          crucen (superior izquierda → superior derecha → inferior derecha →
          inferior izquierda).
        </p>
      )}

      <div className="hm-picker-wrap">
        <CornerPicker
          imagePath={draft.imagePath}
          corners={draft.corners}
          opacity={draft.defaultOpacity}
          onChange={(corners) => set("corners", corners)}
          onOpacityChange={(opacity) => set("defaultOpacity", opacity)}
        />
        <span className="hint">
          Arrastra cada esquina numerada hasta encajarla con el mapa actual.
          Baja la transparencia para ver las calles de debajo mientras
          encajas — la opacidad que dejes es también la que verá el
          visitante por defecto en el mapa público.
        </span>
      </div>

      <details className="corner-coords">
        <summary>Coordenadas</summary>
        <div className="corner-inputs">
          {CORNER_LABELS.map((label, i) => (
            <div key={label} className="field-row corner-input-row">
              <label>
                {label} · lat
                <Input
                  type="number"
                  step="0.00001"
                  value={draft.corners[i]?.[1] ?? ""}
                  onChange={(e) => setCorner(i, 1, Number(e.target.value))}
                />
              </label>
              <label>
                {label} · lng
                <Input
                  type="number"
                  step="0.00001"
                  value={draft.corners[i]?.[0] ?? ""}
                  onChange={(e) => setCorner(i, 0, Number(e.target.value))}
                />
              </label>
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}
