import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, Check } from "lucide-react";
import UserMenu from "./UserMenu";
import type { Viewer } from "@/lib/types";

/**
 * Cabecera de las páginas "herramienta" (formulario o ficha con sesión
 * propia): /perfil y /subir hoy, cualquier página parecida mañana. Mismo
 * componente en las dos para no repetir el JSX de la cabecera — antes cada
 * página lo redibujaba a mano y podía irse desalineando sin darse cuenta.
 *
 * Comparte la base CSS con `AppHeader` (`.app-header` / `.app-header-actions`,
 * en vez de duplicar ese mismo grid en `admin.css` con otro nombre): la
 * columna central se deja vacía en vez de llevar `SiteNav`.
 *
 * Distinto de `AppHeader`: esas páginas son de navegación pública (con el
 * menú Mapa/Fotos); estas son herramientas de una sola tarea, con volver
 * atrás, un título de la tarea y acciones propias (Guardar, Cancelar…) en
 * vez de un menú de secciones.
 */
export default function ToolHeader({
  title,
  viewer,
  scrolled = false,
  savedLabel,
  backHref = "/",
  backLabel = "Volver al mapa",
  children,
}: {
  title: ReactNode;
  viewer: NonNullable<Viewer>;
  /** Línea bajo la cabecera al scrollear el contenido de debajo. */
  scrolled?: boolean;
  /** Aviso tipo «Guardado» o «Publicada»; se omite si no hay nada que avisar. */
  savedLabel?: ReactNode | null;
  backHref?: string;
  backLabel?: string;
  /** Botones propios de la página (Cancelar, Guardar, Enviar…), antes del aviso y la sesión. */
  children?: ReactNode;
}) {
  return (
    <header className={`app-header tool-header${scrolled ? " scrolled" : ""}`}>
      <div className="app-header-title">
        <Link href={backHref} className="back-link">
          <ArrowLeft aria-hidden size={14} strokeWidth={1.8} /> {backLabel}
        </Link>
        <h1>{title}</h1>
      </div>
      <div className="app-header-actions">
        {savedLabel && (
          <span className="saved-note">
            {savedLabel}
            <Check aria-hidden size={13} strokeWidth={2} />
          </span>
        )}
        {children}
        <UserMenu viewer={viewer} dropdown={false} />
      </div>
    </header>
  );
}
