import type { Metadata } from "next";
import { Inter, Cormorant_Garamond } from "next/font/google";
import { site } from "@/lib/site";
// El CSS de MapLibre se importa aquí, no en MapView: importado desde un
// componente cliente, Next lo emite en un page.css que en dev llega a servirse
// vacío, y sin él los marcadores pierden su posicionamiento absoluto.
import "maplibre-gl/dist/maplibre-gl.css";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-serif",
});

export const metadata: Metadata = {
  title: site.metaTitle,
  description: site.metaDescription,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body className={`${inter.variable} ${cormorant.variable}`}>
        {children}
      </body>
    </html>
  );
}
