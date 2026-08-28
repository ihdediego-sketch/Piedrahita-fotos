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
  // La más reciente abre a toda plana, a modo de portada de revista; el
  // resto se lee debajo como un índice, no como una cuadrícula de fichas.
  const [featured, ...rest] = stories;

  return (
    <main className="admin historias-page">
      <AppHeader site={site} viewer={viewer} scrolled={scrolled} />

      {/* El scroll vive en `.pane`, a todo el ancho, para que la barra quede
          pegada al borde de la ventana; `.pane-centered` es solo el ancho de
          lectura, centrado dentro. Si van en el mismo elemento la barra sale
          pegada al texto en vez de al borde. */}
      <div className="pane" onScroll={onScroll}>
        <div className="pane-centered">
        {stories.length === 0 ? (
          <p className="photos-empty">Todavía no hay historias publicadas.</p>
        ) : (
          <div className="stories-editorial">
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
                  <span className="story-feature-excerpt">{featured.excerpt}</span>
                )}
                <span className="story-feature-meta">{meta(featured)}</span>
              </span>
            </Link>

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
