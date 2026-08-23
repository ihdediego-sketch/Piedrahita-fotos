import type { Metadata } from "next";
import { Cormorant_Garamond, Geist } from "next/font/google";
import { getSiteContent } from "@/lib/data";
// El CSS de MapLibre se importa aquí, no en MapView: importado desde un
// componente cliente, Next lo emite en un page.css que en dev llega a servirse
// vacío, y sin él los marcadores pierden su posicionamiento absoluto.
import "maplibre-gl/dist/maplibre-gl.css";
import "./globals.css";
import { cn } from "@/lib/utils";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

// Solo la usan el título del sitio (500) y el rango de años (400): no hace
// falta cargar más pesos ni la itálica.
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-serif",
});

export async function generateMetadata(): Promise<Metadata> {
  const site = await getSiteContent();
  return { title: site.metaTitle, description: site.metaDescription };
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={cn("font-sans", geist.variable)}>
      <body className={`${geist.variable} ${cormorant.variable}`}>
        {children}
      </body>
    </html>
  );
}
