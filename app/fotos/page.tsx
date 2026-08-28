import {
  getMyLikes,
  getPublishedPhotos,
  getSiteContent,
  getViewer,
} from "@/lib/data";
import PhotosView from "./PhotosView";
import "@/components/admin/admin.css";

// Los cambios del panel se ven al momento, sin desplegar de nuevo.
export const dynamic = "force-dynamic";
export const metadata = { title: "Piedrahíta — Todas las fotos" };

export default async function FotosPage() {
  const [photos, site, viewer, likedIds] = await Promise.all([
    getPublishedPhotos(),
    getSiteContent(),
    getViewer(),
    getMyLikes(),
  ]);

  return (
    <PhotosView photos={photos} site={site} viewer={viewer} likedIds={likedIds} />
  );
}
