import Link from "next/link";
import { redirect } from "next/navigation";
import { X } from "lucide-react";
import { getViewer } from "@/lib/data";
import LoginForm from "./LoginForm";
import "@/components/admin/admin.css";

export const metadata = { title: "Piedrahíta — Entrar" };

export default async function EntrarPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;
  const viewer = await getViewer();
  if (viewer) redirect(next && next.startsWith("/") ? next : "/");

  return (
    <main className="auth-page">
      <div className="auth-card">
        <Link href="/" className="auth-close" aria-label="Cerrar y volver al inicio">
          <X aria-hidden size={18} strokeWidth={1.8} />
        </Link>
        <h1>Entrar</h1>
        <p className="hint">
          Pon tu correo y te mandamos un enlace para entrar. Si no tienes
          cuenta, se crea sola.
        </p>
        {error && <p className="admin-error">{error}</p>}
        <LoginForm next={next ?? "/"} />
      </div>
    </main>
  );
}
