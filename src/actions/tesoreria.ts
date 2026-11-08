"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db, schema } from "@/db";
import { auditar } from "@/lib/auditoria";
import { CATEGORIAS, leerPesos } from "@/lib/dinero";
import { ROLES, type Rol } from "@/lib/permisos";
import { requerirPermiso } from "@/lib/session";
import type { Estado } from "./auth";

const { movimientos: M, cuentas: C } = schema;

/** Cargo público de un usuario: su cargo en la Junta, o el nombre del rol si no tiene. */
async function cargoDe(usuarioId: string) {
  const u = await db.query.usuarios.findFirst({ where: eq(schema.usuarios.id, usuarioId), columns: { cargo: true, rol: true } });
  return u?.cargo || ROLES[(u?.rol ?? "admin") as Rol];
}

function refrescar() {
  revalidatePath("/tesoreria");
  revalidatePath("/transparencia");
}

const cuentaSchema = z.object({
  nombre: z.string().trim().min(3, "Escriba el nombre de la cuenta").max(80),
  tipo: z.enum(["banco", "efectivo", "billetera"]),
  entidad: z.string().trim().max(60).optional(),
  ultimosDigitos: z
    .string()
    .trim()
    .regex(/^\d{0,6}$/, "Solo los últimos dígitos (máximo 6)")
    .optional(),
  fechaSaldoInicial: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida"),
});

export async function crearCuenta(_: Estado, form: FormData): Promise<Estado> {
  const u = await requerirPermiso("tesoreria", "aprobar");
  const p = cuentaSchema.safeParse(Object.fromEntries(form));
  if (!p.success) return { error: p.error.issues[0].message };
  const saldoInicial = leerPesos(form.get("saldoInicial"));
  if (!Number.isFinite(saldoInicial)) return { error: "Escriba el saldo inicial (puede ser 0)" };
  const [c] = await db
    .insert(C)
    .values({ ...p.data, entidad: p.data.entidad || null, ultimosDigitos: p.data.ultimosDigitos || null, saldoInicial: String(saldoInicial), createdBy: u.id })
    .returning({ id: C.id });
  await auditar(u.id, "crear", "cuenta", String(c.id), { ...p.data, saldoInicial });
  refrescar();
  return { ok: "Cuenta creada" };
}

const movSchema = z.object({
  cuentaId: z.coerce.number().int().positive("Elija la cuenta"),
  tipo: z.enum(["ingreso", "egreso"]),
  categoria: z.string().min(1, "Elija la categoría"),
  concepto: z.string().trim().min(5, "Describa el movimiento (mínimo 5 letras)").max(300),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida"),
});

/** Registra un movimiento manual; queda "por aprobar". Devuelve el id para subir los soportes. */
export async function registrarMovimiento(form: FormData): Promise<{ error?: string; id?: string }> {
  const u = await requerirPermiso("tesoreria", "crear");
  const p = movSchema.safeParse(Object.fromEntries(form));
  if (!p.success) return { error: p.error.issues[0].message };
  if (!(CATEGORIAS[p.data.tipo] as readonly string[]).includes(p.data.categoria)) return { error: "Categoría inválida" };
  const valor = leerPesos(form.get("valor"));
  if (!Number.isFinite(valor) || valor <= 0) return { error: "Escriba un valor mayor a cero" };
  const cuenta = await db.query.cuentas.findFirst({ where: and(eq(C.id, p.data.cuentaId), eq(C.activa, true)) });
  if (!cuenta) return { error: "La cuenta no existe o está inactiva" };

  const [m] = await db
    .insert(M)
    .values({ ...p.data, valor: String(valor), registradoPor: u.id, cargoRegistro: await cargoDe(u.id) })
    .returning({ id: M.id });
  await auditar(u.id, "crear", "movimiento", m.id, { ...p.data, valor });
  refrescar();
  return { id: m.id };
}

export async function aprobarMovimiento(id: string) {
  const u = await requerirPermiso("tesoreria", "aprobar");
  const r = await db
    .update(M)
    .set({ estado: "aprobado", aprobadoPor: u.id, cargoAprobacion: await cargoDe(u.id), aprobadoEn: new Date() })
    .where(and(eq(M.id, id), eq(M.estado, "pendiente")))
    .returning({ id: M.id });
  if (r.length) await auditar(u.id, "aprobar", "movimiento", id);
  refrescar();
}

export async function rechazarMovimiento(id: string, motivo: string) {
  const u = await requerirPermiso("tesoreria", "aprobar");
  if (motivo.trim().length < 3) throw new Error("Escriba el motivo del rechazo");
  const r = await db
    .update(M)
    .set({ estado: "rechazado", aprobadoPor: u.id, cargoAprobacion: await cargoDe(u.id), aprobadoEn: new Date(), motivo: motivo.trim() })
    .where(and(eq(M.id, id), eq(M.estado, "pendiente")))
    .returning({ id: M.id });
  if (r.length) await auditar(u.id, "rechazar", "movimiento", id, { motivo });
  refrescar();
}

/** Anula un movimiento aprobado (queda visible como anulado; no se borra). */
export async function anularMovimiento(id: string, motivo: string) {
  const u = await requerirPermiso("tesoreria", "aprobar");
  if (motivo.trim().length < 3) throw new Error("Escriba el motivo de la anulación");
  const m = await db.query.movimientos.findFirst({ where: eq(M.id, id) });
  if (!m || m.estado !== "aprobado") throw new Error("Solo se pueden anular movimientos aprobados");
  if (m.origen === "pago") throw new Error("Este ingreso viene de un pago: anule el pago desde el suscriptor");
  await db.update(M).set({ estado: "anulado", motivo: motivo.trim() }).where(eq(M.id, id));
  await auditar(u.id, "anular", "movimiento", id, { motivo });
  refrescar();
}
