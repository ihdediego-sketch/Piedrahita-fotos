"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Photo } from "@/lib/photos";
import type { SiteContent } from "@/lib/site";
import "./admin.css";

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

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function defaultDateLabel(p: Photo): string {
  return p.yearFrom === p.yearTo
    ? String(p.yearFrom)
    : `c. ${p.yearFrom}–${p.yearTo}`;
}

/** Mini-mapa para elegir la posición de la foto con un clic. */
function LocationPicker({
  lat,
  lng,
  onPick,
}: {
  lat: number;
  lng: number;
  onPick: (lat: number, lng: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;

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
    // La rueda debe desplazar el panel, no hacer zoom: el zoom va por botones.
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
      markerRef.current = null;
    };
    // El componente se remonta al cambiar de foto (key en PhotoForm), así que
    // basta con crear el mapa una vez; las coordenadas escritas a mano se
    // reflejan en el efecto de abajo sin recrearlo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (markerRef.current && Number.isFinite(lat) && Number.isFinite(lng)) {
      markerRef.current.setLngLat([lng, lat]);
    }
  }, [lat, lng]);

  return <div className="admin-map" ref={ref} />;
}

function PhotoForm({
  photo,
  onChange,
  onDelete,
}: {
  photo: Photo;
  onChange: (p: Photo) => void;
  onDelete: () => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const set = <K extends keyof Photo>(key: K, value: Photo[K]) =>
    onChange({ ...photo, [key]: value });

  const upload = async (file: File) => {
    if (!photo.id) {
      setUploadError("Pon primero un título (genera el identificador).");
      return;
    }
    setUploading(true);
    setUploadError(null);
    const form = new FormData();
    form.append("file", file);
    form.append("id", photo.id);
    const res = await fetch("/api/admin/upload", { method: "POST", body: form });
    const data = await res.json();
    setUploading(false);
    if (!res.ok) {
      setUploadError(data.error ?? "Error al subir la imagen");
      return;
    }
    onChange({ ...photo, image: data.image });
  };

  return (
    <div className="photo-form">
      <div className="photo-form-head">
        <h2>{photo.title || "Nueva fotografía"}</h2>
        <button className="delete-btn" onClick={onDelete}>
          Eliminar
        </button>
      </div>

      <div className="photo-form-cols">
        <div className="photo-form-fields">
          <label>
            Título
            <input
              type="text"
              value={photo.title}
              onChange={(e) => set("title", e.target.value)}
            />
          </label>

          <label>
            Descripción
            <textarea
              rows={7}
              value={photo.description}
              onChange={(e) => set("description", e.target.value)}
            />
          </label>

          <div className="field-row">
            <label>
              Año desde
              <input
                type="number"
                value={photo.yearFrom || ""}
                onChange={(e) => {
                  const y = Number(e.target.value);
                  onChange({
                    ...photo,
                    yearFrom: y,
                    yearTo: photo.yearTo < y ? y : photo.yearTo,
                  });
                }}
              />
            </label>
            <label>
              Año hasta
              <input
                type="number"
                value={photo.yearTo || ""}
                onChange={(e) => set("yearTo", Number(e.target.value))}
              />
            </label>
          </div>

          <label>
            Fecha mostrada
            <input
              type="text"
              value={photo.dateLabel}
              placeholder={defaultDateLabel(photo)}
              onChange={(e) => set("dateLabel", e.target.value)}
            />
            <span className="hint">
              Ej.: «14 de agosto de 1932» o «c. 1890–1910». Si se deja vacía se
              usa el rango de años.
            </span>
          </label>

          <label className="check-field">
            <input
              type="checkbox"
              checked={photo.featured ?? false}
              onChange={(e) => set("featured", e.target.checked)}
            />
            <span>Hito relevante</span>
            <span className="hint">
              Se marca en el mapa con un punto marrón más grande.
            </span>
          </label>

          <div className="field-row">
            <label>
              Latitud
              <input
                type="number"
                step="0.00001"
                value={photo.lat || ""}
                onChange={(e) => set("lat", Number(e.target.value))}
              />
            </label>
            <label>
              Longitud
              <input
                type="number"
                step="0.00001"
                value={photo.lng || ""}
                onChange={(e) => set("lng", Number(e.target.value))}
              />
            </label>
          </div>
        </div>

        <div className="photo-form-side">
          <div className="image-box">
            {photo.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photo.image} alt={photo.title} />
            ) : (
              <span className="image-placeholder">Sin imagen</span>
            )}
          </div>
          <label className="upload-btn">
            {uploading ? "Subiendo…" : "Subir imagen"}
            <input
              type="file"
              accept=".jpg,.jpeg,.png,.webp,.avif,.svg,.gif"
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
            lat={photo.lat}
            lng={photo.lng}
            onPick={(lat, lng) => onChange({ ...photo, lat, lng })}
          />
          <span className="hint">Haz clic en el mapa para colocar la foto.</span>
        </div>
      </div>
    </div>
  );
}

type Tab = "textos" | "fotos";

