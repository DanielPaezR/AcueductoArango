"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db, schema } from "@/db";
import { auditar } from "@/lib/auditoria";
import { CATEGORIAS_POR_FONDO, leerPesos, type Fondo } from "@/lib/dinero";
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
  fondo: z.enum(["acueducto", "junta"], { message: "Elija si la cuenta es del acueducto o de la Junta" }),
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
  const valor = leerPesos(form.get("valor"));
  if (!Number.isFinite(valor) || valor <= 0) return { error: "Escriba un valor mayor a cero" };
  const cuenta = await db.query.cuentas.findFirst({ where: and(eq(C.id, p.data.cuentaId), eq(C.activa, true)) });
  if (!cuenta) return { error: "La cuenta no existe o está inactiva" };
  if (!(CATEGORIAS_POR_FONDO[cuenta.fondo as Fondo][p.data.tipo] as readonly string[]).includes(p.data.categoria))
    return { error: "Esa categoría no corresponde a la cuenta elegida" };

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

const editarCuentaSchema = z.object({
  id: z.coerce.number().int().positive(),
  nombre: z.string().trim().min(3, "Escriba el nombre").max(80),
  entidad: z.string().trim().max(60).optional(),
  ultimosDigitos: z.string().trim().regex(/^\d{0,6}$/, "Solo los últimos dígitos").optional(),
  activa: z.enum(["si", "no"]),
});

/** Corrige los datos de una cuenta. El saldo inicial no se toca aquí (afectaría lo publicado). */
export async function editarCuenta(_: Estado, form: FormData): Promise<Estado> {
  const u = await requerirPermiso("tesoreria", "aprobar");
  const p = editarCuentaSchema.safeParse(Object.fromEntries(form));
  if (!p.success) return { error: p.error.issues[0].message };
  const datos = { nombre: p.data.nombre, entidad: p.data.entidad || null, ultimosDigitos: p.data.ultimosDigitos || null, activa: p.data.activa === "si" };
  await db.update(C).set(datos).where(eq(C.id, p.data.id));
  await auditar(u.id, "editar", "cuenta", String(p.data.id), datos);
  refrescar();
  return { ok: "Cuenta actualizada" };
}

/** Corrige el saldo inicial dejando el motivo en la bitácora (queda trazable). */
export async function corregirSaldoInicial(_: Estado, form: FormData): Promise<Estado> {
  const u = await requerirPermiso("tesoreria", "aprobar");
  const id = Number(form.get("id"));
  const saldo = leerPesos(form.get("saldoInicial"));
  const motivo = String(form.get("motivo") ?? "").trim();
  if (!Number.isFinite(saldo)) return { error: "Escriba el saldo" };
  if (motivo.length < 5) return { error: "Explique por qué se corrige el saldo" };
  const antes = await db.query.cuentas.findFirst({ where: eq(C.id, id) });
  if (!antes) return { error: "La cuenta no existe" };
  await db.update(C).set({ saldoInicial: String(saldo) }).where(eq(C.id, id));
  await auditar(u.id, "editar", "cuenta", String(id), { saldoInicialAntes: antes.saldoInicial, saldoInicial: saldo, motivo });
  refrescar();
  return { ok: "Saldo inicial corregido (queda registrado en la bitácora)" };
}
