"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Camera,
  Check,
  EyeOff,
  Heart,
  ImageIcon,
  MessageSquare,
  Pencil,
  Save,
  Trash2,
  X,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { saveProfile } from "@/app/actions/profile";
import { setPhotoStatus } from "@/app/actions/photos";
import { setCommentStatus, toggleLike } from "@/app/actions/social";
import { defaultDateLabel, avatarUrl } from "@/lib/photos";
import { ACCEPTED_AVATAR_EXT, uploadAvatarImage } from "@/lib/upload";
import {
  BIO_MAX,
  ROLE_LABELS,
  STATUS_LABELS,
  type Comment,
  type Photo,
  type Viewer,
} from "@/lib/types";

export default function ProfileForm({
  viewer,
  photos,
  comments,
  likedPhotos,
}: {
  viewer: NonNullable<Viewer>;
  photos: Photo[];
  comments: Comment[];
  likedPhotos: Photo[];
}) {
  const router = useRouter();
  const [busy, startHistoryTransition] = useTransition();
  const [likes, setLikes] = useState(likedPhotos);
  const [displayName, setDisplayName] = useState(viewer.displayName);
  const [bio, setBio] = useState(viewer.bio);
  const [avatarPath, setAvatarPath] = useState(viewer.avatarPath);
  // Por defecto se enseña el perfil como texto; los campos solo aparecen
  // al pulsar «Editar», para que la página se lea como una ficha y no
  // como un formulario a medio rellenar.
  const [editing, setEditing] = useState(false);
  // Vista previa local mientras sube, para no esperar a Storage
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  const dirty =
    displayName !== viewer.displayName ||
    bio !== viewer.bio ||
    avatarPath !== viewer.avatarPath;

  const upload = async (file: File) => {
    setUploading(true);
    setError(null);
    setSaved(false);
    const local = URL.createObjectURL(file);
    setPreview(local);

    const res = await uploadAvatarImage(file);
    setUploading(false);
    setPreview(null);
    URL.revokeObjectURL(local);
    if ("error" in res) return setError(res.error);
    setAvatarPath(res.path);
  };

  const submit = () => {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const res = await saveProfile({ displayName, bio, avatarPath });
      if (!res.ok) return setError(res.error);
      setSaved(true);
      setEditing(false);
      router.refresh();
    });
  };

  const discard = () => {
    setDisplayName(viewer.displayName);
    setBio(viewer.bio);
    setAvatarPath(viewer.avatarPath);
    setError(null);
    setSaved(false);
  };

  const startEdit = () => {
    setSaved(false);
    setEditing(true);
  };

  const cancelEdit = () => {
    discard();
    setEditing(false);
  };

  const shown = preview ?? avatarUrl(avatarPath);

  const retractPhoto = (photo: Photo) => {
    if (!confirm(`¿Retirar «${photo.title}»? Deja de estar pendiente de revisión.`))
      return;
    startHistoryTransition(async () => {
      await setPhotoStatus(photo.id, "rejected");
      router.refresh();
    });
  };

  const retractComment = (comment: Comment) => {
    if (!confirm("¿Retirar este comentario?")) return;
    startHistoryTransition(async () => {
      await setCommentStatus(comment.id, "rejected");
      router.refresh();
    });
  };

  const unlike = (photo: Photo) => {
    setLikes((prev) => prev.filter((p) => p.id !== photo.id));
    startHistoryTransition(async () => {
      const res = await toggleLike(photo.id);
      if (!res.ok || res.liked) router.refresh();
    });
  };

  return (
    <main className="admin profile-page">
      <header className="admin-header">
        <div>
          <Link href="/" className="back-link">
            <ArrowLeft aria-hidden size={14} strokeWidth={1.8} /> Volver al mapa
          </Link>
          <h1>Tu perfil</h1>
        </div>
        <div className="admin-actions">
          {saved && !editing && (
            <span className="saved-note">
              Guardado
              <Check aria-hidden size={13} strokeWidth={2} />
            </span>
          )}
          {/* Fuera de edición no hay nada que guardar ni que deshacer: los
              botones solo asoman mientras el formulario está abierto. */}
          {editing && (
            <>
              <Button
                variant="ghost"
                className="discard-btn"
                onClick={cancelEdit}
                disabled={pending || uploading}
              >
                Cancelar
              </Button>
              <Button
                variant="ghost"
                className="form-action save-btn"
                onClick={submit}
                disabled={pending || uploading || !dirty}
              >
                <Save aria-hidden size={15} strokeWidth={1.8} />
                {pending ? "Guardando…" : "Guardar cambios"}
              </Button>
            </>
          )}
        </div>
      </header>

      <div className="pane">
        {error && <p className="admin-error">{error}</p>}

        <h2 className="section-heading">Datos personales</h2>

        {/* Una sola tarjeta: la foto, el nombre y la presentación son partes
            del mismo perfil, no pasos separados. Por defecto se lee como una
            ficha; «Editar» es lo único que hace falta pulsar para que los
            mismos huecos se vuelvan campos. */}
        <section className="profile-card">
          {editing ? (
            <div className="profile-identity">
              <label className="avatar-upload">
                <div className="avatar-box">
                  {shown ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={shown} alt={displayName} />
                  ) : (
                    <User aria-hidden size={40} strokeWidth={1.2} />
                  )}
                  <span className="avatar-overlay">
                    <Camera aria-hidden size={18} strokeWidth={1.8} />
                    {uploading ? "Subiendo…" : "Cambiar"}
                  </span>
                </div>
                <Input
                  type="file"
                  accept={ACCEPTED_AVATAR_EXT}
                  hidden
                  disabled={uploading}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) upload(f);
                    e.target.value = "";
                  }}
                />
              </label>
              {avatarPath && (
                <Button
                  variant="ghost"
                  className="avatar-remove"
                  onClick={() => {
                    setAvatarPath("");
                    setSaved(false);
                  }}
                >
                  <Trash2 aria-hidden size={12} strokeWidth={1.8} /> Quitar foto
                </Button>
              )}

              <div className="profile-identity-fields">
                <span className="role-pill">{ROLE_LABELS[viewer.role]}</span>
                <label>
                  Nombre
                  <Input
                    type="text"
                    value={displayName}
                    maxLength={60}
                    onChange={(e) => {
                      setDisplayName(e.target.value);
                      setSaved(false);
                    }}
                  />
                  <span className="hint">
                    Como quieres que te vean los demás: tu nombre, un apodo o
                    la casa de la que vienes. Firma las fotografías que envías
                    y los comentarios que escribes.
                  </span>
                </label>

                <label>
                  Sobre mí
                  <Textarea
                    rows={6}
                    value={bio}
                    maxLength={BIO_MAX}
                    onChange={(e) => {
                      setBio(e.target.value);
                      setSaved(false);
                    }}
                  />
                  <span className="hint">
                    <span>
                      Tu relación con Piedrahíta, lo que aportas al archivo…
                    </span>
                    <span className="char-count">
                      {bio.length}/{BIO_MAX}
                    </span>
                  </span>
                </label>
              </div>
            </div>
          ) : (
            <div className="profile-identity">
              <div className="avatar-box">
                {shown ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={shown} alt={displayName} />
                ) : (
                  <User aria-hidden size={40} strokeWidth={1.2} />
                )}
              </div>

              <div className="profile-identity-fields">
                <span className="role-pill">{ROLE_LABELS[viewer.role]}</span>
                <div className="profile-view-head">
                  <h3 className="profile-name">
                    {displayName || "(sin nombre)"}
                  </h3>
                  <Button
                    variant="ghost"
                    className="edit-profile-btn"
                    onClick={startEdit}
                  >
                    <Pencil aria-hidden size={13} strokeWidth={1.8} /> Editar
                  </Button>
                </div>
                {bio ? (
                  <p className="profile-bio">{bio}</p>
                ) : (
                  <p className="hint">Todavía no has escrito nada sobre ti.</p>
                )}
              </div>
            </div>
          )}
        </section>

        <h2 className="section-heading">Tu actividad</h2>

        <div className="history-columns">
          <section>
            <h3>
              <ImageIcon aria-hidden size={14} strokeWidth={1.8} />
              Tus fotografías
              <span className="section-count">{photos.length}</span>
            </h3>
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
                        <span className="photo-row-title">
                          {p.title || "(sin título)"}
                        </span>
                        <span className="photo-row-meta">
                          <span className={`status-dot ${p.status}`} aria-hidden />
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
                          onClick={() => retractPhoto(p)}
                        >
                          <EyeOff aria-hidden size={14} strokeWidth={1.8} />
                        </Button>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h3>
              <MessageSquare aria-hidden size={14} strokeWidth={1.8} />
              Tus comentarios
              <span className="section-count">{comments.length}</span>
            </h3>
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
                      {c.status !== "rejected" && (
                        <Button
                          variant="ghost"
                          className="reject-btn"
                          title="Retirar"
                          aria-label="Retirar"
                          disabled={busy}
                          onClick={() => retractComment(c)}
                        >
                          <X aria-hidden size={14} strokeWidth={1.8} />
                        </Button>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h3>
              <Heart aria-hidden size={14} strokeWidth={1.8} />
              Tus me gusta
              <span className="section-count">{likes.length}</span>
            </h3>
            {likes.length === 0 ? (
              <p className="hint pane-note">Aún no has dado me gusta a ninguna fotografía.</p>
            ) : (
              <ul className="photo-list">
                {likes.map((p) => (
                  <li key={p.id}>
                    <div className="photo-row">
                      <span className="thumb">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        {p.image && <img src={p.image} alt="" />}
                      </span>
                      <span className="photo-row-text">
                        <span className="photo-row-title">
                          {p.title || "(sin título)"}
                        </span>
                        <span className="photo-row-meta">
                          {p.dateLabel || defaultDateLabel(p)}
                        </span>
                      </span>
                    </div>
                    <span className="row-actions">
                      <Button
                        variant="ghost"
                        className="reject-btn"
                        title="Quitar me gusta"
                        aria-label="Quitar me gusta"
                        disabled={busy}
                        onClick={() => unlike(p)}
                      >
                        <Heart aria-hidden size={14} strokeWidth={1.8} fill="currentColor" />
                      </Button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
