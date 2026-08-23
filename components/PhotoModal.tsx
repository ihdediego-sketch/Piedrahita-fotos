"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { X, Download, Maximize2, Minimize2, Heart, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { Photo } from "@/lib/photos";
import { isStaff, type Comment, type Viewer } from "@/lib/types";
import { addComment, deleteComment, listComments, toggleLike } from "@/app/actions/social";

type Props = {
  photo: Photo;
  viewer: Viewer;
  likedInitially: boolean;
  onClose: () => void;
};

const dateFormat = new Intl.DateTimeFormat("es-ES", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

export default function PhotoModal({
  photo,
  viewer,
  likedInitially,
  onClose,
}: Props) {
  const [closing, setClosing] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  const [liked, setLiked] = useState(likedInitially);
  const [likes, setLikes] = useState(photo.likes);
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const close = () => {
    setClosing(true);
    setTimeout(onClose, 200);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Con el foco en el campo de comentario, «f» debe escribirse, no ampliar
      const typing =
        e.target instanceof HTMLElement &&
        ["TEXTAREA", "INPUT"].includes(e.target.tagName);
      if (e.key === "Escape") {
        if (fullscreen) setFullscreen(false);
        else close();
      }
      if (!typing && (e.key === "f" || e.key === "F")) setFullscreen((v) => !v);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullscreen]);

  // Los comentarios se piden al abrir la foto, no con el resto del mapa
  useEffect(() => {
    let cancelled = false;
    listComments(photo.id).then((list) => {
      if (!cancelled) setComments(list);
    });
    return () => {
      cancelled = true;
    };
  }, [photo.id]);

  const onLike = () => {
    if (!viewer) return;
    // Optimista: el corazón responde al instante y se corrige si falla
    setLiked((v) => !v);
    setLikes((n) => n + (liked ? -1 : 1));
    startTransition(async () => {
      const res = await toggleLike(photo.id);
      if (res.ok) {
        setLiked(res.liked);
        setLikes(res.likes);
      } else {
        setLiked(likedInitially);
        setLikes(photo.likes);
        setError(res.error);
      }
    });
  };

  const onComment = (e: React.FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setError(null);
    startTransition(async () => {
      const res = await addComment(photo.id, text);
      if (!res.ok) return setError(res.error);
      setComments((list) => [...(list ?? []), res.comment]);
      setDraft("");
    });
  };

  const onDeleteComment = (id: string) => {
    startTransition(async () => {
      const res = await deleteComment(id);
      if (!res.ok) return setError(res.error);
      setComments((list) => (list ?? []).filter((c) => c.id !== id));
    });
  };

  const extension = photo.image.split("?")[0].split(".").pop() ?? "jpg";
  const downloadName = `${photo.title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")}.${extension}`;

  return (
    <div
      className={`modal-backdrop${closing ? " closing" : ""}${
        fullscreen ? " fullscreen" : ""
      }`}
      onClick={close}
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={photo.title}
        onClick={(e) => {
          e.stopPropagation();
          // en pantalla completa, el hueco alrededor de la foto vuelve al modal
          if (fullscreen && e.target === e.currentTarget) setFullscreen(false);
        }}
      >
        <Button
          variant="ghost"
          className="modal-close"
          onClick={close}
          aria-label="Cerrar"
        >
          <X aria-hidden size={18} strokeWidth={1.8} />
        </Button>
        <figure className="modal-figure">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo.image} alt={photo.title} />
          {/* Ampliar y descargar van sobre la foto, no en la cabecera: en la
              vista de dos columnas la cabecera queda sobre el texto. */}
          <div className="modal-actions">
            <a
              className="modal-download"
              href={photo.image}
              download={downloadName}
              onClick={(e) => e.stopPropagation()}
              aria-label="Descargar imagen"
              title="Descargar imagen"
            >
              <Download aria-hidden size={17} strokeWidth={1.8} />
            </a>
            <Button
              variant="ghost"
              className="modal-expand"
              onClick={() => setFullscreen((v) => !v)}
              aria-pressed={fullscreen}
              aria-label={
                fullscreen ? "Ver con descripción" : "Ver a pantalla completa"
              }
              title={fullscreen ? "Ver con descripción (F)" : "Pantalla completa (F)"}
            >
              {fullscreen ? (
                <Minimize2 aria-hidden size={17} strokeWidth={1.8} />
              ) : (
                <Maximize2 aria-hidden size={17} strokeWidth={1.8} />
              )}
            </Button>
          </div>
        </figure>
        <div className="modal-body">
          <p className="modal-date">
            {photo.featured && <span className="modal-featured">Hito</span>}
            {photo.dateLabel}
          </p>
          <h2 className="modal-title">{photo.title}</h2>
          <p className="modal-description">{photo.description}</p>

          {photo.authorName && (
            <p className="modal-credit">Aportada por {photo.authorName}</p>
          )}

          <div className="modal-social">
            <Button
              variant="ghost"
              className={`like-btn${liked ? " liked" : ""}`}
              onClick={onLike}
              disabled={!viewer || pending}
              aria-pressed={liked}
              title={viewer ? "Me gusta" : "Entra para dar me gusta"}
            >
              <Heart
                aria-hidden
                size={16}
                strokeWidth={1.8}
                fill={liked ? "currentColor" : "none"}
              />
              {likes}
            </Button>
            <span className="social-count">
              {comments === null
                ? "…"
                : comments.length === 1
                  ? "1 comentario"
                  : `${comments.length} comentarios`}
            </span>
          </div>

          {error && <p className="admin-error">{error}</p>}

          <ul className="comment-list">
            {(comments ?? []).map((c) => (
              <li key={c.id}>
                <div className="comment-head">
                  <span className="comment-author">{c.authorName}</span>
                  <span className="comment-date">
                    {dateFormat.format(new Date(c.createdAt))}
                  </span>
                  {(c.userId === viewer?.id || isStaff(viewer)) && (
                    <Button
                      variant="ghost"
                      className="comment-delete"
                      onClick={() => onDeleteComment(c.id)}
                      aria-label="Borrar comentario"
                      title="Borrar comentario"
                    >
                      <Trash2 aria-hidden size={13} strokeWidth={1.8} />
                    </Button>
                  )}
                </div>
                <p className="comment-body">{c.body}</p>
              </li>
            ))}
          </ul>

          {viewer ? (
            <form className="comment-form" onSubmit={onComment}>
              <Textarea
                rows={2}
                value={draft}
                maxLength={2000}
                placeholder="¿Reconoces el sitio? ¿Sabes algo de esta foto?"
                onChange={(e) => setDraft(e.target.value)}
              />
              <Button
                type="submit"
                variant="ghost"
                className="save-btn"
                disabled={pending || !draft.trim()}
              >
                Comentar
              </Button>
            </form>
          ) : (
            <p className="hint">
              <Link href="/entrar">Entra</Link> para comentar y dar me gusta.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
