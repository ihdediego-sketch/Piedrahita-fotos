"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Camera, Check, Save, Trash2, User } from "lucide-react";
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

  const discard = () => {
    setDisplayName(viewer.displayName);
    setBio(viewer.bio);
    setAvatarPath(viewer.avatarPath);
    setError(null);
    setSaved(false);
  };

  const shown = preview ?? avatarUrl(avatarPath);

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
          {saved && !dirty && (
            <span className="saved-note">
              Guardado
              <Check aria-hidden size={13} strokeWidth={2} />
            </span>
          )}
          {/* Sin cambios no hay nada que guardar ni que deshacer: los botones sobran. */}
          {dirty && (
            <>
              <Button
                variant="ghost"
                className="discard-btn"
                onClick={discard}
                disabled={pending || uploading}
              >
                Descartar
              </Button>
              <Button
                variant="ghost"
                className="form-action save-btn"
                onClick={submit}
                disabled={pending || uploading}
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

        {/* Una sola tarjeta: la foto, el nombre y la presentación son partes
            del mismo perfil, no pasos separados. */}
        <section className="profile-card">
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
        </section>
      </div>
    </main>
  );
}
