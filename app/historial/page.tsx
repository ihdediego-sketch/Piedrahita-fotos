import { redirect } from "next/navigation";
import { getMyComments, getMyPhotos, getViewer } from "@/lib/data";
import Historial from "./Historial";

export const dynamic = "force-dynamic";
export const metadata = { title: "Piedrahíta — Tu historial" };

export default async function HistorialPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/entrar?next=/historial");

  const [photos, comments] = await Promise.all([
    getMyPhotos(viewer.id),
    getMyComments(viewer.id),
  ]);

  return <Historial photos={photos} comments={comments} />;
}
