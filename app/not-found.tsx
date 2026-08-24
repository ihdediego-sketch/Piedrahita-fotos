import Link from "next/link";

export default function NotFound() {
  return (
    <div className="not-found">
      <span className="not-found-code">404</span>
      <h1>Te has perdido por el pueblo</h1>
      <p>
        Esta calle no sale ni en el plano más viejo del archivo. Como sigas
        fisgoneando por aquí, te tiramos al pilón.
      </p>
      <Link href="/" className="not-found-link">
        Volver al mapa
      </Link>
    </div>
  );
}
