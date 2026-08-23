import { redirect } from "next/navigation";
import { getManagedPhotos, getViewer } from "@/lib/data";
import { isStaff } from "@/lib/types";
import SubmitPhoto from "./SubmitPhoto";
import "@/components/admin/admin.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Piedrahíta — Enviar una fotografía" };

export default async function SubirPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/entrar?next=/subir");

  // Sus propios envíos, para que vea en qué estado están
  const mine = (await getManagedPhotos()).filter(
    (p) => p.authorId === viewer.id
  );

  return <SubmitPhoto viewer={viewer} mine={mine} canPublish={isStaff(viewer)} />;
}
