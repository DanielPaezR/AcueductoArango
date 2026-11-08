"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db, schema } from "@/db";
import { auditar } from "@/lib/auditoria";
import { requerirPermiso } from "@/lib/session";
import type { Estado } from "./auth";

export async function eliminarVivienda(id: string) {
  const u = await requerirPermiso("censo", "eliminar");
  const ahora = new Date();
  await db.transaction(async (tx) => {
    await tx.update(schema.viviendas).set({ deletedAt: ahora, updatedBy: u.id }).where(eq(schema.viviendas.id, id));
    await tx
      .update(schema.personas)
      .set({ deletedAt: ahora })
      .where(and(eq(schema.personas.viviendaId, id), isNull(schema.personas.deletedAt)));
  });
  await auditar(u.id, "eliminar", "vivienda", id);
  revalidatePath("/viviendas");
  redirect("/viviendas");
}

const sectorSchema = z.object({
  id: z.coerce.number().int().optional(),
  nombre: z.string().trim().min(2, "Nombre muy corto").max(100),
  descripcion: z.string().trim().max(500).optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional()
    .or(z.literal("")),
});

export async function guardarSector(_: Estado, form: FormData): Promise<Estado> {
  const u = await requerirPermiso("censo", "editar");
  const p = sectorSchema.safeParse(Object.fromEntries(form));
  if (!p.success) return { error: p.error.issues[0].message };
  const datos = { nombre: p.data.nombre, descripcion: p.data.descripcion || null, color: p.data.color || null };
  try {
    if (p.data.id) await db.update(schema.sectores).set(datos).where(eq(schema.sectores.id, p.data.id));
    else await db.insert(schema.sectores).values(datos);
  } catch {
    return { error: "Ya existe un sector con ese nombre" };
  }
  await auditar(u.id, p.data.id ? "editar" : "crear", "sector", p.data.id ? String(p.data.id) : null, datos);
  revalidatePath("/viviendas/sectores");
  return { ok: "Sector guardado" };
}
