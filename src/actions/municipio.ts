"use server";

import bcrypt from "bcryptjs";
import { and, eq, ne, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db, schema } from "@/db";
import { conContexto, olvidarUsuario } from "@/db/contexto";
import { auditar } from "@/lib/auditoria";
import { accionesDe, esRolMunicipal, esSeccionMunicipal, PLANTILLAS, SECCIONES, type Permisos, type Rol } from "@/lib/permisos";
import { requerirMunicipio, type UsuarioSesion } from "@/lib/session";
import type { Estado } from "./auth";

/* ------------------------------------------------------------------ */
/* Veredas                                                             */
/* ------------------------------------------------------------------ */

const slugDe = (t: string) =>
  t
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);

const opc = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => v || null);
const coord = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? Number(v.replace(",", ".")) : null))
  .refine((v) => v === null || Number.isFinite(v), "Coordenada inválida");

const veredaSchema = z.object({
  nombre: z.string().trim().min(2, "Escriba el nombre de la vereda").max(100),
  nombreJac: opc(160),
  nit: opc(30),
  personeriaJuridica: opc(60),
  direccion: opc(200),
  telefono: opc(30),
  email: opc(160),
  metaViviendas: z.coerce.number().int().min(1, "La meta de viviendas debe ser mayor a 0").max(100000),
  lat: coord,
  lng: coord,
});

const usuarioSchema = z.object({
  nombre: z.string().trim().min(3, "Nombre muy corto"),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9._-]{3,40}$/, "Usuario: 3–40 caracteres, solo letras, números, punto, guion"),
  telefono: opc(30),
  cargo: opc(60),
  password: z.string().min(8, "La contraseña temporal debe tener al menos 8 caracteres"),
});

/** Crea una vereda con su presidente(a), y deja el módulo de acueducto como se eligió. */
export async function crearVereda(_: Estado, form: FormData): Promise<Estado> {
  const yo = await requerirMunicipio("municipio_veredas", "crear");
  const valores = Object.fromEntries(form) as Record<string, string>;
  delete valores.password;
  const v = veredaSchema.safeParse(Object.fromEntries(form));
  if (!v.success) return { error: v.error.issues[0].message, valores };
  const p = usuarioSchema.safeParse({
    nombre: form.get("presNombre"),
    username: form.get("presUsuario"),
    telefono: form.get("presTelefono") ?? "",
    cargo: form.get("presCargo") || "Presidencia",
    password: form.get("password"),
  });
  if (!p.success) return { error: `Presidente(a): ${p.error.issues[0].message}`, valores };

  let slug = slugDe(v.data.nombre) || "vereda";
  if (await db.query.veredas.findFirst({ where: eq(schema.veredas.slug, slug) })) slug = `${slug}-${Date.now().toString(36).slice(-4)}`;
  if (await db.query.usuarios.findFirst({ where: eq(schema.usuarios.username, p.data.username) }))
    return { error: "Ese nombre de usuario ya existe: elija otro para el presidente(a)", valores };

  const passwordHash = await bcrypt.hash(p.data.password, 12);
  // Todo o nada: la vereda, su configuración y su presidente(a)
  const { nueva, pres } = await db.transaction(async (tx) => {
    const [nueva] = await tx.insert(schema.veredas).values({ ...v.data, slug }).returning({ id: schema.veredas.id });
    const [pres] = await tx
      .insert(schema.usuarios)
      .values({
        nombre: p.data.nombre,
        username: p.data.username,
        telefono: p.data.telefono,
        cargo: p.data.cargo,
        rol: "admin",
        veredaId: nueva.id,
        permisos: PLANTILLAS.admin as Record<string, string[]>,
        passwordHash,
        debeCambiarPassword: true,
      })
      .returning({ id: schema.usuarios.id });
    // La configuración es de cada vereda: se escribe "dentro" de la vereda nueva (solo en esta transacción)
    await tx.execute(sql`select set_config('app.vereda_id', ${String(nueva.id)}, true)`);
    await tx.insert(schema.configuracion).values({ clave: "modulos", valor: { acueducto: form.get("acueducto") === "on" }, updatedBy: yo.id });
    return { nueva, pres };
  });
  await auditar(yo.id, "crear", "vereda", String(nueva.id), { nombre: v.data.nombre, presidente: p.data.username, usuario: pres.id });
  revalidatePath("/municipio/veredas");
  redirect(`/municipio/veredas/${nueva.id}?creada=1`);
}

