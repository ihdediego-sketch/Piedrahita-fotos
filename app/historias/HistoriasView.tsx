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

  return (
    <main className="admin historias-page">
      <AppHeader site={site} viewer={viewer} scrolled={scrolled} />

      <div className="pane pane-centered" onScroll={onScroll}>
        {stories.length === 0 ? (
          <p className="photos-empty">Todavía no hay historias publicadas.</p>
        ) : (
          <ul className="stories-grid">
            {stories.map((s) => (
              <li key={s.id}>
                <Link href={`/historias/${s.slug}`} className="story-card">
                  <span className="story-card-cover">
                    {s.coverImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={s.coverImage} alt="" />
                    ) : (
                      <span className="image-placeholder">Sin portada</span>
                    )}
                  </span>
                  <span className="story-card-body">
                    <span className="story-card-title">{s.title}</span>
                    {s.excerpt && (
                      <span className="story-card-excerpt">{s.excerpt}</span>
                    )}
                    <span className="story-card-meta">
                      {s.publishedAt && dateFormat.format(new Date(s.publishedAt))}
                      {s.authorName && ` · ${s.authorName}`}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
