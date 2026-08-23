import Link from "next/link";
import { redirect } from "next/navigation";
import { X } from "lucide-react";
import { getSiteContent, getViewer } from "@/lib/data";
import LoginForm from "./LoginForm";
import "@/components/admin/admin.css";

export const metadata = { title: "Piedrahíta — Entrar" };

export default async function EntrarPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;
  const [viewer, site] = await Promise.all([getViewer(), getSiteContent()]);
  if (viewer) redirect(next && next.startsWith("/") ? next : "/");

  return (
    <main className="auth-page">
      <div className="auth-card">
        <Link href="/" className="auth-close" aria-label="Cerrar y volver al inicio">
          <X aria-hidden size={18} strokeWidth={1.8} />
        </Link>
        <h1>{site.loginTitle}</h1>
        <p className="hint">{site.loginIntro}</p>
        {error && <p className="admin-error">{error}</p>}
        <LoginForm next={next ?? "/"} />
      </div>
    </main>
  );
}