export async function editarVereda(_: Estado, form: FormData): Promise<Estado> {
  const yo = await requerirMunicipio("municipio_veredas", "editar");
  const id = Number(form.get("id"));
  const v = veredaSchema.safeParse(Object.fromEntries(form));
  if (!v.success) return { error: v.error.issues[0].message };
  await db
    .update(schema.veredas)
    .set({ ...v.data, activa: form.get("activa") === "on", updatedAt: new Date() })
    .where(eq(schema.veredas.id, id));
  await conContexto({ vereda: id, alcance: "vereda" }, () =>
    db
      .insert(schema.configuracion)
      .values({ clave: "modulos", valor: { acueducto: form.get("acueducto") === "on" }, updatedBy: yo.id })
      .onConflictDoUpdate({
        target: [schema.configuracion.veredaId, schema.configuracion.clave],
        set: { valor: { acueducto: form.get("acueducto") === "on" }, updatedBy: yo.id, updatedAt: new Date() },
      }),
  );
  await auditar(yo.id, "editar", "vereda", String(id), v.data);
  revalidatePath(`/municipio/veredas/${id}`);
  revalidatePath("/municipio/veredas");
  return { ok: "Cambios guardados" };
}

/** Crea un usuario de una vereda desde la alcaldía (normalmente su presidente o un reemplazo). */
export async function crearUsuarioDeVereda(_: Estado, form: FormData): Promise<Estado> {
  const yo = await requerirMunicipio("municipio_veredas", "crear");
  const veredaId = Number(form.get("veredaId"));
  const valores = Object.fromEntries(form) as Record<string, string>;
  delete valores.password;
  const rol = String(form.get("rol") ?? "admin") as Rol;
  if (!["admin", "tesorero", "encuestador", "consulta"].includes(rol)) return { error: "Rol inválido", valores };
  const p = usuarioSchema.safeParse(Object.fromEntries(form));
  if (!p.success) return { error: p.error.issues[0].message, valores };
  if (!(await db.query.veredas.findFirst({ where: eq(schema.veredas.id, veredaId) }))) return { error: "Vereda no encontrada", valores };
  if (await db.query.usuarios.findFirst({ where: eq(schema.usuarios.username, p.data.username) }))
    return { error: "Ese nombre de usuario ya existe", valores };
  const [n] = await db
    .insert(schema.usuarios)
    .values({
      nombre: p.data.nombre,
      username: p.data.username,
      telefono: p.data.telefono,
      cargo: p.data.cargo,
      passwordHash: await bcrypt.hash(p.data.password, 12),
      rol,
      veredaId,
      permisos: PLANTILLAS[rol] as Record<string, string[]>,
      debeCambiarPassword: true,
    })
    .returning({ id: schema.usuarios.id });
  await auditar(yo.id, "crear", "usuario", n.id, { username: p.data.username, rol, veredaId });
  revalidatePath(`/municipio/veredas/${veredaId}`);
  return { ok: `Usuario ${p.data.username} creado. Entréguele la contraseña temporal: deberá cambiarla al entrar.` };
}

/** Restablece la contraseña de un usuario de vereda (p. ej. un presidente que la olvidó). */
export async function restablecerPasswordDeVereda(_: Estado, form: FormData): Promise<Estado> {
  const yo = await requerirMunicipio("municipio_veredas", "editar");
  const id = String(form.get("id"));
  const password = String(form.get("password") ?? "");
  if (password.length < 8) return { error: "Mínimo 8 caracteres" };
  const u = await db.query.usuarios.findFirst({ where: eq(schema.usuarios.id, id) });
  if (!u || esRolMunicipal(u.rol)) return { error: "Usuario no encontrado" };
  await db
    .update(schema.usuarios)
    .set({ passwordHash: await bcrypt.hash(password, 12), debeCambiarPassword: true, updatedAt: new Date() })
    .where(eq(schema.usuarios.id, id));
  await auditar(yo.id, "restablecer_password", "usuario", id);
  return { ok: "Contraseña temporal asignada" };
}

/* ------------------------------------------------------------------ */
/* Usuarios de la alcaldía                                             */
/* ------------------------------------------------------------------ */

function rolMunicipalPermitido(yo: UsuarioSesion, rol: string) {
  if (!esRolMunicipal(rol)) throw new Error("Aquí solo se crean usuarios de la alcaldía");
  if (rol === "superadmin" && yo.rol !== "superadmin") throw new Error("Solo un superadmin puede asignar ese rol");
}

function leerPermisosMunicipales(form: FormData): Permisos {
  const p: Record<string, string[]> = {};
  for (const s of Object.keys(SECCIONES).filter(esSeccionMunicipal))
    for (const a of accionesDe(s)) if (form.get(`p.${s}.${a}`) === "on") (p[s] ??= []).push(a);
  return p as Permisos;
}

