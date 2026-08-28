"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Photo } from "@/lib/types";

/**
 * Selector de una foto del archivo ya publicado. Se usa tanto para elegir la
 * portada de una historia como para insertar una imagen en su cuerpo — quien
 * lo abre decide qué hacer con la foto elegida.
 */
export default function PhotoPicker({
  photos,
  onPick,
  onClose,
}: {
  photos: Photo[];
  onPick: (photo: Photo) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const filtered = query.trim()
    ? photos.filter((p) =>
        p.title.toLowerCase().includes(query.trim().toLowerCase())
      )
    : photos;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="photo-picker"
        role="dialog"
        aria-modal="true"
        aria-label="Elegir una fotografía"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="photo-picker-head">
          <input
            type="text"
            className="photo-picker-search"
            placeholder="Buscar por título…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          <Button
            variant="ghost"
            className="modal-close"
            onClick={onClose}
            aria-label="Cerrar"
          >
            <X aria-hidden size={18} strokeWidth={1.8} />
          </Button>
        </header>

        {filtered.length === 0 && (
          <p className="hint pane-note">No hay fotos publicadas con ese título.</p>
        )}

        <ul className="photo-picker-grid">
          {filtered.map((p) => (
            <li key={p.id}>
              <Button
                type="button"
                variant="ghost"
                className="photo-picker-item"
                onClick={() => onPick(p)}
              >
                <span className="thumb">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {p.image && <img src={p.image} alt="" />}
                </span>
                <span className="photo-picker-title">{p.title || "(sin título)"}</span>
              </Button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
