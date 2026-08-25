"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  Circle,
  Eye,
  EyeOff,
  ImageIcon,
  Map,
  MessageSquare,
  Plus,
  Save,
  Settings,
  Trash2,
  Users,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import UserMenu from "@/components/UserMenu";
import SegmentedFilter from "@/components/admin/SegmentedFilter";
import PhotoFields, {
  emptyDraft,
  toDraft,
  type Draft,
} from "@/components/PhotoEditor";
import HistoricalMapFields, {
  emptyDraft as emptyHmDraft,
  toDraft as toHmDraft,
  type Draft as HmDraft,
} from "@/components/HistoricalMapEditor";
import {
  savePhoto,
  saveSiteContent,
  setPhotoStatus,
  setRole,
} from "@/app/actions/photos";
import { setCommentStatus } from "@/app/actions/social";
import {
  deleteHistoricalMap,
  saveHistoricalMap,
  setHistoricalMapPublished,
} from "@/app/actions/historical-maps";
import { avatarUrl, defaultDateLabel } from "@/lib/photos";
import { useScrollBorder } from "@/lib/useScrollBorder";
import {
  ROLE_LABELS,
  ROLE_LABELS_PLURAL,
  SITE_TEXT_GROUPS,
  STATUS_LABELS_PLURAL,
  isAdmin,
  type Comment,
  type HistoricalMap,
  type Photo,
  type PhotoStatus,
  type Profile,
  type Role,
  type SiteContent,
  type Viewer,
} from "@/lib/types";
import "./admin.css";

type Tab = "fotos" | "mapas" | "comentarios" | "textos" | "personas";

/** «todos»: el filtro de personas apagado, sin rol elegido. */
type PeopleFilter = Role | "todos";

const ROLES: Role[] = ["usuario", "colaborador", "admin"];
const PHOTO_FILTERS: PhotoStatus[] = ["published", "pending", "rejected"];

