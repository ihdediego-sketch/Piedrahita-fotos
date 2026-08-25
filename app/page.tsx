import MapView from "@/components/MapView";
import {
  getMyLikes,
  getPublishedHistoricalMaps,
  getPublishedPhotos,
  getSiteContent,
  getViewer,
} from "@/lib/data";

// Los cambios del panel se ven al momento, sin desplegar de nuevo.
export const dynamic = "force-dynamic";

export default async function Home() {
  const [photos, historicalMaps, site, viewer, likedIds] = await Promise.all([
    getPublishedPhotos(),
    getPublishedHistoricalMaps(),
    getSiteContent(),
    getViewer(),
    getMyLikes(),
  ]);

  return (
    <MapView
      photos={photos}
      historicalMaps={historicalMaps}
      site={site}
      viewer={viewer}
      likedIds={likedIds}
    />
  );
}
