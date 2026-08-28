"use client";

import Link from "next/link";
import AppHeader from "@/components/AppHeader";
import { useScrollBorder } from "@/lib/useScrollBorder";
import type { SiteContent, Story, Viewer } from "@/lib/types";

const dateFormat = new Intl.DateTimeFormat("es-ES", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

const meta = (s: Story) =>
  [s.publishedAt && dateFormat.format(new Date(s.publishedAt)), s.authorName]
    .filter(Boolean)
    .join(" · ");

export default function HistoriasView({
  stories,
  site,
  viewer,
}: {
  stories: Story[];
  site: SiteContent;
  viewer: Viewer;
}) {
  const { scrolled, onScroll } = useScrollBorder();

  // La destacada marcada a mano abre a toda plana, el doble de grande que
  // el resto, a modo de portada de revista; si nadie ha marcado ninguna,
  // se usa la más reciente. Las dos siguientes acompañan como columna
  // pequeña a su lado, y el resto se lee debajo como un índice.
  const featured = stories.find((s) => s.featured) ?? stories[0];
  const others = stories.filter((s) => s.id !== featured?.id);
  const highlighted = others.slice(0, 2);
  const rest = others.slice(2);

  return (
    <main className="admin historias-page">
      <AppHeader site={site} viewer={viewer} scrolled={scrolled} />

      {/* El scroll vive en `.pane`, a todo el ancho, para que la barra quede
          pegada al borde de la ventana; `.pane-centered` es solo el ancho de
          lectura, centrado dentro. Si van en el mismo elemento la barra sale
          pegada al texto en vez de al borde. */}
      <div className="pane" onScroll={onScroll}>
        <div className="pane-centered">
          {!featured ? (
            <p className="photos-empty">Todavía no hay historias publicadas.</p>
          ) : (
            <div className="stories-editorial">
              <div className="stories-hero-row">
                <Link href={`/historias/${featured.slug}`} className="story-feature">
                  <span className="story-feature-cover">
                    {featured.coverImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={featured.coverImage} alt="" />
                    ) : (
                      <span className="image-placeholder">Sin portada</span>
                    )}
                  </span>
                  <span className="story-feature-body">
                    <span className="story-feature-title">{featured.title}</span>
                    {featured.excerpt && (
                      <span className="story-feature-excerpt">
                        {featured.excerpt}
                      </span>
                    )}
                    <span className="story-feature-meta">{meta(featured)}</span>
                  </span>
                </Link>

                {highlighted.length > 0 && (
                  <div className="stories-hero-side">
                    {highlighted.map((s) => (
                      <Link
                        key={s.id}
                        href={`/historias/${s.slug}`}
                        className="story-tile"
                      >
                        <span className="story-tile-cover">
                          {s.coverImage ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={s.coverImage} alt="" />
                          ) : (
                            <span className="image-placeholder">Sin portada</span>
                          )}
                        </span>
                        <span className="story-tile-body">
                          <span className="story-tile-title">{s.title}</span>
                          <span className="story-tile-meta">{meta(s)}</span>
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {rest.length > 0 && (
                <ul className="stories-list">
                  {rest.map((s) => (
                    <li key={s.id}>
                      <Link href={`/historias/${s.slug}`} className="story-row">
                        <span className="story-row-thumb">
                          {s.coverImage ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={s.coverImage} alt="" />
                          ) : (
                            <span className="image-placeholder">Sin portada</span>
                          )}
                        </span>
                        <span className="story-row-body">
                          <span className="story-row-title">{s.title}</span>
                          {s.excerpt && (
                            <span className="story-row-excerpt">{s.excerpt}</span>
                          )}
                          <span className="story-row-meta">{meta(s)}</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
