import { redirect } from "next/navigation";
import AdminPanel from "@/components/admin/AdminPanel";
import {
  getManagedComments,
  getManagedPhotos,
  getProfiles,
  getSiteContent,
  getViewer,
} from "@/lib/data";
import { isAdmin, isStaff } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Piedrahíta — Panel de control" };

export default async function AdminPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/entrar?next=/admin");
  // Un usuario registrado sin permisos tiene su propia pantalla, no un 404
  if (!isStaff(viewer)) redirect("/subir");

  const [photos, comments, site, profiles] = await Promise.all([
    getManagedPhotos(),
    getManagedComments(),
    getSiteContent(),
    isAdmin(viewer) ? getProfiles() : Promise.resolve([]),
  ]);

  return (
    <AdminPanel
      viewer={viewer}
      photos={photos}
      comments={comments}
      site={site}
      profiles={profiles}
    />
  );
}
