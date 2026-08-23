"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Circle, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import PhotoFields, {
  emptyDraft,
  toDraft,
  type Draft,
} from "@/components/PhotoEditor";
import {
  deletePhoto,
  savePhoto,
  saveSiteContent,
  setPhotoStatus,
  setRole,
} from "@/app/actions/photos";
import { defaultDateLabel } from "@/lib/photos";
import {
  ROLE_LABELS,
  STATUS_LABELS,
  isAdmin,
  type Photo,
  type PhotoStatus,
  type Profile,
  type Role,
  type SiteContent,
  type Viewer,
} from "@/lib/types";
import "./admin.css";

type Tab = "pendientes" | "fotos" | "textos" | "personas";

const ROLES: Role[] = ["usuario", "colaborador", "admin"];

export default function AdminPanel({
  viewer,
  photos,
  site,
  profiles,
}: {
  viewer: Viewer;
  photos: Photo[];
  site: SiteContent;
  profiles: Profile[];
}) {
  const router = useRouter();
  const admin = isAdmin(viewer);

  const pending = photos.filter((p) => p.status === "pending");
  const rest = photos.filter((p) => p.status !== "pending");

  const [tab, setTab] = useState<Tab>(
    pending.length > 0 ? "pendientes" : "fotos"
  );
  const [draft, setDraft] = useState<Draft | null>(null);
  const [siteDraft, setSiteDraft] = useState(site);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, startTransition] = useTransition();

  const siteDirty =
    siteDraft.title !== site.title ||
    siteDraft.subtitle !== site.subtitle ||
    siteDraft.metaTitle !== site.metaTitle ||
    siteDraft.metaDescription !== site.metaDescription;

  // Los datos llegan del servidor: tras refrescar hay que soltar el borrador
  // de textos para no quedarse con el valor viejo marcado como sucio.
  useEffect(() => setSiteDraft(site), [site]);

  useEffect(() => {
    if (!draft && !siteDirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [draft, siteDirty]);

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) => {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) return setError(res.error ?? "No se pudo guardar.");
      setSaved(true);
      router.refresh();
    });
  };

  const savePhotoDraft = () => {
    if (!draft) return;
    run(async () => {
      const res = await savePhoto(draft);
      if (res.ok) setDraft(null);
      return res;
    });
  };

  const moderate = (photo: Photo, status: PhotoStatus) => {
    const note =
      status === "rejected"
        ? (prompt(`Motivo del rechazo de «${photo.title}» (opcional):`) ?? "")
        : "";
    run(() => setPhotoStatus(photo.id, status, note));
  };

  const remove = (photo: Photo) => {
    if (!confirm(`¿Eliminar «${photo.title}»? No se puede deshacer.`)) return;
    run(async () => {
      const res = await deletePhoto(photo.id);
      if (res.ok && draft?.id === photo.id) setDraft(null);
      return res;
    });
  };

  const photoRow = (p: Photo, extra?: React.ReactNode) => (
    <li key={p.id}>
      <Button
        variant="ghost"
        className={`photo-row${draft?.id === p.id ? " selected" : ""}`}
        onClick={() => setDraft(toDraft(p))}
      >
        <span className="thumb">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {p.image && <img src={p.image} alt="" />}
        </span>
        <span className="photo-row-text">
          <span className="photo-row-title">{p.title || "(sin título)"}</span>
          <span className="photo-row-date">
            {p.featured && (
              <span className="row-featured" title="Hito relevante">
                <Circle aria-hidden size={8} fill="currentColor" stroke="none" />
              </span>
            )}
            <span className={`status-tag ${p.status}`}>
              {STATUS_LABELS[p.status]}
            </span>
            {p.dateLabel || defaultDateLabel(p)}
          </span>
          {p.authorName && (
            <span className="hint">Aportada por {p.authorName}</span>
          )}
        </span>
      </Button>
      {extra}
    </li>
  );

  return (
    <main className="admin">
      <header className="admin-header">
        <div>
          <Link href="/" className="back-link">
            <ArrowLeft aria-hidden size={14} strokeWidth={1.8} /> Volver al mapa
          </Link>
          <h1>Piedrahíta · Panel</h1>
        </div>
        <div className="admin-actions">
          {saved && (
            <span className="saved-note">
              Guardado <Check aria-hidden size={13} strokeWidth={2} />
            </span>
          )}
          <span className="user-role">{viewer?.displayName}</span>
        </div>
      </header>

      <nav className="admin-tabs" role="tablist">
        <Button
          variant="ghost"
          role="tab"
          aria-selected={tab === "pendientes"}
          className={tab === "pendientes" ? "active" : ""}
          onClick={() => setTab("pendientes")}
        >
          Pendientes ({pending.length})
        </Button>
        <Button
          variant="ghost"
          role="tab"
          aria-selected={tab === "fotos"}
          className={tab === "fotos" ? "active" : ""}
          onClick={() => setTab("fotos")}
        >
          Fotografías ({rest.length})
        </Button>
        {admin && (
          <Button
            variant="ghost"
            role="tab"
            aria-selected={tab === "textos"}
            className={tab === "textos" ? "active" : ""}
            onClick={() => setTab("textos")}
          >
            Textos
          </Button>
        )}
        {admin && (
          <Button
            variant="ghost"
            role="tab"
            aria-selected={tab === "personas"}
            className={tab === "personas" ? "active" : ""}
            onClick={() => setTab("personas")}
          >
            Personas ({profiles.length})
          </Button>
        )}
      </nav>

      {error && <p className="admin-error">{error}</p>}

      {(tab === "pendientes" || tab === "fotos") && (
        <div className="photos-layout">
          <aside className="photos-list-pane">
            {tab === "fotos" && (
              <Button
                variant="ghost"
                className="add-btn"
                onClick={() => setDraft({ ...emptyDraft(), status: "published" })}
              >
                <Plus aria-hidden size={13} strokeWidth={2} /> Añadir fotografía
              </Button>
            )}

            {tab === "pendientes" && pending.length === 0 && (
              <p className="hint pane-note">Nada por revisar. Todo al día.</p>
            )}

            <ul className="photo-list">
              {(tab === "pendientes" ? pending : rest).map((p) =>
                photoRow(
                  p,
                  tab === "pendientes" ? (
                    <span className="row-actions">
                      <Button
                        variant="ghost"
                        className="approve-btn"
                        title="Aprobar y publicar"
                        aria-label="Aprobar"
                        disabled={busy}
                        onClick={() => moderate(p, "published")}
                      >
                        <Check aria-hidden size={14} strokeWidth={2} />
                      </Button>
                      <Button
                        variant="ghost"
                        className="reject-btn"
                        title="Rechazar"
                        aria-label="Rechazar"
                        disabled={busy}
                        onClick={() => moderate(p, "rejected")}
                      >
                        <X aria-hidden size={14} strokeWidth={2} />
                      </Button>
                    </span>
                  ) : null
                )
              )}
            </ul>
          </aside>

          <section className="photo-detail-pane">
            {draft ? (
              <div className="photo-form">
                <div className="photo-form-head">
                  <h2>{draft.title || "Nueva fotografía"}</h2>
                  <div className="admin-actions">
                    {draft.id && draft.status === "published" && (
                      <Button
                        variant="ghost"
                        disabled={busy}
                        title="Quitar del mapa sin borrarla"
                        onClick={() =>
                          run(() => setPhotoStatus(draft.id!, "pending"))
                        }
                      >
                        Despublicar
                      </Button>
                    )}
                    {draft.id && draft.status !== "published" && (
                      <Button
                        variant="ghost"
                        className="approve-btn"
                        disabled={busy}
                        onClick={() =>
                          run(() => setPhotoStatus(draft.id!, "published"))
                        }
                      >
                        Publicar
                      </Button>
                    )}
                    {draft.id && admin && (
                      <Button
                        variant="ghost"
                        className="delete-btn"
                        disabled={busy}
                        onClick={() => {
                          const p = photos.find((x) => x.id === draft.id);
                          if (p) remove(p);
                        }}
                      >
                        Eliminar
                      </Button>
                    )}
                    <Button variant="ghost" onClick={() => setDraft(null)}>
                      Cerrar
                    </Button>
                    <Button
                      variant="ghost"
                      className="save-btn"
                      onClick={savePhotoDraft}
                      disabled={busy}
                    >
                      {busy ? "Guardando…" : "Guardar"}
                    </Button>
                  </div>
                </div>

                <PhotoFields
                  key={draft.id ?? "nueva"}
                  draft={draft}
                  onChange={setDraft}
                  canFeature
                />
              </div>
            ) : (
              <p className="empty-detail">
                Selecciona una fotografía de la lista para editarla.
              </p>
            )}
          </section>
        </div>
      )}

      {tab === "textos" && admin && (
        <div className="pane text-pane">
          <div className="photo-form-head">
            <h2>Textos de la web</h2>
            <Button
              variant="ghost"
              className="save-btn"
              disabled={busy || !siteDirty}
              onClick={() => run(() => saveSiteContent(siteDraft))}
            >
              {busy ? "Guardando…" : "Guardar cambios"}
            </Button>
          </div>
          <div className="field-row">
            <label>
              Título
              <Input
                type="text"
                value={siteDraft.title}
                onChange={(e) =>
                  setSiteDraft({ ...siteDraft, title: e.target.value })
                }
              />
            </label>
            <label>
              Subtítulo
              <Input
                type="text"
                value={siteDraft.subtitle}
                onChange={(e) =>
                  setSiteDraft({ ...siteDraft, subtitle: e.target.value })
                }
              />
            </label>
          </div>
          <div className="field-row">
            <label>
              Título de la pestaña (SEO)
              <Input
                type="text"
                value={siteDraft.metaTitle}
                onChange={(e) =>
                  setSiteDraft({ ...siteDraft, metaTitle: e.target.value })
                }
              />
            </label>
            <label>
              Descripción (SEO)
              <Input
                type="text"
                value={siteDraft.metaDescription}
                onChange={(e) =>
                  setSiteDraft({
                    ...siteDraft,
                    metaDescription: e.target.value,
                  })
                }
              />
            </label>
          </div>
        </div>
      )}

      {tab === "personas" && admin && (
        <div className="pane">
          <h2>Personas</h2>
          <p className="hint pane-note">
            Un <strong>colaborador</strong> publica fotos y textos y aprueba lo
            que envían los demás. Un <strong>usuario registrado</strong> puede
            enviar fotos —quedan pendientes—, dar me gusta y comentar.
          </p>
          <ul className="people-list">
            {profiles.map((p) => (
              <li key={p.id}>
                <span className="person-name">
                  {p.display_name || "(sin nombre)"}
                  {p.id === viewer?.id && <span className="hint"> · tú</span>}
                </span>
                <span className="person-roles">
                  {ROLES.map((role) => (
                    <Button
                      key={role}
                      variant="ghost"
                      className={`role-btn${p.role === role ? " active" : ""}`}
                      disabled={busy || p.id === viewer?.id}
                      onClick={() => run(() => setRole(p.id, role))}
                      title={
                        p.id === viewer?.id
                          ? "No puedes cambiar tu propio rol"
                          : `Hacer ${ROLE_LABELS[role].toLowerCase()}`
                      }
                    >
                      {ROLE_LABELS[role]}
                    </Button>
                  ))}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </main>
  );
}
