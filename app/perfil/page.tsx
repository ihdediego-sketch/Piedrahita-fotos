import { redirect } from "next/navigation";
import { getMyComments, getMyPhotos, getViewer } from "@/lib/data";
import ProfileForm from "./ProfileForm";
import "@/components/admin/admin.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Piedrahíta — Tu perfil" };

export default async function PerfilPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/entrar?next=/perfil");

  const [photos, comments] = await Promise.all([
    getMyPhotos(viewer.id),
    getMyComments(viewer.id),
  ]);

  return <ProfileForm viewer={viewer} photos={photos} comments={comments} />;
}