export async function crearUsuarioMunicipal(_: Estado, form: FormData): Promise<Estado> {
  const yo = await requerirMunicipio("municipio_veredas", "crear");
  const valores = Object.fromEntries(form) as Record<string, string>;
  delete valores.password;
  const rol = String(form.get("rol")) as Rol;
  try {
    rolMunicipalPermitido(yo, rol);
  } catch (e) {
    return { error: (e as Error).message, valores };
  }
  const p = usuarioSchema.safeParse(Object.fromEntries(form));
  if (!p.success) return { error: p.error.issues[0].message, valores };
  if (await db.query.usuarios.findFirst({ where: eq(schema.usuarios.username, p.data.username) }))
    return { error: "Ese nombre de usuario ya existe", valores };
  const [n] = await db
    .insert(schema.usuarios)
    .values({
      nombre: p.data.nombre,
      username: p.data.username,
      telefono: p.data.telefono,
      cargo: p.data.cargo,
      rol,
      veredaId: null,
      permisos: PLANTILLAS[rol] as Record<string, string[]>,
      passwordHash: await bcrypt.hash(p.data.password, 12),
      debeCambiarPassword: true,
    })
    .returning({ id: schema.usuarios.id });
  await auditar(yo.id, "crear", "usuario", n.id, { username: p.data.username, rol });
  revalidatePath("/municipio/usuarios");
  redirect(`/municipio/usuarios/${n.id}`);
}

async function municipalGestionable(yo: UsuarioSesion, id: string) {
  const u = await db.query.usuarios.findFirst({ where: eq(schema.usuarios.id, id) });
  if (!u || !esRolMunicipal(u.rol)) return null;
  if (u.rol === "superadmin" && yo.rol !== "superadmin") return null;
  return u;
}

export async function editarUsuarioMunicipal(_: Estado, form: FormData): Promise<Estado> {
  const yo = await requerirMunicipio("municipio_veredas", "editar");
  const id = String(form.get("id"));
  const u = await municipalGestionable(yo, id);
  if (!u) return { error: "Usuario no encontrado" };
  const rol = String(form.get("rol") ?? u.rol) as Rol;
  try {
    rolMunicipalPermitido(yo, rol);
  } catch (e) {
    return { error: (e as Error).message };
  }
  if (u.id === yo.id && rol !== u.rol) return { error: "No puede cambiar su propio rol" };
  const nombre = String(form.get("nombre") ?? "").trim();
  if (nombre.length < 3) return { error: "Nombre muy corto" };
  const permisos = form.get("usarPlantilla") === "on" || rol !== u.rol ? PLANTILLAS[rol] : leerPermisosMunicipales(form);
  await db
    .update(schema.usuarios)
    .set({
      nombre,
      telefono: String(form.get("telefono") ?? "").trim() || null,
      cargo: String(form.get("cargo") ?? "").trim() || null,
      rol,
      permisos: permisos as Record<string, string[]>,
      updatedAt: new Date(),
    })
    .where(eq(schema.usuarios.id, id));
  olvidarUsuario(id);
  await auditar(yo.id, "editar", "usuario", id, { rol, permisos });
  revalidatePath(`/municipio/usuarios/${id}`);
  return { ok: "Cambios guardados" };
}

export async function cambiarEstadoUsuarioMunicipal(id: string, activo: boolean) {
  const yo = await requerirMunicipio("municipio_veredas", "editar");
  if (id === yo.id) throw new Error("No puede desactivar su propio usuario");
  const u = await municipalGestionable(yo, id);
  if (!u) throw new Error("Usuario no encontrado");
  if (u.rol === "superadmin" && !activo) {
    const otro = await db.query.usuarios.findFirst({
      where: and(eq(schema.usuarios.rol, "superadmin"), eq(schema.usuarios.activo, true), ne(schema.usuarios.id, id)),
    });
    if (!otro) throw new Error("Debe quedar al menos un superadmin activo");
  }
  await db.update(schema.usuarios).set({ activo, updatedAt: new Date() }).where(eq(schema.usuarios.id, id));
  olvidarUsuario(id);
  await auditar(yo.id, activo ? "activar" : "desactivar", "usuario", id);
  revalidatePath(`/municipio/usuarios/${id}`);
  revalidatePath("/municipio/usuarios");
}

export async function restablecerPasswordMunicipal(_: Estado, form: FormData): Promise<Estado> {
  const yo = await requerirMunicipio("municipio_veredas", "editar");
  const id = String(form.get("id"));
  const password = String(form.get("password") ?? "");
  if (password.length < 8) return { error: "Mínimo 8 caracteres" };
  if (!(await municipalGestionable(yo, id))) return { error: "Usuario no encontrado" };
  await db
    .update(schema.usuarios)
    .set({ passwordHash: await bcrypt.hash(password, 12), debeCambiarPassword: true, updatedAt: new Date() })
    .where(eq(schema.usuarios.id, id));
  await auditar(yo.id, "restablecer_password", "usuario", id);
  return { ok: "Contraseña temporal asignada. El usuario deberá cambiarla al entrar." };
}

