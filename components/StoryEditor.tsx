"use client";

import { useRef, useState } from "react";
import { Images } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import MarkdownEditor from "@/components/MarkdownEditor";
import PhotoPicker from "@/components/PhotoPicker";
import { ACCEPTED_IMAGE_EXT, imageUrl } from "@/lib/photos";
import { readImageDimensions, uploadPhotoImage } from "@/lib/upload";
import type { Photo, PhotoStatus, Story } from "@/lib/types";

/** Lo que se edita en el formulario, antes de mandarlo al servidor. */
export type Draft = {
  id?: string;
  title: string;
  excerpt: string;
  contentMd: string;
  coverImagePath: string;
  seoTitle: string;
  seoDescription: string;
  status: PhotoStatus;
};

export const emptyDraft = (): Draft => ({
  title: "",
  excerpt: "",
  contentMd: "",
  coverImagePath: "",
  seoTitle: "",
  seoDescription: "",
  status: "pending",
});

export const toDraft = (s: Story): Draft => ({
  id: s.id,
  title: s.title,
  excerpt: s.excerpt,
  contentMd: s.contentMd,
  coverImagePath: s.coverImagePath,
  seoTitle: s.seoTitle,
  seoDescription: s.seoDescription,
  status: s.status,
});

/**
 * Los campos de una historia. La portada se sube a Storage nada más
 * elegirla, o se copia la ruta de una foto ya publicada; las imágenes
 * dentro del cuerpo salen del mismo selector de fotos.
 */
export default function StoryFields({
  draft,
  onChange,
  photos,
}: {
  draft: Draft;
  onChange: (d: Draft) => void;
  /** El archivo de fotos publicadas, para elegir portada o imágenes del cuerpo. */
  photos: Photo[];
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [pickerFor, setPickerFor] = useState<"cover" | "body" | null>(null);
  const bodyPickResolve = useRef<
    ((picked: { src: string; alt: string } | null) => void) | null
  >(null);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    onChange({ ...draft, [key]: value });

  const uploadCover = async (file: File) => {
    setUploading(true);
    setUploadError(null);
    const local = URL.createObjectURL(file);
    setPreview(local);

    const [res] = await Promise.all([uploadPhotoImage(file), readImageDimensions(file)]);
    setUploading(false);
    if ("error" in res) {
      setUploadError(res.error);
      setPreview(null);
      URL.revokeObjectURL(local);
      return;
    }
    set("coverImagePath", res.path);
    setPreview(null);
    URL.revokeObjectURL(local);
  };

  const requestBodyImage = () =>
    new Promise<{ src: string; alt: string } | null>((resolve) => {
      bodyPickResolve.current = resolve;
      setPickerFor("body");
    });

  const onPickPhoto = (photo: Photo) => {
    if (pickerFor === "cover") {
      set("coverImagePath", photo.imagePath);
    } else if (pickerFor === "body") {
      bodyPickResolve.current?.({ src: photo.image, alt: photo.title });
      bodyPickResolve.current = null;
    }
    setPickerFor(null);
  };

  const closePicker = () => {
    if (pickerFor === "body") {
      bodyPickResolve.current?.(null);
      bodyPickResolve.current = null;
    }
    setPickerFor(null);
  };

  const shownCover =
    preview ?? (draft.coverImagePath ? imageUrl(draft.coverImagePath) : "");

  return (
    <div className="photo-form-cols">
      <div className="photo-form-fields">
        <label>
          Título
          <Input
            type="text"
            value={draft.title}
            onChange={(e) => set("title", e.target.value)}
          />
        </label>

        <label>
          Extracto
          <Textarea
            rows={2}
            value={draft.excerpt}
            onChange={(e) => set("excerpt", e.target.value)}
          />
          <span className="hint">
            Resumen corto para el listado de historias y como descripción de
            reserva para buscadores.
          </span>
        </label>

        <label>
          Cuerpo del artículo
          <MarkdownEditor
            value={draft.contentMd}
            onChange={(md) => set("contentMd", md)}
            placeholder="Escribe la historia…"
            onRequestImage={requestBodyImage}
          />
        </label>

        <div className="field-row">
          <label>
            Título SEO
            <Input
              type="text"
              value={draft.seoTitle}
              placeholder={draft.title}
              onChange={(e) => set("seoTitle", e.target.value)}
            />
          </label>
        </div>
        <label>
          Descripción SEO
          <Textarea
            rows={2}
            value={draft.seoDescription}
            placeholder={draft.excerpt}
            onChange={(e) => set("seoDescription", e.target.value)}
          />
          <span className="hint">
            Lo que muestran Google y las redes sociales. Si se deja vacía se
            usa el extracto.
          </span>
        </label>
      </div>

      <div className="photo-form-side">
        <div className="image-box">
          {shownCover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={shownCover} alt={draft.title} />
          ) : (
            <span className="image-placeholder">Sin portada</span>
          )}
        </div>
        <label className="upload-btn">
          {uploading ? "Subiendo…" : draft.coverImagePath ? "Cambiar portada" : "Subir portada"}
          <Input
            type="file"
            accept={ACCEPTED_IMAGE_EXT}
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) uploadCover(f);
              e.target.value = "";
            }}
          />
        </label>
        <Button
          type="button"
          variant="ghost"
          className="upload-btn"
          onClick={() => setPickerFor("cover")}
        >
          <Images aria-hidden size={14} strokeWidth={1.8} /> Elegir de la
          galería
        </Button>
        {uploadError && <p className="admin-error">{uploadError}</p>}
      </div>

      {pickerFor && (
        <PhotoPicker photos={photos} onPick={onPickPhoto} onClose={closePicker} />
      )}
    </div>
  );
}
