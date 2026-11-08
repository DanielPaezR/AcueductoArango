"use server";

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db, schema } from "@/db";
import { auditar } from "@/lib/auditoria";
import { crearLimite } from "@/lib/limite";
import { VERSION_TERMINOS } from "@/lib/legal";
import { cerrarSesion, crearSesion, requerirUsuario } from "@/lib/session";

export type Estado = { error?: string; ok?: string; valores?: Record<string, string> } | undefined;

/* Contra adivinar contraseñas: 5 fallos por usuario o 20 por conexión cada 15 minutos. */
const porUsuario = crearLimite(5, 15 * 60 * 1000);
const porIp = crearLimite(20, 15 * 60 * 1000);

export async function login(_: Estado, form: FormData): Promise<Estado> {
  const username = String(form.get("username") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  if (!username || !password) return { error: "Escriba su usuario y contraseña", valores: { username } };

  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (porUsuario.bloqueado(username) || porIp.bloqueado(ip))
    return { error: "Demasiados intentos fallidos. Espere 15 minutos o pida a la presidencia que restablezca su contraseña.", valores: { username } };

  const u = await db.query.usuarios.findFirst({ where: eq(schema.usuarios.username, username) });
  // Comparar siempre para no revelar si el usuario existe por tiempo de respuesta
  const ok = await bcrypt.compare(password, u?.passwordHash ?? "$2b$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinva");
  if (!u || !ok) {
    porUsuario.registrar(username);
    porIp.registrar(ip);
    await auditar(u?.id ?? null, "login_fallido", "usuario", u?.id ?? null, { usuario: username.slice(0, 60), ip });
    return { error: "Usuario o contraseña incorrectos", valores: { username } };
  }
  porUsuario.limpiar(username);
  if (!u.activo) return { error: "Su usuario está desactivado. Hable con la presidencia de la Junta." };

  await db.update(schema.usuarios).set({ ultimoAcceso: new Date() }).where(eq(schema.usuarios.id, u.id));
  await auditar(u.id, "login", "usuario", u.id);
  await crearSesion(u.id);
  redirect(u.debeCambiarPassword ? "/cuenta?primera=1" : "/");
}

export async function logout() {
  await cerrarSesion();
  redirect("/login");
}

const cambioSchema = z
  .object({
    actual: z.string().min(1, "Escriba su contraseña actual"),
    nueva: z.string().min(8, "La nueva contraseña debe tener al menos 8 caracteres"),
    confirmar: z.string(),
  })
  .refine((d) => d.nueva === d.confirmar, { message: "Las contraseñas no coinciden" });

export async function cambiarPassword(_: Estado, form: FormData): Promise<Estado> {
  const yo = await requerirUsuario();
  const p = cambioSchema.safeParse(Object.fromEntries(form));
  if (!p.success) return { error: p.error.issues[0].message };

  const u = await db.query.usuarios.findFirst({ where: eq(schema.usuarios.id, yo.id) });
  if (!u || !(await bcrypt.compare(p.data.actual, u.passwordHash)))
    return { error: "La contraseña actual no es correcta" };

  await db
    .update(schema.usuarios)
    .set({ passwordHash: await bcrypt.hash(p.data.nueva, 12), debeCambiarPassword: false, updatedAt: new Date() })
    .where(eq(schema.usuarios.id, yo.id));
  await auditar(yo.id, "cambiar_password", "usuario", yo.id);
  return { ok: "Contraseña actualizada" };
}

/** Registra que el usuario aceptó la versión vigente de términos, política y compromiso de confidencialidad. */
export async function aceptarTerminos() {
  const yo = await requerirUsuario();
  await db
    .update(schema.usuarios)
    .set({ terminosVersion: VERSION_TERMINOS, terminosAceptadosEn: new Date() })
    .where(eq(schema.usuarios.id, yo.id));
  await auditar(yo.id, "aceptar_terminos", "usuario", yo.id, { version: VERSION_TERMINOS });
  redirect("/");
}
