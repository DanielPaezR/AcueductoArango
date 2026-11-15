import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { db, schema } from "@/db";
import { COOKIE_VISTA } from "@/db/contexto";
import { auditar } from "@/lib/auditoria";
import { usuarioActual } from "@/lib/session";

/**
 * El superadmin entra a una vereda para trabajar en ella (?vereda=ID) o vuelve a la vista municipal (?salir=1).
 * Es una cookie de "dónde estoy trabajando"; los permisos se siguen verificando en cada acción.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  // Nunca por una precarga del navegador: solo cuando la persona abre el enlace
  if (req.headers.get("next-router-prefetch") || req.headers.get("purpose") === "prefetch" || req.headers.get("sec-purpose")?.includes("prefetch"))
    return new Response(null, { status: 204 });
  const u = await usuarioActual();
  if (!u || u.rol !== "superadmin") return Response.redirect(new URL("/", url), 303);
  const jar = await cookies();
  const destino = (a: string | null, porDefecto: string) => (a && a.startsWith("/") && !a.startsWith("//") ? a : porDefecto);
  if (url.searchParams.get("salir")) {
    jar.delete(COOKIE_VISTA);
    return Response.redirect(new URL(destino(url.searchParams.get("a"), "/municipio"), url), 303);
  }
  const id = Number(url.searchParams.get("vereda"));
  const v = id ? await db.query.veredas.findFirst({ where: eq(schema.veredas.id, id) }) : null;
  if (!v) return Response.redirect(new URL("/municipio/veredas", url), 303);
  jar.set(COOKIE_VISTA, String(v.id), { httpOnly: true, sameSite: "lax", path: "/", secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 12 });
  await auditar(u.id, "entrar_vereda", "vereda", String(v.id), { nombre: v.nombre });
  return Response.redirect(new URL(destino(url.searchParams.get("a"), "/"), url), 303);
}
