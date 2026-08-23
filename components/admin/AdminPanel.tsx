"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  Circle,
  Eye,
  EyeOff,
  ImageIcon,
  Plus,
  Save,
  Trash2,
  Type,
  Users,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
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

/** «todos»: el filtro de personas apagado, sin rol elegido. */
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
  // colaborador. Con todo al día, las publicadas.
  const [photoFilter, setPhotoFilter] = useState<PhotoStatus>(
    pending.length > 0 ? "pending" : "published"
  );
  const [peopleFilter, setPeopleFilter] = useState<PeopleFilter>("todos");
  const [draft, setDraft] = useState<Draft | null>(null);
  // Copia del borrador tal como se abrió: lo que permite saber si hay cambios
  // que guardar y, por tanto, si el botón de guardar tiene algo que hacer.
  const [pristine, setPristine] = useState<Draft | null>(null);
  const [siteDraft, setSiteDraft] = useState(site);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, startTransition] = useTransition();

  const tabs: {
    id: Tab;
    label: string;
    icon: LucideIcon;
    count?: number;
    badge?: number;
  }[] = [
    {
      id: "fotos",
      label: "Fotografías",
      icon: ImageIcon,
      count: photos.length,
      badge: pending.length,
    },
    ...(admin
      ? ([
          { id: "textos", label: "Textos", icon: Type },
          {
            id: "personas",
            label: "Personas",
            icon: Users,
            count: profiles.length,
          },
        ] as const)
      : []),
  ];

  const tabsRef = useRef<HTMLDivElement>(null);
  // La pastilla activa se dibuja una sola vez y viaja entre pestañas: hay que
  // medir el botón elegido porque cada etiqueta tiene un ancho distinto.
  const [marker, setMarker] = useState<{ left: number; width: number } | null>(
    null
  );

  useLayoutEffect(() => {
    const nav = tabsRef.current;
    if (!nav) return;
    const measure = () => {
      const active = nav.querySelector<HTMLElement>('[data-tab-active="true"]');
      if (active)
        setMarker({ left: active.offsetLeft, width: active.offsetWidth });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(nav);
    return () => observer.disconnect();
  }, [tab, tabs.length]);

  /** Flechas entre pestañas, como espera un tablist. */
  const onTabKeyDown = (event: React.KeyboardEvent) => {
    const step =
      event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    const index = tabs.findIndex((t) => t.id === tab);
    const next = tabs[(index + step + tabs.length) % tabs.length];
    setTab(next.id);
    tabsRef.current
      ?.querySelectorAll<HTMLElement>("[role=tab]")
      [tabs.indexOf(next)]?.focus();
  };

  const visiblePhotos = photos.filter((p) => p.status === photoFilter);

  const visibleProfiles =
    peopleFilter === "todos"
      ? profiles
      : profiles.filter((p) => p.role === peopleFilter);

  /** Abre una fotografía en el formulario y fija su punto de partida. */
  const openDraft = (next: Draft) => {
    setDraft(next);
    setPristine(next);
  };

  const closeDraft = () => {
    setDraft(null);
    setPristine(null);
  };

  const draftDirty =
    !!draft && JSON.stringify(draft) !== JSON.stringify(pristine);

  const siteDirty = (
    Object.keys(site) as (keyof SiteContent)[]
  ).some((k) => siteDraft[k] !== site[k]);

  // Los datos llegan del servidor: tras refrescar hay que soltar el borrador
  // de textos para no quedarse con el valor viejo marcado como sucio.
  useEffect(() => setSiteDraft(site), [site]);

  useEffect(() => {
    if (!draftDirty && !siteDirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [draftDirty, siteDirty]);

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
      if (res.ok) closeDraft();
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
      if (res.ok && draft?.id === photo.id) closeDraft();
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
        onClick={() => openDraft(toDraft(p))}
      >
        <span className="thumb">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {p.image && <img src={p.image} alt="" />}
        </span>
        <span className="photo-row-text">
          <span className="photo-row-title">
            {p.featured && (
              <span className="row-featured" title="Hito relevante">
                <Circle aria-hidden size={7} fill="currentColor" stroke="none" />
              </span>
            )}
            {p.title || "(sin título)"}
          </span>
          <span className="photo-row-meta">
            <span className={`status-dot ${p.status}`} aria-hidden />
            {p.dateLabel || defaultDateLabel(p)}
            {p.authorName && (
              <span className="photo-row-author">· {p.authorName}</span>
            )}
          </span>
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
        <div className="admin-header-left">
          <Link href="/" className="back-link">
            <ArrowLeft aria-hidden size={14} strokeWidth={1.8} /> Volver al mapa
          </Link>
          <h1>Panel de control</h1>
        </div>

        <nav
          className="admin-tabs"
          role="tablist"
          ref={tabsRef}
          onKeyDown={onTabKeyDown}
        >
          {marker && (
            <span
              aria-hidden
              className="admin-tabs-marker"
              style={{ transform: `translateX(${marker.left}px)`, width: marker.width }}
            />
          )}
          {tabs.map(({ id, label, icon: Icon, count, badge }) => (
            <Button
              key={id}
              variant="ghost"
              role="tab"
              tabIndex={tab === id ? 0 : -1}
              aria-selected={tab === id}
              data-tab-active={tab === id}
              className={tab === id ? "active" : ""}
              onClick={() => setTab(id)}
            >
              <Icon aria-hidden size={14} strokeWidth={1.8} />
              {label}
              {count !== undefined && <span className="tab-count">{count}</span>}
              {badge !== undefined && badge > 0 && (
                <span className="tab-badge" title="Pendientes de revisar">
                  {badge}
                </span>
              )}
            </Button>
          ))}
        </nav>

        <div className="admin-actions">
          {saved && (
            <span className="saved-note">
              Guardado <Check aria-hidden size={13} strokeWidth={2} />
            </span>
          )}
          <UserMenu viewer={viewer} />
        </div>
      </header>

      {error && <p className="admin-error">{error}</p>}

      {tab === "fotos" && (
        <div className="photos-layout">
          <aside className="photos-list-pane">
            <Button
              variant="ghost"
              className="add-btn"
              onClick={() => openDraft({ ...emptyDraft(), status: "published" })}
            >
              <Plus aria-hidden size={13} strokeWidth={2} /> Añadir fotografía
            </Button>

            <div className="filter-row" role="group" aria-label="Filtrar por estado">
              {PHOTO_FILTERS.map((status) => (
                <Button
                  key={status}
                  variant="ghost"
                  className={`filter-chip filter-chip-${status}${
                    photoFilter === status ? " active" : ""
                  }`}
                  aria-pressed={photoFilter === status}
                  onClick={() => setPhotoFilter(status)}
                >
                  {STATUS_LABELS_PLURAL[status]}
                  <span className="filter-count">
                    {photos.filter((p) => p.status === status).length}
                  </span>
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
                    {/* Publicar y despublicar son el mismo interruptor: dice en
                        qué estado está y al pulsarlo lo cambia. */}
                    {draft.id && (
                      <Button
                        variant="ghost"
                        className={`form-action publish-toggle${
                          draft.status === "published" ? " on" : ""
                        }`}
                        role="switch"
                        aria-checked={draft.status === "published"}
                        disabled={busy}
                        title={
                          draft.status === "published"
                            ? "Quitar del mapa sin borrarla"
                            : "Mostrarla en el mapa"
                        }
                        onClick={() =>
                          run(() =>
                            setPhotoStatus(
                              draft.id!,
                              draft.status === "published"
                                ? "pending"
                                : "published"
                            )
                          )
                        }
                      >
                        {draft.status === "published" ? (
                          <Eye aria-hidden size={15} strokeWidth={1.8} />
                        ) : (
                          <EyeOff aria-hidden size={15} strokeWidth={1.8} />
                        )}
                        {draft.status === "published" ? "Publicada" : "Oculta"}
                      </Button>
                    )}
                    {/* Sin cambios no hay nada que guardar: el botón sobra. */}
                    {draftDirty && (
                      <Button
                        variant="ghost"
                        className="form-action save-btn"
                        onClick={savePhotoDraft}
                        disabled={busy}
                      >
                        <Save aria-hidden size={15} strokeWidth={1.8} />
                        {busy ? "Guardando…" : "Guardar"}
                      </Button>
                    )}
                  </div>
                </div>

                <div className="photo-form-body">
                  <PhotoFields
                    key={draft.id ?? "nueva"}
                    draft={draft}
                    onChange={setDraft}
                    canFeature
                  />

                  {draft.id && admin && (
                    <section className="danger-zone">
                      <h3>Zona de peligro</h3>
                      <div className="danger-zone-row">
                        <p className="hint">
                          Elimina la fotografía y su información. No se puede
                          deshacer.
                        </p>
                        <Button
                          variant="ghost"
                          className="form-action delete-btn"
                          disabled={busy}
                          onClick={() => {
                            const p = photos.find((x) => x.id === draft.id);
                            if (p) remove(p);
                          }}
                        >
                          <Trash2 aria-hidden size={15} strokeWidth={1.8} />
                          Eliminar fotografía
                        </Button>
                      </div>
                    </section>
                  )}
                </div>
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
            {siteDirty && (
              <Button
                variant="ghost"
                className="form-action save-btn"
                disabled={busy}
                onClick={() => run(() => saveSiteContent(siteDraft))}
              >
                <Save aria-hidden size={15} strokeWidth={1.8} />
                {busy ? "Guardando…" : "Guardar cambios"}
              </Button>
            )}
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
