"use client";

import { useState, useRef } from "react";
import { ChevronDown, Images } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
  featured: boolean;
  status: PhotoStatus;
};

export const emptyDraft = (): Draft => ({
  title: "",
  excerpt: "",
  contentMd: "",
  coverImagePath: "",
  seoTitle: "",
  seoDescription: "",
  featured: false,
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
  featured: s.featured,
  status: s.status,
});

/**
 * Los campos de una historia. La portada se sube a Storage nada más
 * elegirla, o se copia la ruta de una foto ya publicada; las imágenes
 * dentro del cuerpo salen del mismo selector de fotos.
 *
 * Escribir es lo importante, así que el cuerpo del artículo manda en las
 * dos variantes: en el panel de admin (`compact` false) título y portada
 * quedan a la vista junto al texto, y solo extracto y SEO se pliegan; en
 * el envío público (`compact` true) hasta el título se reduce a una línea
 * discreta y todo lo demás —portada incluida— se pliega en un solo bloque.
 */
export default function StoryFields({
  draft,
  onChange,
  photos,
  compact = false,
}: {
  draft: Draft;
  onChange: (d: Draft) => void;
  /** El archivo de fotos publicadas, para elegir portada o imágenes del cuerpo. */
  photos: Photo[];
  /** Envío público: el cuerpo manda, el resto se pliega de entrada. */
  compact?: boolean;
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [pickerFor, setPickerFor] = useState<"cover" | "body" | null>(null);
  const bodyPickResolve = useRef<
    ((picked: { src: string; alt: string } | null) => void) | null
  >(null);

  // Si ya hay algo escrito en los campos que se pliegan, el bloque arranca
  // abierto para no esconder datos existentes. Se calcula una sola vez al
  // montar: quien edita puede plegarlo sin que un tecleo en el cuerpo lo
  // vuelva a abrir solo.
  const [detailsOpen] = useState(
    () =>
      Boolean(draft.excerpt || draft.seoTitle || draft.seoDescription) ||
      (compact && Boolean(draft.coverImagePath))
  );

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

  const coverField = (
    <>
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
        <Images aria-hidden size={14} strokeWidth={1.8} /> Elegir de la galería
      </Button>
      {uploadError && <p className="admin-error">{uploadError}</p>}
    </>
  );

  const seoFields = (
    <>
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
        Título SEO
        <Input
          type="text"
          value={draft.seoTitle}
          placeholder={draft.title}
          onChange={(e) => set("seoTitle", e.target.value)}
        />
      </label>

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
    </>
  );

  const picker = pickerFor && (
    <PhotoPicker photos={photos} onPick={onPickPhoto} onClose={closePicker} />
  );

  if (compact) {
    return (
      <div className="story-editor story-editor-compact">
        <div className="story-editor-compact-layout">
          <div className="story-editor-main-compact">
            <Input
              type="text"
              className="story-editor-title-plain"
              placeholder="Título de tu historia"
              value={draft.title}
              onChange={(e) => set("title", e.target.value)}
            />

            <MarkdownEditor
              className="story-editor-body-compact"
              value={draft.contentMd}
              onChange={(md) => set("contentMd", md)}
              placeholder="Escribe aquí. Cuenta lo que recuerdes, lo que te contaron, lo que encontraste…"
              onRequestImage={requestBodyImage}
            />
          </div>

          {/* En escritorio esta columna queda siempre a la vista (1/3, a la
              derecha del texto); en móvil sigue siendo el mismo <details>
              plegado de siempre, para no competir con la escritura en una
              pantalla estrecha. */}
          <details className="story-editor-more story-editor-more-compact" open={detailsOpen}>
            <summary>
              <ChevronDown aria-hidden size={14} strokeWidth={2} />
              Portada, extracto y SEO
              <span className="hint">(opcional)</span>
            </summary>
            <div className="story-editor-more-fields">
              <div className="story-editor-more-cover">{coverField}</div>
              {seoFields}
            </div>
          </details>
        </div>

        {picker}
      </div>
    );
  }

  return (
    <div className="story-editor">
      <div className="story-editor-main">
        <Input
          type="text"
          className="story-editor-title-input"
          placeholder="Título"
          value={draft.title}
          onChange={(e) => set("title", e.target.value)}
        />

        <MarkdownEditor
          className="story-editor-body"
          value={draft.contentMd}
          onChange={(md) => set("contentMd", md)}
          placeholder="Escribe la historia…"
          onRequestImage={requestBodyImage}
        />
      </div>

      <div className="story-editor-side">
        {coverField}
        <label className="check-field">
          <Checkbox
            checked={draft.featured}
            onCheckedChange={(checked) => set("featured", checked === true)}
            className="data-checked:bg-[#5c3317] data-checked:border-[#5c3317]"
          />
          <span>Destacada</span>
          <span className="hint">
            Se muestra el doble de grande que las demás en el listado de
            Historias, como portada.
          </span>
        </label>
      </div>

      <details className="story-editor-more" open={detailsOpen}>
        <summary>
          <ChevronDown aria-hidden size={14} strokeWidth={2} />
          Extracto y SEO
        </summary>
        <div className="story-editor-more-fields">{seoFields}</div>
      </details>

      {picker}
    </div>
  );
}
