import type { NextConfig } from "next";

// El optimizador de imágenes solo acepta hosts de una lista blanca. Se deriva
// de la URL pública de Supabase para no duplicar el ref del proyecto aquí.
const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : "";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: supabaseHost
      ? [
          {
            protocol: "https",
            hostname: supabaseHost,
            pathname: "/storage/v1/object/public/**",
          },
        ]
      : [],
    // Las fotos del archivo no cambian de ruta (cada subida estrena una),
    // así que las versiones optimizadas pueden cachearse un mes.
    minimumCacheTTL: 2678400,
  },
};

export default nextConfig;
