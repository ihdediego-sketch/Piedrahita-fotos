import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/**
 * Destino del enlace del correo.
 *
 * Se aceptan las dos formas en que Supabase puede devolver aquí, según cómo
 * esté la plantilla de email del proyecto: `?code=` (flujo PKCE, la de fábrica)
 * y `?token_hash=&type=` (plantilla con `{{ .TokenHash }}`).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  // Solo rutas internas: un `next` con dominio ajeno sería un open redirect
  const raw = searchParams.get("next") ?? "/";
  const next = raw.startsWith("/") && !raw.startsWith("//") ? raw : "/";

  const supabase = await createClient();

  const { error } = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : tokenHash && type
      ? await supabase.auth.verifyOtp({ type, token_hash: tokenHash })
      : { error: { message: "Enlace incompleto" } };

  if (error) {
    const url = new URL("/entrar", origin);
    url.searchParams.set(
      "error",
      "El enlace no es válido o ha caducado. Pide uno nuevo."
    );
    return NextResponse.redirect(url);
  }

  return NextResponse.redirect(new URL(next, origin));
}
