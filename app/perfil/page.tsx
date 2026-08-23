import { redirect } from "next/navigation";
import { getViewer } from "@/lib/data";
import ProfileForm from "./ProfileForm";
import "@/components/admin/admin.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Piedrahíta — Tu perfil" };

export default async function PerfilPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/entrar?next=/perfil");

  return <ProfileForm viewer={viewer} />;
}
