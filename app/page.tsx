import MapView from "@/components/MapView";
import { getMyLikes, getPublishedPhotos, getSiteContent, getViewer } from "@/lib/data";

// Los cambios del panel se ven al momento, sin desplegar de nuevo.
export const dynamic = "force-dynamic";

export default async function Home() {
  const [photos, site, viewer, likedIds] = await Promise.all([
    getPublishedPhotos(),
    getSiteContent(),
    getViewer(),
    getMyLikes(),
  ]);

  return (
    <MapView photos={photos} site={site} viewer={viewer} likedIds={likedIds} />
  );
}
