"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deletePhoto } from "@/app/actions/photos";
import { deleteComment } from "@/app/actions/social";
import { defaultDateLabel } from "@/lib/photos";
import { useScrollBorder } from "@/lib/useScrollBorder";
import { STATUS_LABELS, type Comment, type Photo } from "@/lib/types";
import "@/components/admin/admin.css";

export default function Historial({
  photos,
  comments,
}: {
  photos: Photo[];
  comments: Comment[];
}) {
  const router = useRouter();
  const { scrolled, onScroll } = useScrollBorder();
  const [busy, startTransition] = useTransition();

  const removePhoto = (photo: Photo) => {
    if (!confirm(`¿Retirar «${photo.title}»? No se puede deshacer.`)) return;
    startTransition(async () => {
      await deletePhoto(photo.id);
      router.refresh();
    });
  };

  const removeComment = (comment: Comment) => {
    if (!confirm("¿Eliminar este comentario? No se puede deshacer.")) return;
    startTransition(async () => {
      await deleteComment(comment.id);
      router.refresh();
    });
  };

  return (
    <main className="admin">
      <header className={`admin-header${scrolled ? " scrolled" : ""}`}>
        <div className="admin-header-left">
          <Link href="/" className="back-link">
            <ArrowLeft aria-hidden size={14} strokeWidth={1.8} /> Volver al mapa
          </Link>
          <h1>Tu historial</h1>
        </div>
      </header>

      <div className="pane pane-centered" onScroll={onScroll}>
        <section>
          <h2>Tus fotografías</h2>
          {photos.length === 0 ? (
            <p className="hint pane-note">Aún no has enviado ninguna fotografía.</p>
          ) : (
            <ul className="photo-list">
              {photos.map((p) => (
                <li key={p.id}>
                  <div className="photo-row">
                    <span className="thumb">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {p.image && <img src={p.image} alt="" />}
                    </span>
                    <span className="photo-row-text">
                      <span className="photo-row-title">{p.title || "(sin título)"}</span>
                      <span className="photo-row-meta">
                        <span className={`status-tag ${p.status}`}>
                          {STATUS_LABELS[p.status]}
                        </span>
                        {p.dateLabel || defaultDateLabel(p)}
                      </span>
                      {p.status === "rejected" && p.reviewNote && (
                        <span className="hint">Motivo: {p.reviewNote}</span>
                      )}
                    </span>
                  </div>
                  <span className="row-actions">
                    <Button
                      variant="ghost"
                      className="approve-btn"
                      title="Editar"
                      aria-label="Editar"
                      onClick={() => router.push(`/subir?edit=${p.id}`)}
                    >
                      <Pencil aria-hidden size={14} strokeWidth={1.8} />
                    </Button>
                    {p.status === "pending" && (
                      <Button
                        variant="ghost"
                        className="reject-btn"
                        title="Retirar"
                        aria-label="Retirar"
                        disabled={busy}
                        onClick={() => removePhoto(p)}
                      >
                        <Trash2 aria-hidden size={14} strokeWidth={1.8} />
                      </Button>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2>Tus comentarios</h2>
          {comments.length === 0 ? (
            <p className="hint pane-note">Aún no has escrito ningún comentario.</p>
          ) : (
            <ul className="photo-list">
              {comments.map((c) => (
                <li key={c.id}>
                  <div className="photo-row comment-row">
                    <span className="photo-row-text">
                      <span className="photo-row-title">
                        {c.photoTitle || "(foto retirada)"}
                      </span>
                      <span className="photo-row-meta">
                        <span className={`status-dot ${c.status}`} aria-hidden />
                        {STATUS_LABELS[c.status]}
                        <span className="photo-row-author">
                          · {new Date(c.createdAt).toLocaleDateString("es-ES")}
                        </span>
                      </span>
                      <span className="comment-row-body">{c.body}</span>
                      {c.status === "rejected" && c.reviewNote && (
                        <span className="hint">Motivo: {c.reviewNote}</span>
                      )}
                    </span>
                  </div>
                  <span className="row-actions">
                    <Button
                      variant="ghost"
                      className="reject-btn"
                      title="Eliminar"
                      aria-label="Eliminar"
                      disabled={busy}
                      onClick={() => removeComment(c)}
                    >
                      <Trash2 aria-hidden size={14} strokeWidth={1.8} />
                    </Button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
