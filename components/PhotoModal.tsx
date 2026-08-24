"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { X, Download, Maximize2, Minimize2, Heart, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { Photo } from "@/lib/photos";
import { isStaff, STATUS_LABELS, type Comment, type Viewer } from "@/lib/types";
import { addComment, listComments, setCommentStatus, toggleLike } from "@/app/actions/social";

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
  const [showJoin, setShowJoin] = useState(false);
  const [pending, startTransition] = useTransition();

  // El aviso de «hazte una cuenta» solo asoma cuando el visitante intenta
  // participar: dar me gusta o escribir. Si ya ha entrado, no estorba nunca.
  const askToJoin = () => {
    if (!viewer) setShowJoin(true);
  };
  const joining = showJoin && !viewer;

  // El campo empieza en una línea y crece con el texto. El tope de diez líneas
  // lo pone el CSS con max-height; a partir de ahí el propio campo scrolla.
  const draftRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = draftRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [draft]);

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
    if (!viewer) return askToJoin();
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
    if (!viewer) return askToJoin();
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

  const onWithdrawComment = (id: string) => {
    startTransition(async () => {
      const res = await setCommentStatus(id, "rejected");
      if (!res.ok) return setError(res.error);
      setComments((list) =>
        (list ?? []).map((c) => (c.id === id ? { ...c, status: "rejected" } : c))
      );
    });
  };

  // En la ficha se enseña una fecha, no un intervalo: de «1900-1901» o
  // «c. 1900–1910» se queda con el principio. Se recorta la etiqueta en vez de
  // usar yearFrom para no perder los matices escritos a mano («Verano de 1952»).
  const dateLabel =
    photo.dateLabel?.replace(/\s*[-–—]\s*\d{1,4}\s*$/, "").trim() ||
    String(photo.yearFrom);

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
        {/* Fuera del cuerpo del texto: en escritorio encabeza la columna
            derecha, y en el móvil va sobre la foto. En los dos casos se queda
            quieto mientras el resto scrolla. */}
        <header className="modal-head">
          <h2 className="modal-title">{photo.title}</h2>
          <p className="modal-date">
            {photo.featured && <span className="modal-featured">Hito</span>}
            {dateLabel}
          </p>
        </header>
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
        {/* Tres franjas, como en Instagram: cabecera y pie quietos, y el
            contenido —descripción y comentarios— scrollando en medio. */}
        <div className="modal-body">
          <div className="modal-scroll">
            <p className="modal-description">{photo.description}</p>

            {photo.authorName && (
              <p className="modal-credit">Aportada por {photo.authorName}</p>
            )}

            <ul className="comment-list">
              {(comments ?? []).map((c) => (
                <li key={c.id}>
                  <div className="comment-head">
                    <span className="comment-author">{c.authorName}</span>
                    <span className="comment-date">
                      {dateFormat.format(new Date(c.createdAt))}
                    </span>
                    {c.status !== "published" && (
                      <span className={`comment-status ${c.status}`}>
                        {STATUS_LABELS[c.status]}
                      </span>
                    )}
                    {c.status !== "rejected" &&
                      (c.userId === viewer?.id || isStaff(viewer)) && (
                        <Button
                          variant="ghost"
                          className="comment-delete"
                          onClick={() => onWithdrawComment(c.id)}
                          aria-label="Retirar comentario"
                          title="Retirar comentario"
                        >
                          <EyeOff aria-hidden size={13} strokeWidth={1.8} />
                        </Button>
                      )}
                  </div>
                  <p className="comment-body">{c.body}</p>
                </li>
              ))}
            </ul>
          </div>

          <footer className="modal-foot">
            <div className="modal-social">
              {!joining && (
                <Button
                  variant="ghost"
                  className={`like-btn${liked ? " liked" : ""}`}
                  onClick={onLike}
                  disabled={pending}
                  aria-pressed={liked}
                  title="Me gusta"
                >
                  <Heart
                    aria-hidden
                    size={16}
                    strokeWidth={1.8}
                    fill={liked ? "currentColor" : "none"}
                  />
                  {likes}
                </Button>
              )}
              <span className="social-count">
                {comments === null
                  ? "…"
                  : comments.length === 1
                    ? "1 comentario"
                    : `${comments.length} comentarios`}
              </span>
            </div>

            {error && <p className="admin-error">{error}</p>}

            {/* El visitante usa la barra de comentar como todo el mundo, y el
                aviso aparece cuando la usa —no ocupando el pie desde el
                principio—. Mientras está el aviso, los botones sobran: lo que
                toca hacer es entrar. */}
            {joining ? (
              <div className="join-cta">
                <p className="join-cta-title">
                  ¿Quieres comentar esta foto o darle a me gusta?
                </p>
                <p className="join-cta-body">
                  Hazte una cuenta y podrás comentar las fotos y marcar las que
                  te gusten. Es gratis y solo necesitas tu correo. No hay que
                  recordar ninguna contraseña.
                </p>
                <Link href="/entrar" className="join-cta-link">
                  Crear mi cuenta
                </Link>
              </div>
            ) : (
              <form className="comment-form" onSubmit={onComment}>
                <Textarea
                  ref={draftRef}
                  rows={1}
                  value={draft}
                  maxLength={2000}
                  readOnly={!viewer}
                  placeholder="¿Reconoces el sitio? ¿Sabes algo de esta foto?"
                  onChange={(e) => setDraft(e.target.value)}
                  onFocus={askToJoin}
                />
                <Button
                  type="submit"
                  variant="ghost"
                  className="save-btn"
                  disabled={pending || (!!viewer && !draft.trim())}
                >
                  Comentar
                </Button>
              </form>
            )}
          </footer>
        </div>
      </div>
    </div>
  );
}
