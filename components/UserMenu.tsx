"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { User, ImagePlus, LogOut, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signOut } from "@/app/auth/actions";
import { ROLE_LABELS, isStaff, type Viewer } from "@/lib/types";

export default function UserMenu({ viewer }: { viewer: Viewer }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!viewer) {
    return (
      <div className="user-menu">
        <Link href="/entrar" className="user-chip user-chip-guest">
          <User aria-hidden size={15} strokeWidth={1.7} />
          <span className="user-chip-guest-full">Entrar / Registrarse</span>
          <span className="user-chip-guest-short">Entrar</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="user-menu" ref={ref}>
      <Button
        variant="ghost"
        className="user-chip user-chip-avatar"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={viewer.displayName || "Tu cuenta"}
      >
        {viewer.avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="user-avatar" src={viewer.avatar} alt="" />
        ) : (
          <User aria-hidden size={20} strokeWidth={1.7} />
        )}
      </Button>

      {open && (
        <div className="user-dropdown" role="menu">
          {/* El nombre sale del botón, así que el menú es quien dice de quién
              es la sesión: cara, nombre y rol antes de las acciones. */}
          <span className="user-who">
            {viewer.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="user-who-avatar" src={viewer.avatar} alt="" />
            ) : (
              <span className="user-who-avatar user-who-initial" aria-hidden>
                {(viewer.displayName || "?").trim().charAt(0).toUpperCase()}
              </span>
            )}
            <span className="user-who-text">
              <span className="user-who-name">{viewer.displayName}</span>
              <span className="user-role">{ROLE_LABELS[viewer.role]}</span>
            </span>
          </span>

          {/* Primero lo que se usa a diario, y salir al final, separado. */}
          <div className="user-actions">
            {isStaff(viewer) && (
              <Link href="/admin" role="menuitem" onClick={() => setOpen(false)}>
                <Settings aria-hidden size={17} strokeWidth={1.7} />
                Panel de control
              </Link>
            )}
            <Link href="/subir" role="menuitem" onClick={() => setOpen(false)}>
              <ImagePlus aria-hidden size={17} strokeWidth={1.7} />
              Enviar una fotografía
            </Link>
            <Link href="/perfil" role="menuitem" onClick={() => setOpen(false)}>
              <User aria-hidden size={17} strokeWidth={1.7} />
              Editar perfil
            </Link>
          </div>

          <form action={signOut} className="user-exit">
            <button type="submit" role="menuitem">
              <LogOut aria-hidden size={17} strokeWidth={1.7} />
              Salir
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
