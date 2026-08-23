import Link from "next/link";
import { redirect } from "next/navigation";
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
        <Link href="/" className="auth-brand">
          Piedrahíta
        </Link>
        <h1>Entrar</h1>
        <p className="hint">
          Te enviamos un enlace al correo. No hay contraseña que recordar.
        </p>
        {error && <p className="admin-error">{error}</p>}
        <LoginForm next={next ?? "/"} />
        <p className="hint auth-foot">
          Si es la primera vez, se te crea la cuenta al entrar. Podrás dar me
          gusta, comentar y enviar fotografías al archivo.
        </p>
      </div>
    </main>
  );
}
