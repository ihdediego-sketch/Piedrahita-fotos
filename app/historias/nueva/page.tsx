import { redirect } from "next/navigation";
import { getManagedStories, getPublishedPhotos, getViewer } from "@/lib/data";
import { isStaff } from "@/lib/types";
import SubmitStory from "./SubmitStory";
import "@/components/admin/admin.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Piedrahíta — Escribir una historia" };

export default async function NuevaHistoriaPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/entrar?next=/historias/nueva");

  // Sus propios envíos, para que vea en qué estado están, y las fotos
  // publicadas, para poder elegir portada o insertarlas en el cuerpo.
  const [stories, photos] = await Promise.all([
    getManagedStories(),
    getPublishedPhotos(),
  ]);
  const mine = stories.filter((s) => s.authorId === viewer.id);

  return (
    <SubmitStory
      viewer={viewer}
      mine={mine}
      photos={photos}
      canPublish={isStaff(viewer)}
    />
  );
}
