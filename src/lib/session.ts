import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { cache } from "react";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db, schema } from "@/db";
import { fondosPermitidos, puede, SECCIONES_ACUEDUCTO, type Accion, type FondoPermiso, type Seccion, type Permisos } from "./permisos";

export const SESSION_COOKIE = "vereda_session";
const DURACION_DIAS = 30; // larga, porque en campo no siempre hay señal para volver a entrar

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32)
    throw new Error("Falta SESSION_SECRET (mínimo 32 caracteres) en las variables del servicio web");
  return new TextEncoder().encode(s);
}

export async function crearSesion(usuarioId: string) {
  const expira = new Date(Date.now() + DURACION_DIAS * 864e5);
  const token = await new SignJWT({ sub: usuarioId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expira)
    .sign(secret());
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expira,
  });
}

export async function cerrarSesion() {
  (await cookies()).delete(SESSION_COOKIE);
}

export async function leerToken(token: string | undefined) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ["HS256"] });
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

export type UsuarioSesion = {
  id: string;
  nombre: string;
  username: string;
  rol: string;
  permisos: Permisos;
  debeCambiarPassword: boolean;
  terminosVersion: string | null;
};

/** Usuario actual (consulta la BD en cada request: un usuario desactivado pierde acceso de inmediato). */
export const usuarioActual = cache(async (): Promise<UsuarioSesion | null> => {
  const id = await leerToken((await cookies()).get(SESSION_COOKIE)?.value);
  if (!id) return null;
  const u = await db.query.usuarios.findFirst({ where: eq(schema.usuarios.id, id) });
  if (!u || !u.activo) return null;
  return {
    id: u.id,
    nombre: u.nombre,
    username: u.username,
    rol: u.rol,
    permisos: u.permisos as Permisos,
    debeCambiarPassword: u.debeCambiarPassword,
    terminosVersion: u.terminosVersion,
  };
});

export async function requerirUsuario() {
  const u = await usuarioActual();
  if (!u) redirect("/login");
  return u;
}

export async function requerirPermiso(seccion: Seccion, accion: Accion = "ver") {
  const u = await requerirUsuario();
  // Las secciones del acueducto no existen mientras el módulo esté apagado
  if ((SECCIONES_ACUEDUCTO as readonly string[]).includes(seccion)) {
    const { modulos } = await import("./config");
    if (!(await modulos()).acueducto) redirect("/");
  }
  if (!puede(u, seccion, accion)) redirect("/sin-acceso");
  return u;
}

/** Exige el permiso en al menos un fondo de tesorería; devuelve el usuario y los fondos permitidos. */
export async function requerirAlgunFondo(accion: Accion = "ver") {
  const u = await requerirUsuario();
  const fondos = fondosPermitidos(u, accion);
  if (!fondos.length) redirect("/sin-acceso");
  return { u, fondos };
}

/** Lanza error si el usuario no puede hacer la acción en ese fondo (para server actions). */
export function exigirFondo(u: UsuarioSesion, fondo: FondoPermiso, accion: Accion) {
  if (!fondosPermitidos(u, accion).includes(fondo))
    throw new Error(`No tiene permiso para esta acción en la tesorería ${fondo === "junta" ? "de la Junta" : "del acueducto"}`);
}
