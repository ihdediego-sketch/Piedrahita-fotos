import SiteNav from "./SiteNav";
import UserMenu from "./UserMenu";
import type { SiteContent, Viewer } from "@/lib/types";

/**
 * Cabecera del sitio: título, menú de secciones y sesión en una sola fila.
 * Es el mismo componente en todas las páginas públicas para que el alto no
 * cambie al navegar entre ellas — solo cambia si flota sobre el mapa
 * (`overlay`, la portada, sin cabecera de bloque propia) o vive en el flujo
 * normal de la página (el resto).
 */
export default function AppHeader({
  site,
  viewer,
  overlay = false,
  scrolled = false,
  fullMenu = false,
}: {
  site: SiteContent;
  viewer: Viewer;
  overlay?: boolean;
  /** Línea bajo la cabecera al scrollear el contenido de debajo. */
  scrolled?: boolean;
  /** Menú de sesión completo (enviar fotos + desplegable): solo en la portada. */
  fullMenu?: boolean;
}) {
  return (
    <header
      className={`app-header${overlay ? " app-header-overlay" : ""}${
        scrolled ? " scrolled" : ""
      }`}
    >
      <div className="app-header-title">
        <h1>{site.title}</h1>
        <span className="subtitle">{site.subtitle}</span>
      </div>

      <SiteNav />

      <div className="app-header-actions">
        <UserMenu viewer={viewer} dropdown={fullMenu} showSubmit={fullMenu} />
      </div>
    </header>
  );
}
