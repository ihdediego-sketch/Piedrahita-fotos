"use client";

import { useMemo, useRef, useState } from "react";
import NextImage from "next/image";
import {
  RowsPhotoAlbum,
  type RenderImageContext,
  type RenderImageProps,
} from "react-photo-album";
import "react-photo-album/rows.css";
import { Input } from "@/components/ui/input";
import SegmentedFilter from "@/components/admin/SegmentedFilter";
import AppHeader from "@/components/AppHeader";
import PhotoModal from "@/components/PhotoModal";
import { useScrollBorder } from "@/lib/useScrollBorder";
import type { Photo, SiteContent, Viewer } from "@/lib/types";

type SortId = "fecha-foto" | "subida";

const SORT_OPTIONS: { id: SortId; label: string }[] = [
  { id: "fecha-foto", label: "Fecha de la foto" },
  { id: "subida", label: "Subida" },
];

/** Lo que consume el mosaico: la foto con las claves que pide la librería. */
type AlbumPhoto = {
  src: string;
  width: number;
  height: number;
  alt: string;
  key: string;
  photo: Photo;
};

/** Minúsculas y sin tildes, para que «camión» y «camion» busquen lo mismo. */
const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/**
 * La imagen del mosaico se pinta con next/image en vez del <img> de la
 * librería: el optimizador de Vercel sirve miniaturas AVIF/WebP al ancho
 * justo en lugar del original completo del bucket.
 */
function renderNextImage(
  { alt = "", title, sizes }: RenderImageProps,
  { photo, index, width, height }: RenderImageContext<AlbumPhoto>
) {
  return (
    <div
      style={{
        width: "100%",
        position: "relative",
        aspectRatio: `${width} / ${height}`,
      }}
    >
      <NextImage
        fill
        src={photo.src}
        alt={alt}
        title={title}
        sizes={sizes}
        // Las primeras filas están a la vista al entrar: se piden ya, sin lazy
        priority={index < 12}
      />
    </div>
  );
}

export default function PhotosView({
  photos,
  site,
  viewer,
  likedIds,
}: {
  photos: Photo[];
  site: SiteContent;
  viewer: Viewer;
  likedIds: string[];
}) {
  const { scrolled, onScroll } = useScrollBorder();
  const [sort, setSort] = useState<SortId>("fecha-foto");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Photo | null>(null);

  // Originales ya pedidos al pasar el ratón, para no repetir la petición
  const preloaded = useRef(new Set<string>());
  const preload = (src: string) => {
    if (preloaded.current.has(src)) return;
    preloaded.current.add(src);
    new window.Image().src = src;
  };

  const filtered = useMemo(() => {
    const q = norm(query.trim());
    const list = q
      ? photos.filter((p) => norm(p.title).includes(q))
      : [...photos];
    if (sort === "fecha-foto") {
      list.sort(
        (a, b) =>
          a.yearFrom - b.yearFrom ||
          a.yearTo - b.yearTo ||
          a.createdAt.localeCompare(b.createdAt)
      );
    } else {
      list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }
    return list;
  }, [photos, sort, query]);

  const albumPhotos = useMemo<AlbumPhoto[]>(
    () =>
      filtered.map((p) => ({
        src: p.image,
        // Sin dimensiones (fotos anteriores al backfill) se asume 4:3: la
        // maqueta solo necesita la proporción, no los píxeles reales.
        width: p.width ?? 4,
        height: p.height ?? 3,
        alt: p.title,
        key: p.id,
        photo: p,
      })),
    [filtered]
  );

  return (
    <main className="admin photos-page">
      <AppHeader site={site} viewer={viewer} scrolled={scrolled} />

      <div className="photos-toolbar">
        <Input
          type="search"
          className="photos-search"
          placeholder="Buscar por título…"
          aria-label="Buscar por título"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <SegmentedFilter
          value={sort}
          onChange={setSort}
          options={SORT_OPTIONS}
          ariaLabel="Ordenar fotografías"
        />
        <span className="photos-count">
          {filtered.length === 1
            ? "1 fotografía"
            : `${filtered.length} fotografías`}
        </span>
      </div>

      <div className="pane photos-pane" onScroll={onScroll}>
        {albumPhotos.length > 0 ? (
          <RowsPhotoAlbum
            photos={albumPhotos}
            targetRowHeight={220}
            rowConstraints={{ singleRowMaxHeight: 340 }}
            spacing={6}
            // El mosaico ocupa el ancho de la ventana menos el padding de
            // .admin: con esto next/image pide cada miniatura al ancho justo
            sizes={{
              size: "calc(100vw - 5rem)",
              sizes: [
                { viewport: "(max-width: 900px)", size: "calc(100vw - 2.4rem)" },
              ],
            }}
            render={{ image: renderNextImage }}
            onClick={({ photo }) => setSelected(photo.photo)}
            componentsProps={{
              button: ({ photo }) => ({
                // Precarga el original al rondar la foto: el modal abre caliente
                onMouseEnter: () => preload(photo.src),
                onPointerDown: () => preload(photo.src),
              }),
            }}
          />
        ) : (
          <p className="photos-empty">
            No hay fotos que coincidan con «{query.trim()}».
          </p>
        )}
      </div>

      {selected && (
        <PhotoModal
          photo={selected}
          viewer={viewer}
          likedInitially={likedIds.includes(selected.id)}
          onClose={() => setSelected(null)}
        />
      )}
    </main>
  );
}
