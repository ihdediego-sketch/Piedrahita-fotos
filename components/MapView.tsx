"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import { Layers, Plus, Minus, Maximize } from "lucide-react";
import { Button } from "@/components/ui/button";
import { type Photo } from "@/lib/photos";
import type { HistoricalMap, SiteContent, Viewer } from "@/lib/types";
import { toCornerTuple } from "@/lib/historical-maps";
import { plaza, edificios } from "@/lib/lugares";
import Timeline from "./Timeline";
import PhotoModal from "./PhotoModal";
import UserMenu from "./UserMenu";
import { TIMELINE_MIN, TIMELINE_MAX } from "@/lib/photos";

/** Tope de mapas históricos activos a la vez, para no encender de golpe
 *  varias capas raster pesadas sin que el visitante se dé cuenta. */
const MAX_VISIBLE_HISTORICAL_MAPS = 3;

const PIEDRAHITA: [number, number] = [-5.326398, 40.463383];
const DEFAULT_ZOOM = 15.2;
const MAX_ZOOM = 18.5;

/** Distancia en píxeles por debajo de la cual dos puntos se agrupan. */
const CLUSTER_RADIUS = 34;

// Verde muy poco saturado, del mismo registro apagado que el resto del sitio
const GREEN = "#d5ddc8";
const GREEN_WOOD = "#c7d2b6";
// El mismo marrón de --brown, el único color de la casa
const BROWN = "#5c3317";

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
    // Vectorial solo para repintar por encima lo que nos interesa distinguir:
    // las zonas verdes. El resto del mapa sigue siendo el ráster en gris.
    omt: { type: "vector", url: "https://tiles.openfreemap.org/planet" },
    plaza: { type: "geojson", data: plaza },
    edificios: { type: "geojson", data: edificios },
  },
  layers: [
    // La desaturación va en la capa ráster, no en un filter CSS sobre el
    // canvas: así el gris afecta solo al fondo y las capas de encima
    // conservan su color.
    { id: "carto", type: "raster", source: "carto", paint: { "raster-saturation": -1 } },
    {
      id: "zonas-verdes",
      type: "fill",
      source: "omt",
      "source-layer": "landcover",
      filter: ["match", ["get", "class"], ["grass", "wood", "farmland"], true, false],
      paint: {
        "fill-color": [
          "match",
          ["get", "class"],
          "wood",
          GREEN_WOOD,
          GREEN,
        ],
        "fill-opacity": 0.75,
      },
    },
    {
      id: "parques",
      type: "fill",
      source: "omt",
      "source-layer": "park",
      paint: { "fill-color": GREEN, "fill-opacity": 0.5 },
    },
    // La plaza es el centro del pueblo y de casi todas las fotos, pero en el
    // ráster gris queda como una mancha más: se repinta y se rotula.
    {
      id: "plaza-fondo",
      type: "fill",
      source: "plaza",
      paint: { "fill-color": "#ece3d5", "fill-opacity": 0.95 },
    },
    // El palacio y la iglesia, en el marrón de la casa: son los dos edificios
    // que aparecen una y otra vez en las fotos y conviene reconocerlos de un
    // vistazo sobre el gris.
    {
      id: "edificios-hito",
      type: "fill",
      source: "edificios",
      paint: { "fill-color": BROWN, "fill-opacity": 0.85 },
    },
    {
      id: "plaza-nombre",
      type: "symbol",
      source: "plaza",
      minzoom: 14.5,
      layout: {
        "text-field": "Plaza de España",
        "text-font": ["Noto Sans Regular"],
        "text-size": 10,
        "text-letter-spacing": 0.18,
        "text-transform": "uppercase",
        "text-max-width": 20,
        // Baja el rótulo: en el centro de la plaza es justo donde caen los
        // puntos de las fotos, que lo taparían
        "text-offset": [0, 2.4],
      },
      paint: {
        "text-color": BROWN,
        "text-halo-color": "#fafafa",
        "text-halo-width": 1.4,
      },
    },
  ],
  glyphs: "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf",
};