export default function AdminPanel({
  viewer,
  photos,
  historicalMaps,
  comments,
  site,
  profiles,
}: {
  viewer: Viewer;
  photos: Photo[];
  historicalMaps: HistoricalMap[];
  comments: Comment[];
  site: SiteContent;
  profiles: Profile[];
}) {
  const router = useRouter();
  const admin = isAdmin(viewer);

  const pending = photos.filter((p) => p.status === "pending");
  const pendingComments = comments.filter((c) => c.status === "pending");

  const [tab, setTab] = useState<Tab>("fotos");
  const { scrolled, onScroll, reset: resetScrolled } = useScrollBorder();
  // Cada pestaña trae su propio scroll: al cambiar, la línea vuelve a
  // apagarse hasta que el contenido nuevo scrollee.
  useEffect(resetScrolled, [tab, resetScrolled]);
  // Si hay cola de revisión se abre por ella: es lo que trae aquí a un
  // colaborador. Con todo al día, las publicadas.
  const [photoFilter, setPhotoFilter] = useState<PhotoStatus>(
    pending.length > 0 ? "pending" : "published"
  );
  const [commentFilter, setCommentFilter] = useState<PhotoStatus>(
    pendingComments.length > 0 ? "pending" : "published"
  );
  const [peopleFilter, setPeopleFilter] = useState<PeopleFilter>("todos");
  const [draft, setDraft] = useState<Draft | null>(null);
  // Copia del borrador tal como se abrió: lo que permite saber si hay cambios
  // que guardar y, por tanto, si el botón de guardar tiene algo que hacer.
  const [pristine, setPristine] = useState<Draft | null>(null);
  const [hmDraft, setHmDraft] = useState<HmDraft | null>(null);
  const [hmPristine, setHmPristine] = useState<HmDraft | null>(null);
  const [siteDraft, setSiteDraft] = useState(site);
  const [error, setError] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();

  /** Sin cuentas ni cifras: la barra lateral es solo navegación, no un resumen. */
  const tabs: { id: Tab; label: string; icon: LucideIcon }[] = [
    { id: "fotos", label: "Fotos", icon: ImageIcon },
    { id: "comentarios", label: "Comentarios", icon: MessageSquare },
    ...(admin
      ? ([
          { id: "mapas", label: "Mapas", icon: Map },
          { id: "personas", label: "Usuarios", icon: Users },
          { id: "textos", label: "Config", icon: Settings },
        ] as const)
      : []),
  ];

  const tabsRef = useRef<HTMLDivElement>(null);

  /** Flechas arriba/abajo entre pestañas, como espera un tablist vertical. */
  const onTabKeyDown = (event: React.KeyboardEvent) => {
    const step =
      event.key === "ArrowDown" ? 1 : event.key === "ArrowUp" ? -1 : 0;
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
  const visibleComments = comments.filter((c) => c.status === commentFilter);

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

  /** Mismo patrón maestro-detalle que las fotos, para un mapa histórico. */
  const openHmDraft = (next: HmDraft) => {
    setHmDraft(next);
    setHmPristine(next);
  };

  const closeHmDraft = () => {
    setHmDraft(null);
    setHmPristine(null);
  };

  const hmDraftDirty =
    !!hmDraft && JSON.stringify(hmDraft) !== JSON.stringify(hmPristine);

  const siteDirty = (
    Object.keys(site) as (keyof SiteContent)[]
  ).some((k) => siteDraft[k] !== site[k]);

  // Los datos llegan del servidor: tras refrescar hay que soltar el borrador
  // de textos para no quedarse con el valor viejo marcado como sucio.
  useEffect(() => setSiteDraft(site), [site]);

  useEffect(() => {
    if (!draftDirty && !hmDraftDirty && !siteDirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [draftDirty, hmDraftDirty, siteDirty]);

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) => {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) return setError(res.error ?? "No se pudo guardar.");
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

  const saveHmDraft = () => {
    if (!hmDraft) return;
    run(async () => {
      const res = await saveHistoricalMap(hmDraft);
      if (res.ok) closeHmDraft();
      return res;
    });
  };

  const deleteHm = (m: HistoricalMap) => {
    if (!confirm(`¿Borrar «${m.title}» y su imagen? No se puede deshacer.`))
      return;
    run(async () => {
      const res = await deleteHistoricalMap(m.id);
      if (res.ok && hmDraft?.id === m.id) closeHmDraft();
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

  const moderateComment = (comment: Comment, status: PhotoStatus) => {
    const note =
      status === "rejected"
        ? (prompt(`Motivo del descarte del comentario de ${comment.authorName} (opcional):`) ?? "")
        : "";
    run(() => setCommentStatus(comment.id, status, note));
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

  const historicalMapRow = (m: HistoricalMap) => (
    <li key={m.id}>
      <Button
        variant="ghost"
        className={`photo-row${hmDraft?.id === m.id ? " selected" : ""}`}
        onClick={() => openHmDraft(toHmDraft(m))}
      >
        <span className="thumb">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {m.image && <img src={m.image} alt="" />}
        </span>
        <span className="photo-row-text">
          <span className="photo-row-title">{m.title || "(sin título)"}</span>
          <span className="photo-row-meta">
            <span
              className={`status-dot ${m.published ? "published" : "pending"}`}
              aria-hidden
            />
            {m.dateLabel || (m.published ? "Publicado" : "Sin publicar")}
          </span>
        </span>
      </Button>
      <span className="row-actions">
        <Button
          variant="ghost"
          className="reject-btn"
          title="Borrar"
          aria-label="Borrar"
          disabled={busy}
          onClick={() => deleteHm(m)}
        >
          <Trash2 aria-hidden size={14} strokeWidth={2} />
        </Button>
      </span>
    </li>
  );

  /** Los mismos botones de moderación que las fotos, para un comentario. */
  const commentRowActions = (c: Comment) => {
    return (
      <span className="row-actions">
        {c.status !== "published" && (
          <Button
            variant="ghost"
            className="approve-btn"
            title="Aprobar y publicar"
            aria-label="Aprobar"
            disabled={busy}
            onClick={() => moderateComment(c, "published")}
          >
            <Check aria-hidden size={14} strokeWidth={2} />
          </Button>
        )}
        {c.status !== "rejected" && (
          <Button
            variant="ghost"
            className="reject-btn"
            title="Desactivar"
            aria-label="Desactivar"
            disabled={busy}
            onClick={() => moderateComment(c, "rejected")}
          >
            <X aria-hidden size={14} strokeWidth={2} />
          </Button>
        )}
      </span>
    );
  };

  const commentRow = (c: Comment) => (
    <li key={c.id}>
      <div className="photo-row comment-row">
        <span className="photo-row-text">
          <span className="photo-row-title">
            {c.photoTitle || "(sin foto)"}
          </span>
          <span className="photo-row-meta">
            <span className={`status-dot ${c.status}`} aria-hidden />
            {c.authorName}
            <span className="photo-row-author">
              · {new Date(c.createdAt).toLocaleDateString("es-ES")}
            </span>
          </span>
          <span className="comment-row-body">{c.body}</span>
        </span>
      </div>
      {commentRowActions(c)}
    </li>
  );

  const emptyNote =
    photoFilter === "pending"
      ? "Nada por revisar. Todo al día."
      : "No hay fotografías con este filtro.";

  const emptyCommentNote =
    commentFilter === "pending"
      ? "Nada por revisar. Todo al día."
      : "No hay comentarios con este filtro.";

  return (
    <main className="admin admin-with-sidebar">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-head">
          <Link href="/" className="back-link">
            <ArrowLeft aria-hidden size={14} strokeWidth={1.8} /> Volver al mapa
          </Link>
          <h1>Admin</h1>
        </div>

        <nav
          className="admin-side-nav"
          role="tablist"
          aria-orientation="vertical"
          ref={tabsRef}
          onKeyDown={onTabKeyDown}
        >
          {tabs.map(({ id, label, icon: Icon }) => (
            <Button
              key={id}
              variant="ghost"
              role="tab"
              tabIndex={tab === id ? 0 : -1}
              aria-selected={tab === id}
              className={tab === id ? "active" : ""}
              onClick={() => setTab(id)}
            >
              <Icon aria-hidden size={15} strokeWidth={1.8} />
              {label}
            </Button>
          ))}
        </nav>

        <div className="admin-sidebar-foot">
          <UserMenu viewer={viewer} showSubmit={false} />
        </div>
      </aside>

      <div className="admin-main">
        <header className={`admin-topbar${scrolled ? " scrolled" : ""}`}>
          <h2 className="admin-page-title">
            {tabs.find((t) => t.id === tab)?.label}
          </h2>
          {tab === "textos" && siteDirty && (
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

            <SegmentedFilter
              ariaLabel="Filtrar por estado"
              value={photoFilter}
              onChange={setPhotoFilter}
              options={PHOTO_FILTERS.map((status) => ({
                id: status,
                label: (
                  <>
                    {STATUS_LABELS_PLURAL[status]}
                    <span className="filter-count">
                      {photos.filter((p) => p.status === status).length}
                    </span>
                  </>
                ),
              }))}
            />

            {visiblePhotos.length === 0 && (
              <p className="hint pane-note">{emptyNote}</p>
            )}

            <ul className="photo-list" onScroll={onScroll}>
              {visiblePhotos.map(photoRow)}
            </ul>
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
                      <label
                        className={`publish-switch${
                          draft.status === "published" ? " on" : ""
                        }`}
                        title={
                          draft.status === "published"
                            ? "Quitar del mapa sin borrarla"
                            : "Mostrarla en el mapa"
                        }
                      >
                        {draft.status === "published" ? (
                          <Eye aria-hidden size={15} strokeWidth={1.8} />
                        ) : (
                          <EyeOff aria-hidden size={15} strokeWidth={1.8} />
                        )}
                        {draft.status === "published" ? "Publicada" : "Oculta"}
                        <Switch
                          className="data-checked:bg-success"
                          checked={draft.status === "published"}
                          disabled={busy}
                          onCheckedChange={(checked) =>
                            run(() =>
                              setPhotoStatus(
                                draft.id!,
                                checked ? "published" : "pending"
                              )
                            )
                          }
                        />
                      </label>
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

                <div className="photo-form-body" onScroll={onScroll}>
                  <PhotoFields
                    key={draft.id ?? "nueva"}
                    draft={draft}
                    onChange={setDraft}
                    canFeature
                  />

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

      {tab === "mapas" && admin && (
        <div className="photos-layout">
          <aside className="photos-list-pane">
            <Button
              variant="ghost"
              className="add-btn"
              onClick={() => openHmDraft(emptyHmDraft())}
            >
              <Plus aria-hidden size={13} strokeWidth={2} /> Añadir mapa histórico
            </Button>

            {historicalMaps.length === 0 && (
              <p className="hint pane-note">
                Todavía no hay mapas históricos. Añade uno para empezar.
              </p>
            )}

            <ul className="photo-list" onScroll={onScroll}>
              {historicalMaps.map(historicalMapRow)}
            </ul>
          </aside>

          <section className="photo-detail-pane">
            {hmDraft ? (
              <div className="photo-form">
                <div className="photo-form-head">
                  <h2>{hmDraft.title || "Nuevo mapa histórico"}</h2>
                  <div className="admin-actions">
                    {hmDraft.id && (
                      <label
                        className={`publish-switch${hmDraft.published ? " on" : ""}`}
                        title={
                          hmDraft.published
                            ? "Quitarlo del mapa sin borrarlo"
                            : "Mostrarlo en el mapa"
                        }
                      >
                        {hmDraft.published ? (
                          <Eye aria-hidden size={15} strokeWidth={1.8} />
                        ) : (
                          <EyeOff aria-hidden size={15} strokeWidth={1.8} />
                        )}
                        {hmDraft.published ? "Publicado" : "Sin publicar"}
                        <Switch
                          className="data-checked:bg-success"
                          checked={hmDraft.published}
                          disabled={busy}
                          onCheckedChange={(checked) =>
                            run(() =>
                              setHistoricalMapPublished(hmDraft.id!, checked)
                            )
                          }
                        />
                      </label>
                    )}
                    {hmDraftDirty && (
                      <Button
                        variant="ghost"
                        className="form-action save-btn"
                        onClick={saveHmDraft}
                        disabled={busy}
                      >
                        <Save aria-hidden size={15} strokeWidth={1.8} />
                        {busy ? "Guardando…" : "Guardar"}
                      </Button>
                    )}
                  </div>
                </div>

                <div className="photo-form-body" onScroll={onScroll}>
                  <HistoricalMapFields
                    key={hmDraft.id ?? "nuevo"}
                    draft={hmDraft}
                    onChange={setHmDraft}
                  />
                </div>
              </div>
            ) : (
              <p className="empty-detail">
                Selecciona un mapa histórico de la lista para editarlo.
              </p>
            )}
          </section>
        </div>
      )}

      {tab === "comentarios" && (
        <div className="pane pane-centered" onScroll={onScroll}>
          <SegmentedFilter
            ariaLabel="Filtrar por estado"
            value={commentFilter}
            onChange={setCommentFilter}
            options={PHOTO_FILTERS.map((status) => ({
              id: status,
              label: (
                <>
                  {STATUS_LABELS_PLURAL[status]}
                  <span className="filter-count">
                    {comments.filter((c) => c.status === status).length}
                  </span>
                </>
              ),
            }))}
          />

          {visibleComments.length === 0 && (
            <p className="hint pane-note">{emptyCommentNote}</p>
          )}

          <ul className="photo-list">{visibleComments.map(commentRow)}</ul>
        </div>
      )}

      {tab === "textos" && admin && (
        <div className="pane pane-centered" onScroll={onScroll}>
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
        <div className="pane pane-centered" onScroll={onScroll}>
          <SegmentedFilter
            ariaLabel="Filtrar por tipo"
            value={peopleFilter}
            onChange={setPeopleFilter}
            options={[
              { id: "todos" as const, label: `Todos (${profiles.length})` },
              ...ROLES.map((role) => ({
                id: role,
                label: `${ROLE_LABELS_PLURAL[role]} (${
                  profiles.filter((p) => p.role === role).length
                })`,
              })),
            ]}
          />

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
      </div>
    </main>
  );
}
