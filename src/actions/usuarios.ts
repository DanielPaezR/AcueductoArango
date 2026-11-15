"use server";

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db, schema } from "@/db";
import { auditar } from "@/lib/auditoria";
import { olvidarUsuario } from "@/db/contexto";
import { accionesDe, esRolMunicipal, esSeccionMunicipal, PLANTILLAS, ROLES, ROLES_DE_VEREDA, SECCIONES, type Permisos, type Rol } from "@/lib/permisos";
import { requerirPermiso, type UsuarioSesion } from "@/lib/session";
import type { Estado } from "./auth";

const rolSchema = z.enum(Object.keys(ROLES) as [Rol, ...Rol[]]);

function leerPermisos(form: FormData, municipal: boolean): Permisos {
  const p: Record<string, string[]> = {};
  // Un usuario de vereda solo recibe permisos de vereda; uno municipal, solo de la alcaldía
  for (const s of Object.keys(SECCIONES).filter((x) => esSeccionMunicipal(x) === municipal))
    for (const a of accionesDe(s))
      if (form.get(`p.${s}.${a}`) === "on") (p[s] ??= []).push(a);
  return p as Permisos;
}

/** En la pantalla de usuarios de una vereda solo se asignan roles de vereda (los municipales se crean en la alcaldía). */
function validarRolAsignable(_actorRol: string, rol: Rol) {
  if (!(ROLES_DE_VEREDA as readonly string[]).includes(rol))
    throw new Error("Ese rol no es de una vereda: los usuarios de la alcaldía se crean en el módulo de la alcaldía");
}

/** El usuario a gestionar debe ser de la misma vereda de quien lo gestiona. */
async function deMiVereda(yo: UsuarioSesion, id: string) {
  const u = await db.query.usuarios.findFirst({ where: eq(schema.usuarios.id, id) });
  if (!u || !yo.vereda || u.veredaId !== yo.vereda.id || esRolMunicipal(u.rol)) return null;
  return u;
}

const crearSchema = z.object({
  nombre: z.string().trim().min(3, "Nombre muy corto"),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9._-]{3,40}$/, "Usuario: 3–40 caracteres, solo letras, números, punto, guion"),
  telefono: z.string().trim().optional(),
  cargo: z.string().trim().max(60).optional(),
  rol: rolSchema,
  password: z.string().min(8, "La contraseña temporal debe tener al menos 8 caracteres"),
});

export async function crearUsuario(_: Estado, form: FormData): Promise<Estado> {
  const yo = await requerirPermiso("usuarios", "crear");
  const valores = Object.fromEntries(form) as Record<string, string>;
  delete valores.password;
  const p = crearSchema.safeParse(Object.fromEntries(form));
  if (!p.success) return { error: p.error.issues[0].message, valores };
  try {
    validarRolAsignable(yo.rol, p.data.rol);
  } catch (e) {
    return { error: (e as Error).message, valores };
  }

  const existe = await db.query.usuarios.findFirst({ where: eq(schema.usuarios.username, p.data.username) });
  if (existe) return { error: "Ese nombre de usuario ya existe", valores };

  const [nuevo] = await db
    .insert(schema.usuarios)
    .values({
      nombre: p.data.nombre,
      username: p.data.username,
      telefono: p.data.telefono || null,
      cargo: p.data.cargo || null,
      rol: p.data.rol,
      veredaId: yo.vereda!.id,
      permisos: PLANTILLAS[p.data.rol] as Record<string, string[]>,
      passwordHash: await bcrypt.hash(p.data.password, 12),
      debeCambiarPassword: true,
    })
    .returning({ id: schema.usuarios.id });
  await auditar(yo.id, "crear", "usuario", nuevo.id, { username: p.data.username, rol: p.data.rol });
  revalidatePath("/usuarios");
  redirect(`/usuarios/${nuevo.id}`);
}

const editarSchema = z.object({
  id: z.uuid(),
  nombre: z.string().trim().min(3),
  telefono: z.string().trim().optional(),
  cargo: z.string().trim().max(60).optional(),
  rol: rolSchema,
  usarPlantilla: z.string().optional(),
});

export async function editarUsuario(_: Estado, form: FormData): Promise<Estado> {
  const yo = await requerirPermiso("usuarios", "editar");
  const p = editarSchema.safeParse(Object.fromEntries(form));
  if (!p.success) return { error: p.error.issues[0].message };

  const u = await deMiVereda(yo, p.data.id);
  if (!u) return { error: "Usuario no encontrado en esta vereda" };
  try {
    validarRolAsignable(yo.rol, p.data.rol);
  } catch (e) {
    return { error: (e as Error).message };
  }
  if (u.id === yo.id && p.data.rol !== u.rol) return { error: "No puede cambiar su propio rol" };

  const permisos =
    p.data.usarPlantilla === "on" || p.data.rol !== u.rol ? PLANTILLAS[p.data.rol] : leerPermisos(form, false);

  await db
    .update(schema.usuarios)
    .set({
      nombre: p.data.nombre,
      telefono: p.data.telefono || null,
      cargo: p.data.cargo || null,
      rol: p.data.rol,
      permisos: permisos as Record<string, string[]>,
      updatedAt: new Date(),
    })
    .where(eq(schema.usuarios.id, u.id));
  olvidarUsuario(u.id);
  await auditar(yo.id, "editar", "usuario", u.id, { rol: p.data.rol, permisos });
  revalidatePath(`/usuarios/${u.id}`);
  revalidatePath("/usuarios");
  return {
    ok: p.data.rol !== u.rol ? "Rol cambiado; se aplicaron los permisos por defecto del nuevo rol" : "Cambios guardados",
  };
}

export async function cambiarEstadoUsuario(id: string, activo: boolean) {
  const yo = await requerirPermiso("usuarios", "editar");
  if (id === yo.id) throw new Error("No puede desactivar su propio usuario");
  const u = await deMiVereda(yo, id);
  if (!u) throw new Error("Usuario no encontrado en esta vereda");
  await db.update(schema.usuarios).set({ activo, updatedAt: new Date() }).where(eq(schema.usuarios.id, id));
  olvidarUsuario(id);
  await auditar(yo.id, activo ? "activar" : "desactivar", "usuario", id);
  revalidatePath(`/usuarios/${id}`);
  revalidatePath("/usuarios");
}

export async function restablecerPassword(_: Estado, form: FormData): Promise<Estado> {
  const yo = await requerirPermiso("usuarios", "editar");
  const id = String(form.get("id"));
  const password = String(form.get("password") ?? "");
  if (password.length < 8) return { error: "Mínimo 8 caracteres" };
  const u = await deMiVereda(yo, id);
  if (!u) return { error: "Usuario no encontrado en esta vereda" };
  await db
    .update(schema.usuarios)
    .set({ passwordHash: await bcrypt.hash(password, 12), debeCambiarPassword: true, updatedAt: new Date() })
    .where(eq(schema.usuarios.id, id));
  await auditar(yo.id, "restablecer_password", "usuario", id);
  return { ok: "Contraseña temporal asignada. El usuario deberá cambiarla al entrar." };
}
