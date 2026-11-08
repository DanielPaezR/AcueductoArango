import "server-only";
import { and, asc, desc, eq, isNull, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { hoyBogota } from "./dinero";

/* Las subconsultas usan nombres de tabla literales (cuentas.id, suscriptores.id…): Drizzle omite
   el nombre de la tabla en consultas de una sola tabla y la columna quedaría ambigua. */
const { cuentas: C, movimientos: M, suscriptores: S, cargos: CG, pagos: PG, tarifas: T, periodos: PE } = schema;

/** Saldo de cada cuenta = saldo inicial + ingresos aprobados − egresos aprobados. */
export async function cuentasConSaldo(soloActivas = false) {
  const filas = await db
    .select({
      id: C.id,
      nombre: C.nombre,
      tipo: C.tipo,
      entidad: C.entidad,
      ultimosDigitos: C.ultimosDigitos,
      saldoInicial: C.saldoInicial,
      fechaSaldoInicial: C.fechaSaldoInicial,
      activa: C.activa,
      ingresos: sql<string>`coalesce((select sum(m.valor) from movimientos m where m.cuenta_id = cuentas.id and m.estado = 'aprobado' and m.tipo = 'ingreso'), 0)`,
      egresos: sql<string>`coalesce((select sum(m.valor) from movimientos m where m.cuenta_id = cuentas.id and m.estado = 'aprobado' and m.tipo = 'egreso'), 0)`,
      pendientes: sql<number>`(select count(*)::int from movimientos m where m.cuenta_id = cuentas.id and m.estado = 'pendiente')`,
    })
    .from(C)
    .where(soloActivas ? eq(C.activa, true) : undefined)
    .orderBy(asc(C.id));
  return filas.map((c) => ({
    ...c,
    saldo: Number(c.saldoInicial) + Number(c.ingresos) - Number(c.egresos),
  }));
}

export async function tarifaVigente(fecha = hoyBogota()) {
  return db.query.tarifas.findFirst({
    where: sql`${T.vigenteDesde} <= ${fecha}`,
    orderBy: desc(T.vigenteDesde),
  });
}

/**
 * Estado de cuenta de cada suscriptor.
 * - deuda: todo lo cobrado (no anulado) − todo lo pagado (no anulado).
 * - deudaVencida: igual, pero solo cuenta cargos cuyo periodo ya venció (o sin periodo).
 * - mesesAtraso: deuda vencida / tarifa vigente, redondeado hacia arriba.
 */
export async function estadoSuscriptores(filtro?: { id?: string }) {
  const hoy = hoyBogota();
  const tarifa = await tarifaVigente();
  const valorMes = Number(tarifa?.valorMensual ?? 0);
  const filas = await db
    .select({
      id: S.id,
      codigo: S.codigo,
      titularNombre: S.titularNombre,
      viviendaId: S.viviendaId,
      estado: S.estado,
      exento: S.exento,
      cargado: sql<string>`coalesce((select sum(c.valor) from cargos c where c.suscriptor_id = suscriptores.id and not c.anulado), 0)`,
      cargadoVencido: sql<string>`coalesce((select sum(c.valor) from cargos c left join periodos pe on pe.id = c.periodo_id
        where c.suscriptor_id = suscriptores.id and not c.anulado and (pe.id is null or pe.fecha_vencimiento < ${hoy})), 0)`,
      pagado: sql<string>`coalesce((select sum(p.valor) from pagos p where p.suscriptor_id = suscriptores.id and not p.anulado), 0)`,
      ultimoPago: sql<string | null>`(select max(p.fecha)::text from pagos p where p.suscriptor_id = suscriptores.id and not p.anulado)`,
    })
    .from(S)
    .where(and(isNull(S.deletedAt), filtro?.id ? eq(S.id, filtro.id) : undefined))
    .orderBy(asc(S.codigo));

  return filas.map((f) => {
    const deuda = Number(f.cargado) - Number(f.pagado);
    const deudaVencida = Math.max(0, Number(f.cargadoVencido) - Number(f.pagado));
    const mesesAtraso = deudaVencida > 0 && valorMes > 0 ? Math.ceil(deudaVencida / valorMes - 0.001) : deudaVencida > 0 ? 1 : 0;
    return { ...f, deuda, deudaVencida, mesesAtraso, alDia: deudaVencida <= 0 };
  });
}

/** Cifras agregadas para la página pública y la tesorería. Nunca devuelve nombres. */
export async function resumenCartera() {
  const estados = (await estadoSuscriptores()).filter((e) => e.estado !== "retirado" && !e.exento);
  const conteo = { total: estados.length, alDia: 0, atraso1: 0, atraso2: 0, atraso3mas: 0, deudaVencida: 0 };
  for (const e of estados) {
    conteo.deudaVencida += e.deudaVencida;
    if (e.alDia) conteo.alDia++;
    else if (e.mesesAtraso <= 1) conteo.atraso1++;
    else if (e.mesesAtraso === 2) conteo.atraso2++;
    else conteo.atraso3mas++;
  }
  const hoy = hoyBogota();
  const [anio, mes] = hoy.split("-").map(Number);
  const [[esperado], [recaudado]] = await Promise.all([
    db
      .select({ v: sql<string>`coalesce(sum(${CG.valor}), 0)` })
      .from(CG)
      .innerJoin(PE, eq(PE.id, CG.periodoId))
      .where(and(eq(PE.anio, anio), eq(PE.mes, mes), eq(CG.anulado, false))),
    db
      .select({ v: sql<string>`coalesce(sum(${PG.valor}), 0)` })
      .from(PG)
      .where(and(eq(PG.anulado, false), sql`date_trunc('month', ${PG.fecha}) = date_trunc('month', ${hoy}::date)`)),
  ]);
  const suspendidos = estados.filter((e) => e.estado === "suspendido").length;
  return { ...conteo, suspendidos, anio, mes, esperadoMes: Number(esperado.v), recaudadoMes: Number(recaudado.v) };
}

/** Movimientos (para la tesorería o la página pública). */
export async function listarMovimientos(f: { estados?: string[]; cuentaId?: number; limite?: number; offset?: number }) {
  const conds = [];
  if (f.estados?.length) conds.push(sql`${M.estado} in ${f.estados}`);
  if (f.cuentaId) conds.push(eq(M.cuentaId, f.cuentaId));
  return db
    .select({
      id: M.id,
      fecha: M.fecha,
      tipo: M.tipo,
      categoria: M.categoria,
      concepto: M.concepto,
      valor: M.valor,
      estado: M.estado,
      origen: M.origen,
      cargoRegistro: M.cargoRegistro,
      cargoAprobacion: M.cargoAprobacion,
      motivo: M.motivo,
      cuenta: C.nombre,
      cuentaId: M.cuentaId,
      soportes: sql<{ url: string }[]>`coalesce((select json_agg(json_build_object('url', a.url) order by a.created_at)
        from adjuntos a where a.entidad = 'movimiento' and a.entidad_id = movimientos.id and a.deleted_at is null), '[]'::json)`,
    })
    .from(M)
    .innerJoin(C, eq(C.id, M.cuentaId))
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(M.fecha), desc(M.createdAt))
    .limit(f.limite ?? 50)
    .offset(f.offset ?? 0);
}
