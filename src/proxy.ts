import { jwtVerify, SignJWT } from "jose";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Chequeo optimista: si no hay cookie de sesión, mandar al login.
 * La verificación real (firma, usuario activo, permisos) se hace en el servidor
 * en cada página/acción con `requerirUsuario` / `requerirPermiso`.
 *
 * Además renueva la sesión: quien usa la app con señal al menos una vez al mes no vuelve
 * a quedar por fuera (importante en campo, donde lo guardado sin señal necesita la sesión para subir).
 */
const PUBLICAS = ["/login", "/transparencia", "/privacidad", "/terminos"];
const COOKIE = "vereda_session";
const DURACION_DIAS = 30;
const RENOVAR_CADA_S = 24 * 3600;

async function renovar(token: string, res: NextResponse) {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) return;
  const clave = new TextEncoder().encode(s);
  try {
    const { payload } = await jwtVerify(token, clave, { algorithms: ["HS256"] });
    if (typeof payload.sub !== "string" || !payload.iat || Date.now() / 1000 - payload.iat < RENOVAR_CADA_S) return;
    const expira = new Date(Date.now() + DURACION_DIAS * 864e5);
    const nuevo = await new SignJWT({ sub: payload.sub }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime(expira).sign(clave);
    res.cookies.set(COOKIE, nuevo, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", expires: expira });
  } catch {
    // token inválido o vencido: el servidor lo rechazará y pedirá entrar de nuevo
  }
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(COOKIE)?.value;
  if (!token && pathname.startsWith("/api/")) {
    return Response.json({ error: "Sesión vencida. Ingrese de nuevo." }, { status: 401 });
  }
  if (!token && !PUBLICAS.some((p) => pathname.startsWith(p))) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  const res = NextResponse.next();
  // Solo en GET: así una acción como "Cerrar sesión" (POST) nunca recibe una cookie renovada
  if (token && req.method === "GET") await renovar(token, res);
  return res;
}

export const config = {
  matcher: ["/((?!api/health|_next/static|_next/image|favicon.ico|manifest.webmanifest|icons/|sw.js|offline.html).*)"],
};
