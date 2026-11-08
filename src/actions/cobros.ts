"use server";

import { and, eq, isNull, notExists, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db, schema } from "@/db";
import { auditar } from "@/lib/auditoria";
import { leerPesos, MEDIOS_PAGO, nombreMes, TIPO_CARGO } from "@/lib/dinero";
import { tarifaVigente } from "@/lib/finanzas";
import { ROLES, type Rol } from "@/lib/permisos";
import { requerirPermiso } from "@/lib/session";
import type { Estado } from "./auth";

const { suscriptores: S, viviendas: V, cargos: CG, pagos: PG, periodos: PE, tarifas: T, movimientos: M } = schema;
const FECHA = /^\d{4}-\d{2}-\d{2}$/;

function refrescar(suscriptorId?: string) {
  revalidatePath("/suscriptores");
  revalidatePath("/facturacion");
  revalidatePath("/tesoreria");
  revalidatePath("/transparencia");
  if (suscriptorId) revalidatePath(`/suscriptores/${suscriptorId}`);
}

/* ---------------- Suscriptores ---------------- */

/** Crea suscriptores para las viviendas del censo que usan el acueducto y aún no tienen uno. */
export async function crearSuscriptoresDesdeCenso(): Promise<Estado> {
  const u = await requerirPermiso("suscriptores", "crear");
  const pendientes = await db
    .select({
      id: V.id,
      numeroMatricula: V.numeroMatricula,
      titularMatriculaNombre: V.titularMatriculaNombre,
      tenencia: V.tenencia,
      jefe: sql<string | null>`(select trim(p.nombres || ' ' || coalesce(p.apellidos, '')) from personas p
        where p.vivienda_id = viviendas.id and p.deleted_at is null order by p.es_jefe_hogar desc, p.created_at limit 1)`,
      jefeId: sql<string | null>`(select p.id from personas p
        where p.vivienda_id = viviendas.id and p.deleted_at is null order by p.es_jefe_hogar desc, p.created_at limit 1)`,
    })
    .from(V)
    .where(
      and(
        isNull(V.deletedAt),
        eq(V.usaAcueducto, true),
        notExists(db.select({ x: sql`1` }).from(S).where(and(eq(S.viviendaId, V.id), isNull(S.deletedAt)))),
      ),
    );

  let creados = 0;
  for (const v of pendientes) {
    const alquilada = v.tenencia === "Alquilada" && v.titularMatriculaNombre;
    const codigo = v.numeroMatricula?.trim();
    const usado = codigo ? await db.query.suscriptores.findFirst({ where: eq(S.codigo, codigo) }) : null;
    await db.insert(S).values({
      ...(codigo && !usado ? { codigo } : {}),
      viviendaId: v.id,
      titularPersonaId: alquilada ? null : v.jefeId,
      titularNombre: (alquilada ? v.titularMatriculaNombre : v.jefe) ?? "Sin titular registrado",
    });
    creados++;
  }
  await auditar(u.id, "crear_desde_censo", "suscriptor", null, { creados });
  refrescar();
  return { ok: creados ? `Se crearon ${creados} suscriptor(es)` : "No hay viviendas nuevas con acueducto" };
}

export async function cambiarEstadoSuscriptor(id: string, estado: "activo" | "suspendido" | "retirado", exento: boolean) {
  const u = await requerirPermiso("suscriptores", "editar");
  await db.update(S).set({ estado, exento, updatedAt: new Date() }).where(eq(S.id, id));
  await auditar(u.id, "editar", "suscriptor", id, { estado, exento });
  refrescar(id);
}

/* ---------------- Tarifas y periodos ---------------- */