/** Estado del grupo desplegado en abanico, si lo hay. */
type Spider = {
  ids: string[];
  center: [number, number];
  /** Zoom al desplegarlo: si el usuario cambia el zoom, el abanico se cierra. */
  zoom: number;
};

/** Agrupa por cercanía en píxeles (voraz: el primero de cada grupo lo ancla). */
function clusterize(
  items: { photo: Photo; x: number; y: number }[]
): { photo: Photo; x: number; y: number }[][] {
  const groups: { photo: Photo; x: number; y: number }[][] = [];
  const used = new Set<number>();

  for (let i = 0; i < items.length; i++) {
    if (used.has(i)) continue;
    used.add(i);
    const group = [items[i]];
    for (let j = i + 1; j < items.length; j++) {
      if (used.has(j)) continue;
      const dx = items[j].x - items[i].x;
      const dy = items[j].y - items[i].y;
      if (Math.hypot(dx, dy) < CLUSTER_RADIUS) {
        used.add(j);
        group.push(items[j]);
      }
    }
    groups.push(group);
  }
  return groups;
}

/** Radio del abanico: crece con el número de fotos para que quepan todas. */
function spiderRadius(n: number) {
  return Math.max(52, (n * 26) / (2 * Math.PI));
}

/** Las líneas que unen el centro del grupo con cada punto desplegado. */
function legsElement(n: number, r: number) {
  const size = (r + 12) * 2;
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", "spider-legs");
  svg.setAttribute("width", String(size));
  svg.setAttribute("height", String(size));
  svg.setAttribute("viewBox", `0 0 ${size} ${size}`);
  const c = size / 2;

  for (let i = 0; i < n; i++) {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    const line = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "line"
    );
    line.setAttribute("x1", String(c));
    line.setAttribute("y1", String(c));
    line.setAttribute("x2", String(c + Math.cos(angle) * r));
    line.setAttribute("y2", String(c + Math.sin(angle) * r));
    svg.appendChild(line);
  }

  const hub = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  hub.setAttribute("cx", String(c));
  hub.setAttribute("cy", String(c));
  hub.setAttribute("r", "3.5");
  hub.setAttribute("class", "spider-hub");
  svg.appendChild(hub);

  // Marker exige un HTMLElement, así que el SVG va envuelto en un div
  const el = document.createElement("div");
  el.className = "spider-legs-wrap";
  el.appendChild(svg);
  return el;
}

type MapViewProps = {
  photos: Photo[];
  historicalMaps: HistoricalMap[];
  site: SiteContent;
  viewer: Viewer;
  /** Fotos a las que el visitante ya dio me gusta, para pintar el corazón lleno. */
  likedIds: string[];
};

