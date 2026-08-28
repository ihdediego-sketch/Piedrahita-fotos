"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const SECTIONS = [
  { href: "/", label: "Mapa" },
  { href: "/fotos", label: "Fotos" },
  { href: "/historias", label: "Historias" },
];

/**
 * Menú de secciones del sitio: enlaces de texto, con la sección activa
 * subrayada. En pantallas grandes se ven todas a la vista; en móvil se
 * pliegan en una hamburguesa (lo decide el CSS, aquí se pintan las dos
 * variantes). Vive dentro de `AppHeader`, que es quien decide si la
 * cabecera flota o está en el flujo de la página.
 */
export default function SiteNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Cerrar el desplegable al pinchar fuera o con Escape, como el menú de usuario
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

  const links = (onNavigate?: () => void) =>
    SECTIONS.map((s) => (
      <Link
        key={s.href}
        href={s.href}
        className="site-nav-link"
        aria-current={pathname === s.href ? "page" : undefined}
        onClick={onNavigate}
      >
        {s.label}
      </Link>
    ));

  return (
    <nav ref={ref} className="site-nav" aria-label="Secciones">
      <div className="site-nav-links">{links()}</div>

      <Button
        type="button"
        variant="ghost"
        className="site-nav-burger user-chip"
        aria-label="Menú de secciones"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? (
          <X aria-hidden size={15} strokeWidth={1.8} />
        ) : (
          <Menu aria-hidden size={15} strokeWidth={1.8} />
        )}
      </Button>
      {open && (
        <div className="site-nav-panel">{links(() => setOpen(false))}</div>
      )}
    </nav>
  );
}
