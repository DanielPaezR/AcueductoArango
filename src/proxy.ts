import { NextResponse, type NextRequest } from "next/server";

/**
 * Chequeo optimista: si no hay cookie de sesión, mandar al login.
 * La verificación real (firma, usuario activo, permisos) se hace en el servidor
 * en cada página/acción con `requerirUsuario` / `requerirPermiso`.
 */
const PUBLICAS = ["/login"];

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const tieneSesion = req.cookies.has("vereda_session");
  if (!tieneSesion && !PUBLICAS.some((p) => pathname.startsWith(p))) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api/health|_next/static|_next/image|favicon.ico|manifest.webmanifest|icons/|sw.js).*)"],
};