export default function MapView({
  photos,
  historicalMaps,
  site,
  viewer,
  likedIds,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<Map<string, maplibregl.Marker>>(new Map());
  const spiderRef = useRef<Spider | null>(null);

  const [visibleHmIds, setVisibleHmIds] = useState<Set<string>>(new Set());
  const [hmOpacities, setHmOpacities] = useState<Record<string, number>>(
    () => Object.fromEntries(historicalMaps.map((m) => [m.id, m.defaultOpacity]))
  );
  const [hmPanelOpen, setHmPanelOpen] = useState(false);

  const [range, setRange] = useState<[number, number]>([
    TIMELINE_MIN,
    TIMELINE_MAX,
  ]);
  const rangeRef = useRef(range);
  rangeRef.current = range;

  const [selected, setSelected] = useState<Photo | null>(null);
  const selectRef = useRef(setSelected);
  selectRef.current = setSelected;

  // Crea el punto de una foto. MapLibre posiciona el elemento raíz con
  // transform inline; el punto va en un hijo para que la animación y el hover
  // no pisen esa posición.
  const photoElement = useCallback((photo: Photo) => {
    const el = document.createElement("div");
    // Los hitos van por encima para que un punto normal cercano no los tape
    if (photo.featured) el.style.zIndex = "1";
    const dot = document.createElement("div");
    dot.className = photo.featured
      ? "photo-marker featured marker-appear"
      : "photo-marker marker-appear";
    dot.title = photo.title;
    el.appendChild(dot);
    el.addEventListener("click", (e) => {
      e.stopPropagation();
      selectRef.current(photo);
    });
    return el;
  }, []);

  const renderRef = useRef<() => void>(() => {});

  // Al pulsar un grupo: acercar hasta separarlo; si no cabe más zoom, abanico
  const openCluster = useCallback(
    (group: { photo: Photo; x: number; y: number }[], center: [number, number]) => {
      const map = mapRef.current;
      if (!map) return;

      let closest = Infinity;
      for (let i = 0; i < group.length; i++) {
        for (let j = i + 1; j < group.length; j++) {
          closest = Math.min(
            closest,
            Math.hypot(group[i].x - group[j].x, group[i].y - group[j].y)
          );
        }
      }

      // Zoom necesario para que el par más cercano supere el radio de grupo
      const factor = (CLUSTER_RADIUS + 8) / Math.max(closest, 0.01);
      const target = map.getZoom() + Math.log2(factor);

      if (target > MAX_ZOOM) {
        spiderRef.current = {
          ids: group.map((g) => g.photo.id),
          center,
          zoom: map.getZoom(),
        };
        renderRef.current();
        map.easeTo({ center, duration: 400 });
        return;
      }

      spiderRef.current = null;
      map.easeTo({ center, zoom: target, duration: 600 });
    },
    []
  );

  const clusterElement = useCallback(
    (group: { photo: Photo; x: number; y: number }[], center: [number, number]) => {
      const el = document.createElement("div");
      el.style.zIndex = "2";
      const bubble = document.createElement("div");
      const n = group.length;
      bubble.className = group.some((g) => g.photo.featured)
        ? "cluster-marker featured marker-appear"
        : "cluster-marker marker-appear";
      // Crece con el número de fotos, con tope para no comerse el mapa
      bubble.style.setProperty("--size", `${Math.min(28 + n * 2.5, 46)}px`);
      bubble.textContent = String(n);
      bubble.title = `${n} fotos aquí`;
      el.appendChild(bubble);
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        openCluster(group, center);
      });
      return el;
    },
    [openCluster]
  );

  const render = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    const [from, to] = rangeRef.current;
    // Visible si el rango de la foto se solapa con el rango elegido
    const visible = photos.filter(
      (p) => p.yearFrom <= to && p.yearTo >= from
    );

    // El abanico se cierra si cambia el zoom o si sus fotos salen del rango
    const spider = spiderRef.current;
    if (
      spider &&
      (Math.abs(map.getZoom() - spider.zoom) > 0.01 ||
        !spider.ids.every((id) => visible.some((p) => p.id === id)))
    ) {
      spiderRef.current = null;
    }
    const open = spiderRef.current;
    const openIds = new Set(open ? open.ids : []);

    // Lo que se debe pintar, indexado por clave estable para no recrear
    // marcadores que ya están en su sitio (evita el parpadeo al mover el mapa).
    const wanted = new Map<
      string,
      { lngLat: [number, number]; offset?: [number, number]; build: () => HTMLElement }
    >();

    const points = visible
      .filter((p) => !openIds.has(p.id))
      .map((photo) => {
        const { x, y } = map.project([photo.lng, photo.lat]);
        return { photo, x, y };
      });

    for (const group of clusterize(points)) {
      if (group.length === 1) {
        const { photo } = group[0];
        wanted.set(`p:${photo.id}`, {
          lngLat: [photo.lng, photo.lat],
          build: () => photoElement(photo),
        });
        continue;
      }

      const members = group.map((g) => g.photo);
      const lng = members.reduce((s, p) => s + p.lng, 0) / members.length;
      const lat = members.reduce((s, p) => s + p.lat, 0) / members.length;
      const key = `c:${members.map((p) => p.id).sort().join(",")}`;
      wanted.set(key, {
        lngLat: [lng, lat],
        build: () => clusterElement(group, [lng, lat]),
      });
    }

    if (open) {
      const members = open.ids
        .map((id) => visible.find((p) => p.id === id))
        .filter((p): p is Photo => Boolean(p));
      const r = spiderRadius(members.length);

      wanted.set(`legs:${open.ids.join(",")}`, {
        lngLat: open.center,
        build: () => legsElement(members.length, r),
      });

      members.forEach((photo, i) => {
        const angle = -Math.PI / 2 + (i * 2 * Math.PI) / members.length;
        wanted.set(`s:${photo.id}`, {
          lngLat: open.center,
          offset: [Math.cos(angle) * r, Math.sin(angle) * r],
          build: () => photoElement(photo),
        });
      });
    }

    const markers = markersRef.current;
    for (const [key, marker] of markers) {
      if (!wanted.has(key)) {
        marker.remove();
        markers.delete(key);
      }
    }
    for (const [key, spec] of wanted) {
      const existing = markers.get(key);
      if (existing) {
        existing.setLngLat(spec.lngLat);
        continue;
      }
      const marker = new maplibregl.Marker({
        element: spec.build(),
        offset: spec.offset ?? [0, 0],
      })
        .setLngLat(spec.lngLat)
        .addTo(map);
      markers.set(key, marker);
    }
  }, [photos, photoElement, clusterElement]);

  renderRef.current = render;

  // Añade/quita las capas de mapas históricos activos y ajusta su opacidad.
  // Se insertan justo antes de "zonas-verdes": así actúan como reemplazo del
  // fondo de calles, mientras el repintado de plaza/edificios/verde (que
  // ayuda a orientarse con el pueblo actual) se sigue viendo encima.
  const syncHistoricalLayers = useCallback(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    for (const m of historicalMaps) {
      const sourceId = `hm:${m.id}`;
      const layerId = `${sourceId}:layer`;
      const opacity = hmOpacities[m.id] ?? m.defaultOpacity;

      if (!visibleHmIds.has(m.id)) {
        if (map.getLayer(layerId)) map.removeLayer(layerId);
        if (map.getSource(sourceId)) map.removeSource(sourceId);
        continue;
      }

      if (!map.getSource(sourceId)) {
        map.addSource(sourceId, {
          type: "image",
          url: m.image,
          coordinates: toCornerTuple(m.corners),
        });
        map.addLayer(
          {
            id: layerId,
            type: "raster",
            source: sourceId,
            paint: { "raster-opacity": opacity },
          },
          "zonas-verdes"
        );
      } else if (map.getLayer(layerId)) {
        map.setPaintProperty(layerId, "raster-opacity", opacity);
      }
    }
  }, [historicalMaps, visibleHmIds, hmOpacities]);

  const syncHistoricalLayersRef = useRef(syncHistoricalLayers);
  syncHistoricalLayersRef.current = syncHistoricalLayers;

  useEffect(() => {
    syncHistoricalLayers();
  }, [syncHistoricalLayers]);

  const toggleHistoricalMap = (id: string) => {
    setVisibleHmIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        if (next.size >= MAX_VISIBLE_HISTORICAL_MAPS) return prev;
        next.add(id);
      }
      return next;
    });
  };

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLE,
      center: PIEDRAHITA,
      zoom: DEFAULT_ZOOM,
      minZoom: 12,
      maxZoom: MAX_ZOOM,
      attributionControl: { compact: true },
    });
    mapRef.current = map;

    const onMove = () => renderRef.current();
    // Reagrupar en directo mientras se mueve el mapa, no sólo al soltar
    map.on("move", onMove);
    map.on("click", () => {
      if (!spiderRef.current) return;
      spiderRef.current = null;
      renderRef.current();
    });
    map.once("load", () => {
      onMove();
      syncHistoricalLayersRef.current();
    });

    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current.clear();
      spiderRef.current = null;
    };
  }, []);

  // Re-pinta al cambiar el rango de años
  useEffect(() => {
    render();
  }, [range, render]);

  const count = photos.filter(
    (p) => p.yearFrom <= range[1] && p.yearTo >= range[0]
  ).length;

  return (
    <>
      <div className="map-root" ref={containerRef} />

      {/* Niebla: blanquea los bordes y deja limpio el centro, para que el
          título, el menú y la línea de tiempo se lean sobre papel. */}
      <div className="map-fog" aria-hidden />

      <div className="map-controls">
        <div className="map-zoom">
          <Button
            type="button"
            variant="ghost"
            className="map-control"
            aria-label="Acercar"
            onClick={() => mapRef.current?.zoomIn()}
          >
            <Plus aria-hidden size={17} strokeWidth={1.8} />
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="map-control"
            aria-label="Alejar"
            onClick={() => mapRef.current?.zoomOut()}
          >
            <Minus aria-hidden size={17} strokeWidth={1.8} />
          </Button>
        </div>
        <Button
          type="button"
          variant="ghost"
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
          <Maximize aria-hidden size={17} strokeWidth={1.6} />
        </Button>
      </div>

      <header className="site-header">
        <h1>{site.title}</h1>
        <span className="subtitle">{site.subtitle}</span>
      </header>

      <UserMenu viewer={viewer} />

      <div className="bottom-bar">
        {historicalMaps.length > 0 && (
          <div className={`historical-maps-control${hmPanelOpen ? " open" : ""}`}>
            {hmPanelOpen && (
              <div className="historical-maps-panel">
                <div className="historical-maps-panel-head">
                  <h2>Mapas históricos</h2>
                  {visibleHmIds.size >= MAX_VISIBLE_HISTORICAL_MAPS && (
                    <span className="hint historical-maps-limit">
                      Máx. {MAX_VISIBLE_HISTORICAL_MAPS} a la vez
                    </span>
                  )}
                </div>
                <ul className="historical-maps-row">
                  {historicalMaps.map((m) => {
                    const active = visibleHmIds.has(m.id);
                    return (
                      <li key={m.id} className={`hm-card${active ? " active" : ""}`}>
                        <button
                          type="button"
                          className="hm-card-btn"
                          onClick={() => toggleHistoricalMap(m.id)}
                          aria-pressed={active}
                        >
                          <span
                            className="hm-thumb"
                            style={{ backgroundImage: `url(${m.image})` }}
                          />
                          <span className="hm-card-title">{m.title}</span>
                          {m.dateLabel && (
                            <span className="hm-card-date">{m.dateLabel}</span>
                          )}
                        </button>
                        {active && (
                          <input
                            type="range"
                            className="hm-opacity"
                            min={0}
                            max={1}
                            step={0.01}
                            value={hmOpacities[m.id] ?? m.defaultOpacity}
                            onChange={(e) =>
                              setHmOpacities((prev) => ({
                                ...prev,
                                [m.id]: Number(e.target.value),
                              }))
                            }
                            aria-label={`Opacidad de ${m.title}`}
                          />
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
            <Button
              type="button"
              variant="ghost"
              className="map-control historical-maps-toggle"
              aria-label="Mapas históricos"
              aria-expanded={hmPanelOpen}
              onClick={() => setHmPanelOpen((v) => !v)}
            >
              <Layers aria-hidden size={17} strokeWidth={1.8} />
            </Button>
          </div>
        )}

        <Timeline
          from={range[0]}
          to={range[1]}
          count={count}
          onChange={(from, to) => setRange([from, to])}
        />
      </div>

      {selected && (
        <PhotoModal
          photo={selected}
          viewer={viewer}
          likedInitially={likedIds.includes(selected.id)}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}
