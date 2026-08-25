"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import PhotoFields, { emptyDraft, toDraft, type Draft } from "@/components/PhotoEditor";
import UserMenu from "@/components/UserMenu";
import { savePhoto } from "@/app/actions/photos";
import { useScrollBorder } from "@/lib/useScrollBorder";
import type { Photo, SiteContent, Viewer } from "@/lib/types";

export default function SubmitPhoto({
  viewer,
  mine,
  site,
  canPublish,
}: {
  viewer: NonNullable<Viewer>;
  mine: Photo[];
  site: SiteContent;
  canPublish: boolean;
}) {
  const router = useRouter();
  const { scrolled, onScroll } = useScrollBorder();
  const [draft, setDraft] = useState<Draft>(emptyDraft());
  const [editing, setEditing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  // Llegar desde «Tu perfil» con ?edit=<id> abre directamente esa foto.
  // Se lee de window.location en vez de useSearchParams para no obligar a
  // esta página a envolverse en un <Suspense>.
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("edit");
    if (!id) return;
    const photo = mine.find((p) => p.id === id);
    if (!photo) return;
    setDraft(toDraft(photo));
    setEditing(photo.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  return (
    <main className="admin">
      <header className={`admin-header${scrolled ? " scrolled" : ""}`}>
        <div className="admin-header-left">
          <Link href="/" className="back-link">
            <ArrowLeft aria-hidden size={14} strokeWidth={1.8} /> Volver al mapa
          </Link>
          <h1>{editing ? "Editar tu fotografía" : site.submitTitle}</h1>
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
          <UserMenu viewer={viewer} dropdown={false} />
        </div>
      </header>

      {!canPublish && site.submitIntro && (
        <p className="hint pane-note">{site.submitIntro}</p>
      )}

      {error && <p className="admin-error">{error}</p>}

      <div className="pane" onScroll={onScroll}>
        <PhotoFields
          key={editing ?? "nueva"}
          draft={draft}
          onChange={setDraft}
          canFeature={canPublish}
        />
      </div>

      <p className="hint pane-note">
        <Link href="/perfil">Ver tus fotografías y comentarios enviados →</Link>
      </p>
    </main>
  );
}
