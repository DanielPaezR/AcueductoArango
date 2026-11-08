"use server";

import bcrypt from "bcryptjs";
import { and, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db, schema } from "@/db";
import { auditar } from "@/lib/auditoria";
import { ACCIONES, PLANTILLAS, ROLES, SECCIONES, type Permisos, type Rol } from "@/lib/permisos";
import { requerirPermiso } from "@/lib/session";
import type { Estado } from "./auth";

const rolSchema = z.enum(Object.keys(ROLES) as [Rol, ...Rol[]]);

function leerPermisos(form: FormData): Permisos {
  const p: Record<string, string[]> = {};
  for (const s of Object.keys(SECCIONES))
    for (const a of Object.keys(ACCIONES))
      if (form.get(`p.${s}.${a}`) === "on") (p[s] ??= []).push(a);
  return p as Permisos;
}

/** Solo un superadmin puede crear/editar superadmins. */
function validarRolAsignable(actorRol: string, rol: Rol) {
  if (rol === "superadmin" && actorRol !== "superadmin") throw new Error("Solo un superadmin puede asignar ese rol");
}

const crearSchema = z.object({
  nombre: z.string().trim().min(3, "Nombre muy corto"),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9._-]{3,40}$/, "Usuario: 3–40 caracteres, solo letras, números, punto, guion"),
  telefono: z.string().trim().optional(),
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
      rol: p.data.rol,
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
  rol: rolSchema,
  usarPlantilla: z.string().optional(),
});

export async function editarUsuario(_: Estado, form: FormData): Promise<Estado> {
  const yo = await requerirPermiso("usuarios", "editar");
  const p = editarSchema.safeParse(Object.fromEntries(form));
  if (!p.success) return { error: p.error.issues[0].message };

  const u = await db.query.usuarios.findFirst({ where: eq(schema.usuarios.id, p.data.id) });
  if (!u) return { error: "Usuario no encontrado" };
  try {
    validarRolAsignable(yo.rol, p.data.rol);
    if (u.rol === "superadmin") validarRolAsignable(yo.rol, "superadmin");
  } catch (e) {
    return { error: (e as Error).message };
  }
  if (u.id === yo.id && p.data.rol !== u.rol) return { error: "No puede cambiar su propio rol" };

  const permisos =
    p.data.usarPlantilla === "on" || p.data.rol !== u.rol ? PLANTILLAS[p.data.rol] : leerPermisos(form);

  await db
    .update(schema.usuarios)
    .set({
      nombre: p.data.nombre,
      telefono: p.data.telefono || null,
      rol: p.data.rol,
      permisos: permisos as Record<string, string[]>,
      updatedAt: new Date(),
    })
    .where(eq(schema.usuarios.id, u.id));
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
  const u = await db.query.usuarios.findFirst({ where: eq(schema.usuarios.id, id) });
  if (!u) return;
  if (u.rol === "superadmin") {
    validarRolAsignable(yo.rol, "superadmin");
    if (!activo) {
      const otros = await db.query.usuarios.findFirst({
        where: and(eq(schema.usuarios.rol, "superadmin"), eq(schema.usuarios.activo, true), ne(schema.usuarios.id, id)),
      });
      if (!otros) throw new Error("Debe quedar al menos un superadmin activo");
    }
  }
  await db.update(schema.usuarios).set({ activo, updatedAt: new Date() }).where(eq(schema.usuarios.id, id));
  await auditar(yo.id, activo ? "activar" : "desactivar", "usuario", id);
  revalidatePath(`/usuarios/${id}`);
  revalidatePath("/usuarios");
}

export async function restablecerPassword(_: Estado, form: FormData): Promise<Estado> {
  const yo = await requerirPermiso("usuarios", "editar");
  const id = String(form.get("id"));
  const password = String(form.get("password") ?? "");
  if (password.length < 8) return { error: "Mínimo 8 caracteres" };
  const u = await db.query.usuarios.findFirst({ where: eq(schema.usuarios.id, id) });
  if (!u) return { error: "Usuario no encontrado" };
  if (u.rol === "superadmin" && yo.rol !== "superadmin") return { error: "No permitido" };
  await db
    .update(schema.usuarios)
    .set({ passwordHash: await bcrypt.hash(password, 12), debeCambiarPassword: true, updatedAt: new Date() })
    .where(eq(schema.usuarios.id, id));
  await auditar(yo.id, "restablecer_password", "usuario", id);
  return { ok: "Contraseña temporal asignada. El usuario deberá cambiarla al entrar." };
}