/* ------------------------------------------------------------------ */
/* Proyectos y ayudas de la alcaldía                                   */
/* ------------------------------------------------------------------ */

const FECHA = /^\d{4}-\d{2}-\d{2}$/;
const fechaOpc = z
  .string()
  .regex(FECHA)
  .optional()
  .or(z.literal(""))
  .transform((v) => v || null);

const proyectoSchema = z.object({
  nombre: z.string().trim().min(3, "Escriba el nombre").max(160),
  tipo: z.enum(["ayuda", "proyecto", "capacitacion", "minga", "evento", "otro"]),
  entidad: opc(120),
  descripcion: opc(2000),
  fechaInicio: fechaOpc,
  fechaFin: fechaOpc,
});

/** Proyecto de la alcaldía: lo ven todas las veredas y cada Junta puede anotar a sus familias. */
export async function crearProyectoMunicipal(_: Estado, form: FormData): Promise<Estado> {
  const yo = await requerirMunicipio("municipio_ayudas", "crear");
  const p = proyectoSchema.safeParse(Object.fromEntries(form));
  if (!p.success) return { error: p.error.issues[0].message };
  const [r] = await db
    .insert(schema.proyectos)
    .values({ ...p.data, veredaId: null, entidad: p.data.entidad ?? "Alcaldía", createdBy: yo.id })
    .returning({ id: schema.proyectos.id });
  await auditar(yo.id, "crear", "proyecto", r.id, p.data);
  revalidatePath("/municipio/proyectos");
  redirect(`/municipio/proyectos/${r.id}`);
}

export async function cambiarEstadoProyectoMunicipal(id: string, estado: "activo" | "terminado" | "cancelado") {
  const yo = await requerirMunicipio("municipio_ayudas", "editar");
  if (!["activo", "terminado", "cancelado"].includes(estado)) throw new Error("Estado inválido");
  await db.update(schema.proyectos).set({ estado, updatedAt: new Date() }).where(eq(schema.proyectos.id, id));
  await auditar(yo.id, "editar", "proyecto", id, { estado });
  revalidatePath(`/municipio/proyectos/${id}`);
}

/** Registra una familia (de cualquier vereda, con autorización para la alcaldía) como beneficiaria. */
export async function agregarBeneficiarioMunicipal(_: Estado, form: FormData): Promise<Estado> {
  const yo = await requerirMunicipio("municipio_ayudas", "crear");
  const proyectoId = String(form.get("proyectoId"));
  const viviendaId = String(form.get("viviendaId") ?? "");
  const fecha = String(form.get("fecha") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(viviendaId)) return { error: "Elija la familia de la lista" };
  if (!FECHA.test(fecha)) return { error: "Fecha inválida" };
  const pr = await db.query.proyectos.findFirst({ where: eq(schema.proyectos.id, proyectoId) });
  if (!pr) return { error: "Proyecto no encontrado" };
  const viv = await db.query.viviendas.findFirst({ where: eq(schema.viviendas.id, viviendaId) });
  if (!viv || viv.deletedAt) return { error: "La familia no existe" };
  if (!viv.autorizaAlcaldia) return { error: "Esa familia no ha autorizado compartir sus datos con la alcaldía; la puede registrar su Junta." };
  const cantidad = String(form.get("cantidad") ?? "").trim();
  const valor = Number(String(form.get("valorEstimado") ?? "").replace(/[^\d]/g, ""));
  await db.insert(schema.participaciones).values({
    proyectoId,
    viviendaId,
    fecha,
    detalle: String(form.get("detalle") ?? "").trim() || null,
    cantidad: cantidad ? String(Number(cantidad.replace(",", "."))) : null,
    valorEstimado: valor > 0 ? String(valor) : null,
    createdBy: yo.id,
  });
  await auditar(yo.id, "crear", "participacion", proyectoId, { viviendaId });
  revalidatePath(`/municipio/proyectos/${proyectoId}`);
  revalidatePath(`/municipio/familias/${viviendaId}`);
  return { ok: `Registrada la familia ${viv.codigo}` };
}

export async function quitarBeneficiarioMunicipal(id: string) {
  const yo = await requerirMunicipio("municipio_ayudas", "eliminar");
  const [p] = await db
    .update(schema.participaciones)
    .set({ deletedAt: new Date() })
    .where(eq(schema.participaciones.id, id))
    .returning({ proyectoId: schema.participaciones.proyectoId });
  await auditar(yo.id, "eliminar", "participacion", id);
  if (p) revalidatePath(`/municipio/proyectos/${p.proyectoId}`);
}