export default function AdminPanel() {
  const [siteContent, setSiteContent] = useState<SiteContent | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [tab, setTab] = useState<Tab>("textos");
  const [selected, setSelected] = useState<number | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/admin/content")
      .then((r) => r.json())
      .then((data) => {
        setSiteContent(data.site);
        setPhotos(data.photos);
      });
  }, []);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  if (!siteContent) {
    return (
      <main className="admin">
        <p className="hint">Cargando…</p>
      </main>
    );
  }

  const touch = () => {
    setDirty(true);
    setSaved(false);
  };

  const updateSite = (patch: Partial<SiteContent>) => {
    setSiteContent({ ...siteContent, ...patch });
    touch();
  };

  const updatePhoto = (index: number, p: Photo) => {
    const next = { ...p };
    // Mientras la foto no tenga imagen subida, el id se deriva del título
    if (!photos[index].image && !p.image) next.id = slugify(p.title);
    setPhotos(photos.map((old, i) => (i === index ? next : old)));
    touch();
  };

  const addPhoto = () => {
    const p: Photo = {
      id: "",
      title: "",
      description: "",
      lat: NaN,
      lng: NaN,
      yearFrom: 1900,
      yearTo: 1900,
      dateLabel: "",
      image: "",
      featured: false,
    };
    setPhotos([p, ...photos]);
    setSelected(0);
    touch();
  };

  const deletePhoto = (index: number) => {
    if (!confirm(`¿Eliminar «${photos[index].title || "sin título"}»?`)) return;
    setPhotos(photos.filter((_, i) => i !== index));
    setSelected(null);
    touch();
  };

  const save = async () => {
    setSaving(true);
    setErrors([]);
    const cleaned = photos.map((p) => ({
      ...p,
      id: p.id || slugify(p.title),
      dateLabel: p.dateLabel.trim() || defaultDateLabel(p),
    }));
    const res = await fetch("/api/admin/content", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ site: siteContent, photos: cleaned }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setErrors(data?.errors ?? ["Error al guardar"]);
      return;
    }
    setPhotos(cleaned);
    setDirty(false);
    setSaved(true);
  };

  return (
    <main className="admin">
      <header className="admin-header">
        <div>
          <h1>Piedrahíta · Admin</h1>
        </div>
        <div className="admin-actions">
          {saved && <span className="saved-note">Guardado ✓</span>}
          <button className="save-btn" onClick={save} disabled={saving || !dirty}>
            {saving ? "Guardando…" : "Guardar cambios"}
          </button>
        </div>
      </header>

      <nav className="admin-tabs" role="tablist">
        <button
          role="tab"
          aria-selected={tab === "textos"}
          className={tab === "textos" ? "active" : ""}
          onClick={() => setTab("textos")}
        >
          Textos
        </button>
        <button
          role="tab"
          aria-selected={tab === "fotos"}
          className={tab === "fotos" ? "active" : ""}
          onClick={() => setTab("fotos")}
        >
          Fotografías ({photos.length})
        </button>
      </nav>

      {errors.length > 0 && (
        <div className="admin-errors">
          {errors.map((e, i) => (
            <p key={i} className="admin-error">
              {e}
            </p>
          ))}
        </div>
      )}

      {tab === "textos" && (
        <div className="pane text-pane">
          <h2>Textos de la web</h2>
          <div className="field-row">
            <label>
              Título
              <input
                type="text"
                value={siteContent.title}
                onChange={(e) => updateSite({ title: e.target.value })}
              />
            </label>
            <label>
              Subtítulo
              <input
                type="text"
                value={siteContent.subtitle}
                onChange={(e) => updateSite({ subtitle: e.target.value })}
              />
            </label>
          </div>
          <div className="field-row">
            <label>
              Título de la pestaña (SEO)
              <input
                type="text"
                value={siteContent.metaTitle}
                onChange={(e) => updateSite({ metaTitle: e.target.value })}
              />
            </label>
            <label>
              Descripción (SEO)
              <input
                type="text"
                value={siteContent.metaDescription}
                onChange={(e) => updateSite({ metaDescription: e.target.value })}
              />
            </label>
          </div>
        </div>
      )}

      {tab === "fotos" && (
        <div className="photos-layout">
          <aside className="photos-list-pane">
            <button className="add-btn" onClick={addPhoto}>
              + Añadir fotografía
            </button>
            <ul className="photo-list">
              {photos.map((photo, i) => (
                <li key={i}>
                  <button
                    className={`photo-row${selected === i ? " selected" : ""}`}
                    onClick={() => setSelected(i)}
                  >
                    <span className="thumb">
                      {photo.image && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={photo.image} alt="" />
                      )}
                    </span>
                    <span className="photo-row-text">
                      <span className="photo-row-title">
                        {photo.title || "(sin título)"}
                      </span>
                      <span className="photo-row-date">
                        {photo.featured && (
                          <span className="row-featured" title="Hito relevante">
                            ●{" "}
                          </span>
                        )}
                        {photo.dateLabel || defaultDateLabel(photo)}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </aside>

          <section className="photo-detail-pane">
            {selected !== null && photos[selected] ? (
              <PhotoForm
                key={selected}
                photo={photos[selected]}
                onChange={(p) => updatePhoto(selected, p)}
                onDelete={() => deletePhoto(selected)}
              />
            ) : (
              <p className="empty-detail">
                Selecciona una fotografía de la lista para editarla.
              </p>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
