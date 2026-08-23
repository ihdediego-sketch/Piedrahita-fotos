"use client";

import { useEffect, useState } from "react";
import type { Photo } from "@/lib/photos";

type Props = {
  photo: Photo;
  onClose: () => void;
};

export default function PhotoModal({ photo, onClose }: Props) {
  const [closing, setClosing] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  const close = () => {
    setClosing(true);
    setTimeout(onClose, 200);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (fullscreen) setFullscreen(false);
        else close();
      }
      if (e.key === "f" || e.key === "F") setFullscreen((v) => !v);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullscreen]);

  return (
    <div
      className={`modal-backdrop${closing ? " closing" : ""}${
        fullscreen ? " fullscreen" : ""
      }`}
      onClick={close}
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={photo.title}
        onClick={(e) => {
          e.stopPropagation();
          // en pantalla completa, el hueco alrededor de la foto vuelve al modal
          if (fullscreen && e.target === e.currentTarget) setFullscreen(false);
        }}
      >
        <button className="modal-close" onClick={close} aria-label="Cerrar">
          ✕
        </button>
        <button
          className="modal-expand"
          onClick={() => setFullscreen((v) => !v)}
          aria-pressed={fullscreen}
          aria-label={fullscreen ? "Ver con descripción" : "Ver a pantalla completa"}
          title={fullscreen ? "Ver con descripción (F)" : "Pantalla completa (F)"}
        >
          {fullscreen ? "⤡" : "⤢"}
        </button>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photo.image} alt={photo.title} />
        <div className="modal-body">
          <p className="modal-date">
            {photo.featured && <span className="modal-featured">Hito</span>}
            {photo.dateLabel}
          </p>
          <h2 className="modal-title">{photo.title}</h2>
          <p className="modal-description">{photo.description}</p>
        </div>
      </div>
    </div>
  );
}
