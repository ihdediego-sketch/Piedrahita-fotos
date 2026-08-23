import { notFound } from "next/navigation";
import AdminPanel from "@/components/admin/AdminPanel";

export const metadata = { title: "Piedrahíta — Admin" };

export default function AdminPage() {
  // El CMS solo existe en local: en producción esta ruta no existe.
  if (process.env.NODE_ENV !== "development") notFound();
  return <AdminPanel />;
}
