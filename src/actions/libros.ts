"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db, schema } from "@/db";
import { auditar } from "@/lib/auditoria";
import { leerPesos } from "@/lib/dinero";
import { requerirPermiso } from "@/lib/session";

const FECHA = /^\d{4}-\d{2}-\d{2}$/;
const txt = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => v || null);

/* ---------------- Actas ---------------- */

const actaSchema = z.object({
  id: z.uuid().optional().or(z.literal("")),
  numero: z.string().trim().min(1, "Escriba el número del acta").max(20),
  tipo: z.enum(["asamblea", "asamblea_extraordinaria", "junta_directiva", "otra"]),
  fecha: z.string().regex(FECHA, "Fecha inválida"),
  horaInicio: txt(5),
  horaFin: txt(5),
  lugar: txt(160),
  asistentes: z.coerce.number().int().min(0).max(5000).optional().or(z.literal("")),
  quorum: z.enum(["si", "no", ""]).optional(),
  ordenDelDia: txt(10000),
  desarrollo: txt(50000),
  decisiones: txt(20000),
  presidente: txt(120),
  secretario: txt(120),
});

/** Guarda (crea o corrige) un acta. Devuelve su id para adjuntar la foto del acta firmada. */
export async function guardarActa(form: FormData): Promise<{ error?: string; id?: string }> {
  const p = actaSchema.safeParse(Object.fromEntries(form));
  if (!p.success) return { error: p.error.issues[0].message };
  const u = await requerirPermiso("libro_actas", p.data.id ? "editar" : "crear");
  const { id, asistentes, quorum, ...resto } = p.data;
  const datos = { ...resto, asistentes: asistentes === "" || asistentes === undefined ? null : asistentes, quorum: quorum === "si" ? true : quorum === "no" ? false : null };
  if (id) {
    await db.update(schema.actas).set({ ...datos, updatedBy: u.id, updatedAt: new Date() }).where(eq(schema.actas.id, id));
    await auditar(u.id, "editar", "acta", id, { numero: datos.numero });
    revalidatePath(`/libros/actas/${id}`);
    revalidatePath("/libros/actas");
    return { id };
  }
  const [a] = await db.insert(schema.actas).values({ ...datos, createdBy: u.id, updatedBy: u.id }).returning({ id: schema.actas.id });
  await auditar(u.id, "crear", "acta", a.id, { numero: datos.numero });
  revalidatePath("/libros/actas");
  return { id: a.id };
}

export async function eliminarActa(id: string) {
  const u = await requerirPermiso("libro_actas", "eliminar");
  await db.update(schema.actas).set({ deletedAt: new Date() }).where(eq(schema.actas.id, id));
  await auditar(u.id, "eliminar", "acta", id);
  revalidatePath("/libros/actas");
  redirect("/libros/actas");
}

/* ---------------- Inventario ---------------- */

const itemSchema = z.object({
  id: z.uuid().optional().or(z.literal("")),
  codigo: txt(20),
  nombre: z.string().trim().min(2, "Escriba qué es el bien").max(160),
  descripcion: txt(2000),
  cantidad: z.coerce.number().int().min(0, "Cantidad inválida").max(100000),
  estado: z.enum(["bueno", "regular", "malo", "dado_de_baja"]),
  ubicacion: txt(160),
  fechaAdquisicion: z
    .string()
    .regex(FECHA)
    .optional()
    .or(z.literal(""))
    .transform((v) => v || null),
  procedencia: txt(120),
  observaciones: txt(2000),
});

export async function guardarItem(form: FormData): Promise<{ error?: string; id?: string }> {
  const p = itemSchema.safeParse(Object.fromEntries(form));
  if (!p.success) return { error: p.error.issues[0].message };
  const u = await requerirPermiso("libro_inventario", p.data.id ? "editar" : "crear");
  const valor = leerPesos(form.get("valor"));
  const { id, ...resto } = p.data;
  const datos = { ...resto, valor: Number.isFinite(valor) && valor > 0 ? String(valor) : null };
  if (id) {
    await db.update(schema.inventario).set({ ...datos, updatedBy: u.id, updatedAt: new Date() }).where(eq(schema.inventario.id, id));
    await auditar(u.id, "editar", "inventario", id, datos);
    revalidatePath("/libros/inventario");
    return { id };
  }
  const [i] = await db.insert(schema.inventario).values({ ...datos, createdBy: u.id, updatedBy: u.id }).returning({ id: schema.inventario.id });
  await auditar(u.id, "crear", "inventario", i.id, datos);
  revalidatePath("/libros/inventario");
  return { id: i.id };
}

export async function eliminarItem(id: string) {
  const u = await requerirPermiso("libro_inventario", "eliminar");
  await db.update(schema.inventario).set({ deletedAt: new Date() }).where(eq(schema.inventario.id, id));
  await auditar(u.id, "eliminar", "inventario", id);
  revalidatePath("/libros/inventario");
  redirect("/libros/inventario");
}

/* ---------------- Documentos institucionales ---------------- */

const documentoSchema = z.object({
  id: z.uuid().optional().or(z.literal("")),
  titulo: z.string().trim().min(3, "Escriba el nombre del documento").max(160),
  categoria: z.enum(["estatutos", "reglamento", "fondo_rotatorio", "otro"]),
  descripcion: txt(2000),
  fechaDocumento: z
    .string()
    .regex(FECHA)
    .optional()
    .or(z.literal(""))
    .transform((v) => v || null),
});

export async function guardarDocumento(form: FormData): Promise<{ error?: string; id?: string }> {
  const p = documentoSchema.safeParse(Object.fromEntries(form));
  if (!p.success) return { error: p.error.issues[0].message };
  const u = await requerirPermiso("documentos", p.data.id ? "editar" : "crear");
  const { id, ...datos } = p.data;
  if (id) {
    await db.update(schema.documentos).set({ ...datos, updatedAt: new Date() }).where(eq(schema.documentos.id, id));
    await auditar(u.id, "editar", "documento", id, datos);
    revalidatePath("/documentos");
    return { id };
  }
  const [d] = await db.insert(schema.documentos).values({ ...datos, createdBy: u.id }).returning({ id: schema.documentos.id });
  await auditar(u.id, "crear", "documento", d.id, datos);
  revalidatePath("/documentos");
  return { id: d.id };
}

export async function eliminarDocumento(id: string) {
  const u = await requerirPermiso("documentos", "eliminar");
  await db.update(schema.documentos).set({ deletedAt: new Date() }).where(eq(schema.documentos.id, id));
  await auditar(u.id, "eliminar", "documento", id);
  revalidatePath("/documentos");
  redirect("/documentos");
}
