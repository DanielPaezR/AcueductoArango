"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db, schema } from "@/db";
import { auditar } from "@/lib/auditoria";
import { TIPOS_PROYECTO } from "@/lib/ayudas";
import { leerPesos } from "@/lib/dinero";
import { requerirPermiso } from "@/lib/session";
import type { Estado } from "./auth";

const { proyectos: PR, participaciones: PA } = schema;
const FECHA = /^\d{4}-\d{2}-\d{2}$/;
const fechaOpc = z
  .string()
  .regex(FECHA)
  .optional()
  .or(z.literal(""))
  .transform((v) => v || null);


const proyectoSchema = z.object({
  nombre: z.string().trim().min(3, "Escriba el nombre").max(160),
  tipo: z.enum(Object.keys(TIPOS_PROYECTO) as [keyof typeof TIPOS_PROYECTO]),
  entidad: z.string().trim().max(120).optional(),
  descripcion: z.string().trim().max(2000).optional(),
  fechaInicio: fechaOpc,
  fechaFin: fechaOpc,
});

export async function crearProyecto(_: Estado, form: FormData): Promise<Estado> {
  const u = await requerirPermiso("ayudas", "crear");
  const p = proyectoSchema.safeParse(Object.fromEntries(form));
  if (!p.success) return { error: p.error.issues[0].message };
  const [r] = await db
    .insert(PR)
    .values({ ...p.data, entidad: p.data.entidad || null, descripcion: p.data.descripcion || null, createdBy: u.id })
    .returning({ id: PR.id });
  await auditar(u.id, "crear", "proyecto", r.id, p.data);
  revalidatePath("/ayudas");
  redirect(`/ayudas/${r.id}`);
}

export async function cambiarEstadoProyecto(id: string, estado: "activo" | "terminado" | "cancelado") {
  const u = await requerirPermiso("ayudas", "editar");
  await db.update(PR).set({ estado, updatedAt: new Date() }).where(eq(PR.id, id));
  await auditar(u.id, "editar", "proyecto", id, { estado });
  revalidatePath(`/ayudas/${id}`);
  revalidatePath("/ayudas");
}

export async function agregarParticipacion(_: Estado, form: FormData): Promise<Estado> {
  const u = await requerirPermiso("ayudas", "crear");
  const proyectoId = String(form.get("proyectoId"));
  const viviendaId = String(form.get("viviendaId") ?? "");
  const personaId = String(form.get("personaId") ?? "") || null;
  const fecha = String(form.get("fecha") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(viviendaId)) return { error: "Elija la vivienda de la lista" };
  if (!FECHA.test(fecha)) return { error: "Fecha inválida" };
  const cantidad = String(form.get("cantidad") ?? "").trim();
  const valor = leerPesos(form.get("valorEstimado"));
  const viv = await db.query.viviendas.findFirst({ where: and(eq(schema.viviendas.id, viviendaId), isNull(schema.viviendas.deletedAt)) });
  if (!viv) return { error: "La vivienda no existe" };
  await db.insert(PA).values({
    proyectoId,
    viviendaId,
    personaId,
    fecha,
    detalle: String(form.get("detalle") ?? "").trim() || null,
    cantidad: cantidad ? String(Number(cantidad.replace(",", "."))) : null,
    valorEstimado: Number.isFinite(valor) && valor > 0 ? String(valor) : null,
    createdBy: u.id,
  });
  await auditar(u.id, "crear", "participacion", proyectoId, { viviendaId });
  revalidatePath(`/ayudas/${proyectoId}`);
  revalidatePath(`/viviendas/${viviendaId}`);
  return { ok: `Registrado: ${viv.codigo}` };
}

export async function quitarParticipacion(id: string) {
  const u = await requerirPermiso("ayudas", "eliminar");
  const [p] = await db.update(PA).set({ deletedAt: new Date() }).where(eq(PA.id, id)).returning({ proyectoId: PA.proyectoId });
  await auditar(u.id, "eliminar", "participacion", id);
  if (p) revalidatePath(`/ayudas/${p.proyectoId}`);
}