export async function crearTarifa(_: Estado, form: FormData): Promise<Estado> {
  const u = await requerirPermiso("facturacion", "editar");
  const valor = leerPesos(form.get("valorMensual"));
  const vigenteDesde = String(form.get("vigenteDesde") ?? "");
  if (!Number.isFinite(valor) || valor <= 0) return { error: "Escriba el valor mensual" };
  if (!FECHA.test(vigenteDesde)) return { error: "Elija desde qué fecha rige" };
  try {
    await db.insert(T).values({
      valorMensual: String(valor),
      vigenteDesde,
      actaAprobacion: String(form.get("actaAprobacion") ?? "").trim() || null,
      createdBy: u.id,
    });
  } catch {
    return { error: "Ya hay una tarifa que rige desde esa fecha" };
  }
  await auditar(u.id, "crear", "tarifa", null, { valor, vigenteDesde });
  refrescar();
  return { ok: "Tarifa guardada" };
}

/** Genera la mensualidad de un mes para todos los suscriptores activos y no exentos. Idempotente. */
export async function generarPeriodo(_: Estado, form: FormData): Promise<Estado> {
  const u = await requerirPermiso("facturacion", "crear");
  const [anio, mes] = String(form.get("mes") ?? "").split("-").map(Number);
  const vencimiento = String(form.get("vencimiento") ?? "");
  if (!anio || !mes) return { error: "Elija el mes" };
  if (!FECHA.test(vencimiento)) return { error: "Elija la fecha límite de pago" };
  const emision = `${anio}-${String(mes).padStart(2, "0")}-01`;
  const tarifa = await tarifaVigente(emision);
  if (!tarifa) return { error: "No hay tarifa vigente para ese mes. Créela primero." };

  const creados = await db.transaction(async (tx) => {
    const [periodo] = await tx
      .insert(PE)
      .values({ anio, mes, fechaEmision: emision, fechaVencimiento: vencimiento, tarifaId: tarifa.id, generadoPor: u.id })
      .onConflictDoUpdate({ target: [PE.anio, PE.mes], set: { fechaVencimiento: vencimiento } })
      .returning({ id: PE.id });
    const activos = await tx
      .select({ id: S.id })
      .from(S)
      .where(and(isNull(S.deletedAt), eq(S.estado, "activo"), eq(S.exento, false)));
    if (!activos.length) return 0;
    const r = await tx
      .insert(CG)
      .values(
        activos.map((s) => ({
          suscriptorId: s.id,
          periodoId: periodo.id,
          tipo: "mensualidad",
          concepto: `Mensualidad ${nombreMes(mes)} ${anio}`,
          valor: tarifa.valorMensual,
          fecha: emision,
          createdBy: u.id,
        })),
      )
      .onConflictDoNothing()
      .returning({ id: CG.id });
    return r.length;
  });
  await auditar(u.id, "generar_periodo", "periodo", `${anio}-${mes}`, { creados });
  refrescar();
  return { ok: creados ? `Se generaron ${creados} cobros de ${nombreMes(mes)} ${anio}` : `Los cobros de ${nombreMes(mes)} ${anio} ya estaban generados` };
}

/* ---------------- Cargos y pagos de un suscriptor ---------------- */

export async function agregarCargo(_: Estado, form: FormData): Promise<Estado> {
  const u = await requerirPermiso("facturacion", "crear");
  const suscriptorId = String(form.get("suscriptorId"));
  const tipo = String(form.get("tipo"));
  const valor = leerPesos(form.get("valor"));
  const fecha = String(form.get("fecha") ?? "");
  const concepto = String(form.get("concepto") ?? "").trim() || TIPO_CARGO[tipo];
  if (!TIPO_CARGO[tipo] || tipo === "mensualidad") return { error: "Tipo de cobro inválido" };
  if (!Number.isFinite(valor) || valor === 0) return { error: "Escriba el valor" };
  if (!FECHA.test(fecha)) return { error: "Fecha inválida" };
  await db.insert(CG).values({ suscriptorId, tipo, concepto, valor: String(valor), fecha, createdBy: u.id });
  await auditar(u.id, "crear", "cargo", suscriptorId, { tipo, valor, concepto });
  refrescar(suscriptorId);
  return { ok: "Cobro agregado" };
}

