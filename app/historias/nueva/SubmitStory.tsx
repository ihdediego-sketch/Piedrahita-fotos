"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import StoryFields, { emptyDraft, toDraft, type Draft } from "@/components/StoryEditor";
import ToolHeader from "@/components/ToolHeader";
import { saveStory } from "@/app/actions/stories";
import { useScrollBorder } from "@/lib/useScrollBorder";
import { STATUS_LABELS } from "@/lib/types";
import type { Photo, Story, Viewer } from "@/lib/types";

export default function SubmitStory({
  viewer,
  mine,
  photos,
  canPublish,
}: {
  viewer: NonNullable<Viewer>;
  mine: Story[];
  photos: Photo[];
  canPublish: boolean;
}) {
  const router = useRouter();
  const { scrolled, onScroll } = useScrollBorder();
  const [draft, setDraft] = useState<Draft>(emptyDraft());
  const [editing, setEditing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  // Llegar con ?edit=<id> abre directamente esa historia.
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("edit");
    if (!id) return;
    const story = mine.find((s) => s.id === id);
    if (!story) return;
    setDraft(toDraft(story));
    setEditing(story.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reset = () => {
    setDraft(emptyDraft());
    setEditing(null);
    setError(null);
  };

  const submit = () => {
    if (!draft.title.trim()) return setError("Ponle un título antes de enviarla.");
    setError(null);
    setDone(false);
    startTransition(async () => {
      const res = await saveStory({
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

  return (
    <main className="admin story-write-page">
      <ToolHeader
        title={editing ? "Editar" : "Escribir"}
        viewer={viewer}
        scrolled={scrolled}
        savedLabel={
          done ? (canPublish ? "Publicada" : "Enviada, pendiente de revisión") : null
        }
      >
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
          {pending ? "Guardando…" : editing ? "Guardar cambios" : "Publicar"}
        </Button>
      </ToolHeader>

      {error && <p className="admin-error story-write-error">{error}</p>}

      <div className="pane" onScroll={onScroll}>
        <StoryFields
          key={editing ?? "nueva"}
          draft={draft}
          onChange={setDraft}
          photos={photos}
          compact
        />

        {/* Todo lo que no es escribir queda al fondo, plegado por su cuenta:
            ni el aviso de revisión ni el historial de envíos deben competir
            con el texto mientras se redacta. */}
        <div className="story-write-footer">
          {!canPublish && (
            <p className="hint">
              Tu historia no aparecerá publicada hasta que un colaborador la
              revise. Mientras esté pendiente puedes seguir editándola.
            </p>
          )}

          {mine.length > 0 && (
            <details className="story-write-mine">
              <summary>Tus historias ({mine.length})</summary>
              <ul className="mine-list">
                {mine.map((s) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      className="mine-list-item"
                      onClick={() => {
                        setDraft(toDraft(s));
                        setEditing(s.id);
                        setDone(false);
                      }}
                    >
                      <span className={`status-dot ${s.status}`} aria-hidden />
                      {s.title || "(sin título)"}
                      <span className="hint"> · {STATUS_LABELS[s.status]}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </details>
          )}

          <Link href="/historias" className="hint story-write-back-link">
            Ver todas las historias publicadas →
          </Link>
        </div>
      </div>
    </main>
  );
}
