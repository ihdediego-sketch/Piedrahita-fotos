"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Trash2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { saveProfile } from "@/app/actions/profile";
import { avatarUrl } from "@/lib/photos";
import { ACCEPTED_AVATAR_EXT, uploadAvatarImage } from "@/lib/upload";
import { BIO_MAX, ROLE_LABELS, type Viewer } from "@/lib/types";

export default function ProfileForm({ viewer }: { viewer: NonNullable<Viewer> }) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(viewer.displayName);
  const [bio, setBio] = useState(viewer.bio);
  const [avatarPath, setAvatarPath] = useState(viewer.avatarPath);
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
      router.refresh();
    });
  };

  const shown = preview ?? avatarUrl(avatarPath);

  return (
    <main className="admin">
      <header className="admin-header">
        <div>
          <Link href="/" className="back-link">
            <ArrowLeft aria-hidden size={14} strokeWidth={1.8} /> Volver al mapa
          </Link>
          <h1>Tu perfil</h1>
        </div>
        <div className="admin-actions">
          {saved && !dirty && (
            <span className="saved-note">
              Guardado
              <Check aria-hidden size={13} strokeWidth={2} />
            </span>
          )}
          <Button
            variant="ghost"
            className="save-btn"
            onClick={submit}
            disabled={pending || uploading || !dirty}
          >
            {pending ? "Guardando…" : "Guardar cambios"}
          </Button>
        </div>
      </header>

      <p className="hint pane-note">
        Tu nombre y tu foto firman las fotografías que envías y los comentarios
        que escribes. Entras como <strong>{ROLE_LABELS[viewer.role]}</strong>.
      </p>

      {error && <p className="admin-error">{error}</p>}

      <div className="pane">
        <div className="profile-cols">
          <div className="profile-fields">
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
                Como quieres que te vean los demás: tu nombre, un apodo o la
                casa de la que vienes.
              </span>
            </label>

            <label>
              Sobre mí
              <Textarea
                rows={8}
                value={bio}
                maxLength={BIO_MAX}
                onChange={(e) => {
                  setBio(e.target.value);
                  setSaved(false);
                }}
              />
              <span className="hint">
                Tu relación con Piedrahíta, lo que aportas al archivo…{" "}
                {bio.length}/{BIO_MAX}
              </span>
            </label>
          </div>

          <div className="profile-side">
            <div className="avatar-box">
              {shown ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={shown} alt={displayName} />
              ) : (
                <User aria-hidden size={40} strokeWidth={1.2} />
              )}
            </div>
            <label className="upload-btn">
              {uploading ? "Subiendo…" : avatarPath ? "Cambiar foto" : "Subir foto"}
              <Input
                type="file"
                accept={ACCEPTED_AVATAR_EXT}
                hidden
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
                <Trash2 aria-hidden size={13} strokeWidth={1.8} /> Quitar foto
              </Button>
            )}
            <span className="hint">JPG, PNG, WebP o AVIF. Hasta 5 MB.</span>
          </div>
        </div>
      </div>
    </main>
  );
}
