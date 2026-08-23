"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import { photos, type Photo } from "@/lib/photos";
import { site } from "@/lib/site";
import Timeline from "./Timeline";
import PhotoModal from "./PhotoModal";
import { TIMELINE_MIN, TIMELINE_MAX } from "@/lib/photos";

const PIEDRAHITA: [number, number] = [-5.3238, 40.4619];
const DEFAULT_ZOOM = 15.2;

const MAP_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    carto: {
      type: "raster",
      // voyager en vez de light_all: light_all es tan pálido que en escala de
      // grises las calles casi desaparecen y no hay filtro CSS que lo arregle
      // (contrast() pivota en el gris medio y aclara aún más los casi-blancos).
      tiles: [
        "https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png",
        "https://b.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png",
        "https://c.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png",
      ],
      tileSize: 256,
      attribution:
        '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> © <a href="https://carto.com/attributions">CARTO</a>',
    },
  },
  layers: [{ id: "carto", type: "raster", source: "carto" }],
};

export default function MapView() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<Map<string, maplibregl.Marker>>(new Map());

  const [range, setRange] = useState<[number, number]>([
    TIMELINE_MIN,
    TIMELINE_MAX,
  ]);
  const [selected, setSelected] = useState<Photo | null>(null);
  const selectRef = useRef(setSelected);
  selectRef.current = setSelected;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLE,
      center: PIEDRAHITA,
      zoom: DEFAULT_ZOOM,
      minZoom: 12,
      maxZoom: 18.5,
      attributionControl: { compact: true },
    });
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current.clear();
    };
  }, []);

  // Sincroniza los marcadores con el rango de años elegido
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const [from, to] = range;
    const markers = markersRef.current;

    for (const photo of photos) {
      // Visible si el rango de la foto se solapa con el rango elegido
      const visible = photo.yearFrom <= to && photo.yearTo >= from;
      const existing = markers.get(photo.id);

      if (visible && !existing) {
        // MapLibre posiciona el elemento raíz con transform inline; el punto va
        // en un hijo para que la animación y el hover no pisen esa posición.
        const el = document.createElement("div");
        // Los hitos van por encima para que un punto normal cercano no los tape
        if (photo.featured) el.style.zIndex = "1";
        const dot = document.createElement("div");
        dot.className = photo.featured
          ? "photo-marker featured marker-appear"
          : "photo-marker marker-appear";
        el.appendChild(dot);
        el.addEventListener("click", (e) => {
          e.stopPropagation();
          selectRef.current(photo);
        });
        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([photo.lng, photo.lat])
          .addTo(map);
        markers.set(photo.id, marker);
      } else if (!visible && existing) {
        existing.remove();
        markers.delete(photo.id);
      }
    }
  }, [range]);

  const count = photos.filter(
    (p) => p.yearFrom <= range[1] && p.yearTo >= range[0]
  ).length;

  return (
    <>
      <div className="map-root" ref={containerRef} />

      <div className="map-controls">
        <button
          type="button"
          className="map-control"
          aria-label="Acercar"
          onClick={() => mapRef.current?.zoomIn()}
        >
          <span aria-hidden>+</span>
        </button>
        <button
          type="button"
          className="map-control"
          aria-label="Alejar"
          onClick={() => mapRef.current?.zoomOut()}
        >
          <span aria-hidden>−</span>
        </button>
        <button
          type="button"
          className="map-control map-control-center"
          aria-label="Centrar el mapa en Piedrahíta"
          onClick={() =>
            mapRef.current?.easeTo({
              center: PIEDRAHITA,
              zoom: DEFAULT_ZOOM,
              duration: 700,
            })
          }
        >
          <svg viewBox="0 0 24 24" aria-hidden focusable="false">
            <circle cx="12" cy="12" r="4.5" />
            <path d="M12 1.5v4M12 18.5v4M1.5 12h4M18.5 12h4" />
          </svg>
        </button>
      </div>

      <header className="site-header">
        <h1>{site.title}</h1>
        <span className="subtitle">{site.subtitle}</span>
      </header>

      <Timeline
        from={range[0]}
        to={range[1]}
        count={count}
        onChange={(from, to) => setRange([from, to])}
      />

      {selected && (
        <PhotoModal photo={selected} onClose={() => setSelected(null)} />
      )}
    </>
  );
}
