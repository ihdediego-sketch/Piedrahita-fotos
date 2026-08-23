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
        <Link href="/entrar" className="user-chip">
          <User aria-hidden size={15} strokeWidth={1.7} />
          Entrar
        </Link>
      </div>
    );
  }

  return (
    <div className="user-menu" ref={ref}>
      <Button
        variant="ghost"
        className="user-chip"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <User aria-hidden size={15} strokeWidth={1.7} />
        {viewer.displayName}
      </Button>

      {open && (
        <div className="user-dropdown" role="menu">
          <span className="user-role">{ROLE_LABELS[viewer.role]}</span>
          <Link href="/subir" role="menuitem" onClick={() => setOpen(false)}>
            <ImagePlus aria-hidden size={14} strokeWidth={1.7} />
            Enviar una fotografía
          </Link>
          {isStaff(viewer) && (
            <Link href="/admin" role="menuitem" onClick={() => setOpen(false)}>
              <Settings aria-hidden size={14} strokeWidth={1.7} />
              Panel
            </Link>
          )}
          <form action={signOut}>
            <button type="submit" role="menuitem">
              <LogOut aria-hidden size={14} strokeWidth={1.7} />
              Salir
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
