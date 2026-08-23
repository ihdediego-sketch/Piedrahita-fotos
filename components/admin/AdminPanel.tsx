"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Circle, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import UserMenu from "@/components/UserMenu";
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
import { avatarUrl, defaultDateLabel } from "@/lib/photos";
import {
  ROLE_LABELS,
  ROLE_LABELS_PLURAL,
  SITE_TEXT_GROUPS,
  STATUS_LABELS,
  STATUS_LABELS_PLURAL,
  isAdmin,
  type Photo,
  type PhotoStatus,
  type Profile,
  type Role,
  type SiteContent,
  type Viewer,
} from "@/lib/types";
import "./admin.css";

type Tab = "fotos" | "textos" | "personas";

/** «todas» / «todos»: el filtro apagado, sin estado ni rol elegido. */
type PhotoFilter = PhotoStatus | "todas";
type PeopleFilter = Role | "todos";

const ROLES: Role[] = ["usuario", "colaborador", "admin"];
const PHOTO_FILTERS: PhotoStatus[] = ["published", "pending", "rejected"];

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

  const [tab, setTab] = useState<Tab>("fotos");
  // Si hay cola de revisión se abre por ella: es lo que trae aquí a un
  // colaborador. Con todo al día, la lista entera.
  const [photoFilter, setPhotoFilter] = useState<PhotoFilter>(
    pending.length > 0 ? "pending" : "todas"
  );
  const [peopleFilter, setPeopleFilter] = useState<PeopleFilter>("todos");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [siteDraft, setSiteDraft] = useState(site);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, startTransition] = useTransition();

  const visiblePhotos =
    photoFilter === "todas"
      ? photos
      : photos.filter((p) => p.status === photoFilter);

  const visibleProfiles =
    peopleFilter === "todos"
      ? profiles
      : profiles.filter((p) => p.role === peopleFilter);

  const siteDirty = (
    Object.keys(site) as (keyof SiteContent)[]
  ).some((k) => siteDraft[k] !== site[k]);

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
        ? (prompt(`Motivo del descarte de «${photo.title}» (opcional):`) ?? "")
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

  /** Los botones de moderación de una fila, según lo que falte por hacer. */
  const rowActions = (p: Photo) => {
    if (p.status === "published") return null;
    return (
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
        {p.status === "pending" && (
          <Button
            variant="ghost"
            className="reject-btn"
            title="Descartar"
            aria-label="Descartar"
            disabled={busy}
            onClick={() => moderate(p, "rejected")}
          >
            <X aria-hidden size={14} strokeWidth={2} />
          </Button>
        )}
      </span>
    );
  };

  const photoRow = (p: Photo) => (
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
      {rowActions(p)}
    </li>
  );

  const emptyNote =
    photoFilter === "pending"
      ? "Nada por revisar. Todo al día."
      : "No hay fotografías con este filtro.";

  return (
    <main className="admin">
      <header className="admin-header">
        <div>
          <Link href="/" className="back-link">
            <ArrowLeft aria-hidden size={14} strokeWidth={1.8} /> Volver al mapa
          </Link>
          <h1>Panel de control</h1>
        </div>
        <div className="admin-actions">
          {saved && (
            <span className="saved-note">
              Guardado <Check aria-hidden size={13} strokeWidth={2} />
            </span>
          )}
          <UserMenu viewer={viewer} />
        </div>
      </header>

      <nav className="admin-tabs" role="tablist">
        <Button
          variant="ghost"
          role="tab"
          aria-selected={tab === "fotos"}
          className={tab === "fotos" ? "active" : ""}
          onClick={() => setTab("fotos")}
        >
          Fotografías ({photos.length})
          {pending.length > 0 && (
            <span className="tab-badge" title="Pendientes de revisar">
              {pending.length}
            </span>
          )}
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

      {tab === "fotos" && (
        <div className="photos-layout">
          <aside className="photos-list-pane">
            <Button
              variant="ghost"
              className="add-btn"
              onClick={() => setDraft({ ...emptyDraft(), status: "published" })}
            >
              <Plus aria-hidden size={13} strokeWidth={2} /> Añadir fotografía
            </Button>

            <div className="filter-row" role="group" aria-label="Filtrar por estado">
              <Button
                variant="ghost"
                className={`filter-chip${photoFilter === "todas" ? " active" : ""}`}
                aria-pressed={photoFilter === "todas"}
                onClick={() => setPhotoFilter("todas")}
              >
                Todas ({photos.length})
              </Button>
              {PHOTO_FILTERS.map((status) => (
                <Button
                  key={status}
                  variant="ghost"
                  className={`filter-chip${photoFilter === status ? " active" : ""}`}
                  aria-pressed={photoFilter === status}
                  onClick={() => setPhotoFilter(status)}
                >
                  {STATUS_LABELS_PLURAL[status]} (
                  {photos.filter((p) => p.status === status).length})
                </Button>
              ))}
            </div>

            {visiblePhotos.length === 0 && (
              <p className="hint pane-note">{emptyNote}</p>
            )}

            <ul className="photo-list">{visiblePhotos.map(photoRow)}</ul>
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

          {SITE_TEXT_GROUPS.map((group) => (
            <section key={group.title} className="text-group">
              <h3>{group.title}</h3>
              <p className="hint">{group.note}</p>
              <div className="field-row">
                {group.fields.map((field) => (
                  <label key={field.key}>
                    {field.label}
                    {field.long ? (
                      <Textarea
                        rows={3}
                        value={siteDraft[field.key]}
                        onChange={(e) =>
                          setSiteDraft({
                            ...siteDraft,
                            [field.key]: e.target.value,
                          })
                        }
                      />
                    ) : (
                      <Input
                        type="text"
                        value={siteDraft[field.key]}
                        onChange={(e) =>
                          setSiteDraft({
                            ...siteDraft,
                            [field.key]: e.target.value,
                          })
                        }
                      />
                    )}
                  </label>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {tab === "personas" && admin && (
        <div className="pane">
          <h2>Personas</h2>

          <div className="filter-row" role="group" aria-label="Filtrar por tipo">
            <Button
              variant="ghost"
              className={`filter-chip${peopleFilter === "todos" ? " active" : ""}`}
              aria-pressed={peopleFilter === "todos"}
              onClick={() => setPeopleFilter("todos")}
            >
              Todos ({profiles.length})
            </Button>
            {ROLES.map((role) => (
              <Button
                key={role}
                variant="ghost"
                className={`filter-chip${peopleFilter === role ? " active" : ""}`}
                aria-pressed={peopleFilter === role}
                onClick={() => setPeopleFilter(role)}
              >
                {ROLE_LABELS_PLURAL[role]} (
                {profiles.filter((p) => p.role === role).length})
              </Button>
            ))}
          </div>

          {visibleProfiles.length === 0 && (
            <p className="hint pane-note">No hay nadie con este tipo.</p>
          )}

          <ul className="people-list">
            {visibleProfiles.map((p) => (
              <li key={p.id}>
                <span className="person-id">
                  {avatarUrl(p.avatar_path) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      className="person-avatar"
                      src={avatarUrl(p.avatar_path)}
                      alt=""
                    />
                  ) : (
                    <span className="person-avatar person-initial" aria-hidden>
                      {(p.display_name || "?").trim().charAt(0).toUpperCase()}
                    </span>
                  )}
                  <span className="person-name">
                    {p.display_name || "(sin nombre)"}
                    {p.id === viewer?.id && <span className="hint"> · tú</span>}
                  </span>
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
