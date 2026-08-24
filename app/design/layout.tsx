import type { Metadata } from "next";

/**
 * Documentación interna del sistema de diseño. No hay enlace a esta ruta
 * desde ningún sitio del sitio público ni del panel: solo se llega
 * escribiendo /design a mano. El noindex es para que tampoco la levante un
 * buscador.
 */
export const metadata: Metadata = {
  title: "Sistema de diseño — Piedrahita",
  robots: { index: false, follow: false },
};

export default function DesignLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