export async function anularCargo(id: string, motivo: string) {
  const u = await requerirPermiso("facturacion", "editar");
  if (motivo.trim().length < 3) throw new Error("Escriba el motivo");
  const [c] = await db
    .update(CG)
    .set({ anulado: true, motivoAnulacion: motivo.trim() })
    .where(and(eq(CG.id, id), eq(CG.anulado, false)))
    .returning({ suscriptorId: CG.suscriptorId });
  if (c) await auditar(u.id, "anular", "cargo", id, { motivo });
  refrescar(c?.suscriptorId);
}

const pagoSchema = z.object({
  suscriptorId: z.uuid(),
  fecha: z.string().regex(FECHA, "Fecha inválida"),
  medio: z.enum(MEDIOS_PAGO),
  cuentaId: z.coerce.number().int().positive("Elija la cuenta donde entró el dinero"),
  referencia: z.string().trim().max(80).optional(),
});

/** Registra un pago y su ingreso en la tesorería (aprobado automáticamente: está respaldado por el recibo). */
export async function registrarPago(_: Estado, form: FormData): Promise<Estado> {
  const u = await requerirPermiso("facturacion", "crear");
  const p = pagoSchema.safeParse(Object.fromEntries(form));
  if (!p.success) return { error: p.error.issues[0].message };
  const valor = leerPesos(form.get("valor"));
  if (!Number.isFinite(valor) || valor <= 0) return { error: "Escriba el valor pagado" };
  const yo = await db.query.usuarios.findFirst({ where: eq(schema.usuarios.id, u.id), columns: { cargo: true, rol: true } });
  const cargo = yo?.cargo || ROLES[(yo?.rol ?? "admin") as Rol];

  const recibo = await db.transaction(async (tx) => {
    const [pago] = await tx
      .insert(PG)
      .values({ ...p.data, referencia: p.data.referencia || null, valor: String(valor), createdBy: u.id })
      .returning({ id: PG.id, numeroRecibo: PG.numeroRecibo });
    await tx.insert(M).values({
      cuentaId: p.data.cuentaId,
      tipo: "ingreso",
      categoria: "Mensualidades",
      // Sin nombres: este concepto es público
      concepto: `Pago de servicio de acueducto · recibo N.º ${pago.numeroRecibo}`,
      valor: String(valor),
      fecha: p.data.fecha,
      estado: "aprobado",
      origen: "pago",
      pagoId: pago.id,
      registradoPor: u.id,
      cargoRegistro: cargo,
      aprobadoPor: u.id,
      cargoAprobacion: "Automático (respaldado por recibo)",
      aprobadoEn: new Date(),
    });
    return pago.numeroRecibo;
  });
  await auditar(u.id, "crear", "pago", p.data.suscriptorId, { valor, recibo });
  refrescar(p.data.suscriptorId);
  return { ok: `Pago registrado. Recibo N.º ${recibo}` };
}

export async function anularPago(id: string, motivo: string) {
  const u = await requerirPermiso("facturacion", "editar");
  if (motivo.trim().length < 3) throw new Error("Escriba el motivo");
  const pago = await db.transaction(async (tx) => {
    const [pg] = await tx
      .update(PG)
      .set({ anulado: true, motivoAnulacion: motivo.trim() })
      .where(and(eq(PG.id, id), eq(PG.anulado, false)))
      .returning({ suscriptorId: PG.suscriptorId });
    if (pg) await tx.update(M).set({ estado: "anulado", motivo: `Pago anulado: ${motivo.trim()}` }).where(eq(M.pagoId, id));
    return pg;
  });
  if (pago) await auditar(u.id, "anular", "pago", id, { motivo });
  refrescar(pago?.suscriptorId);
}

/** Elimina una tarifa mal registrada, solo si ningún mes de cobro la usa. */
export async function eliminarTarifa(id: number) {
  const u = await requerirPermiso("facturacion", "editar");
  const usada = await db.query.periodos.findFirst({ where: eq(PE.tarifaId, id) });
  if (usada) throw new Error("Esta tarifa ya se usó para cobrar; no se puede eliminar. Registre una nueva.");
  await db.delete(T).where(eq(T.id, id));
  await auditar(u.id, "eliminar", "tarifa", String(id));
  refrescar();
}
