"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import PhotoFields, { emptyDraft, toDraft, type Draft } from "@/components/PhotoEditor";
import { deletePhoto, savePhoto } from "@/app/actions/photos";
import { defaultDateLabel } from "@/lib/photos";
import { STATUS_LABELS, type Photo, type Viewer } from "@/lib/types";

export default function SubmitPhoto({
  viewer,
  mine,
  canPublish,
}: {
  viewer: Viewer;
  mine: Photo[];
  canPublish: boolean;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>(emptyDraft());
  const [editing, setEditing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  const reset = () => {
    setDraft(emptyDraft());
    setEditing(null);
    setError(null);
  };

  const submit = () => {
    setError(null);
    setDone(false);
    startTransition(async () => {
      const res = await savePhoto({
        ...draft,
        id: editing ?? undefined,
        // Un colaborador o admin publica al momento; el resto envía a revisión
        status: canPublish ? "published" : "pending",
      });
      if (!res.ok) return setError(res.error);
      reset();
      setDone(true);
      router.refresh();
    });
  };

  const remove = (photo: Photo) => {
    if (!confirm(`¿Retirar «${photo.title}»?`)) return;
    startTransition(async () => {
      const res = await deletePhoto(photo.id);
      if (!res.ok) return setError(res.error);
      if (editing === photo.id) reset();
      router.refresh();
    });
  };

  return (
    <main className="admin">
      <header className="admin-header">
        <div>
          <Link href="/" className="back-link">
            <ArrowLeft aria-hidden size={14} strokeWidth={1.8} /> Volver al mapa
          </Link>
          <h1>{editing ? "Editar tu fotografía" : "Enviar una fotografía"}</h1>
        </div>
        <div className="admin-actions">
          {done && (
            <span className="saved-note">
              {canPublish ? "Publicada" : "Enviada, pendiente de revisión"}
              <Check aria-hidden size={13} strokeWidth={2} />
            </span>
          )}
          {editing && (
            <Button variant="ghost" onClick={reset}>
              Cancelar
            </Button>
          )}
          <Button
            variant="ghost"
            className="save-btn"
            onClick={submit}
            disabled={pending}
          >
            {pending ? "Guardando…" : editing ? "Guardar cambios" : "Enviar"}
          </Button>
        </div>
      </header>

      {!canPublish && (
        <p className="hint pane-note">
          Tu fotografía no aparecerá en el mapa hasta que un colaborador la
          apruebe. Mientras esté pendiente puedes seguir editándola.
        </p>
      )}

      {error && <p className="admin-error">{error}</p>}

      <div className="pane">
        <PhotoFields
          key={editing ?? "nueva"}
          draft={draft}
          onChange={setDraft}
          canFeature={canPublish}
        />
      </div>

      {mine.length > 0 && (
        <section className="pane">
          <h2>Tus aportaciones</h2>
          <ul className="photo-list">
            {mine.map((p) => (
              <li key={p.id}>
                <Button
                  variant="ghost"
                  className={`photo-row${editing === p.id ? " selected" : ""}`}
                  onClick={() => {
                    setDraft(toDraft(p));
                    setEditing(p.id);
                    setDone(false);
                  }}
                  // Una vez publicada o rechazada, solo la toca un colaborador
                  disabled={p.status !== "pending" && !canPublish}
                >
                  <span className="thumb">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {p.image && <img src={p.image} alt="" />}
                  </span>
                  <span className="photo-row-text">
                    <span className="photo-row-title">{p.title}</span>
                    <span className="photo-row-date">
                      <span className={`status-tag ${p.status}`}>
                        {STATUS_LABELS[p.status]}
                      </span>
                      {p.dateLabel || defaultDateLabel(p)}
                    </span>
                    {p.status === "rejected" && p.reviewNote && (
                      <span className="hint">Motivo: {p.reviewNote}</span>
                    )}
                  </span>
                </Button>
                {(p.status === "pending" || viewer?.role === "admin") && (
                  <Button
                    variant="ghost"
                    className="delete-btn"
                    onClick={() => remove(p)}
                    aria-label="Retirar"
                  >
                    <Trash2 aria-hidden size={14} strokeWidth={1.8} />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
