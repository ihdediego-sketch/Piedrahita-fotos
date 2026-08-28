import { redirect } from "next/navigation";
import AdminPanel from "@/components/admin/AdminPanel";
import {
  getManagedComments,
  getManagedHistoricalMaps,
  getManagedPhotos,
  getManagedStories,
  getManagedStoryComments,
  getProfiles,
  getSiteContent,
  getViewer,
} from "@/lib/data";
import { isAdmin, isStaff } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Piedrahíta — Admin" };

export default async function AdminPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/entrar?next=/admin");
  // Un usuario registrado sin permisos tiene su propia pantalla, no un 404
  if (!isStaff(viewer)) redirect("/subir");

  const [photos, stories, historicalMaps, comments, storyComments, site, profiles] =
    await Promise.all([
      getManagedPhotos(),
      getManagedStories(),
      getManagedHistoricalMaps(),
      getManagedComments(),
      getManagedStoryComments(),
      getSiteContent(),
      isAdmin(viewer) ? getProfiles() : Promise.resolve([]),
    ]);

  return (
    <AdminPanel
      viewer={viewer}
      photos={photos}
      stories={stories}
      historicalMaps={historicalMaps}
      comments={comments}
      storyComments={storyComments}
      site={site}
      profiles={profiles}
    />
  );
}
