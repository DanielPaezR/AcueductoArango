import "server-only";
import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { db, schema } from "@/db";

export type Asiento = {
  id: string;
  numero: number;
  fecha: string;
  tipo: "ingreso" | "egreso";
  categoria: string;
  concepto: string;
  comprobante: string | null;
  valor: number;
  estado: string;
  motivo: string | null;
  cuenta: string;
  registro: string | null;
  editado: boolean;
  soportes: { url: string }[];
  saldo: number;
};

/**
 * Libro de contabilidad de la Junta para un año (o todo): saldo anterior, asientos en orden de fecha con el
 * saldo corrido (los anulados se muestran pero no suman) y totales del periodo.
 */
export async function datosLibro(anio?: number) {
  const { rows: cuentas } = await db.execute<{ id: number; nombre: string; entidad: string | null; ultimos_digitos: string | null; saldo_inicial: string; fecha_saldo_inicial: string; activa: boolean }>(
    sql`select id, nombre, entidad, ultimos_digitos, saldo_inicial, fecha_saldo_inicial::text, activa from cuentas where fondo = 'junta' order by id`,
  );
  const inicial = cuentas.reduce((a, c) => a + Number(c.saldo_inicial), 0);
  const desde = anio ? `${anio}-01-01` : "0001-01-01";
  const hasta = anio ? `${anio}-12-31` : "9999-12-31";

  const [{ rows: previo }, { rows }] = await Promise.all([
    db.execute<{ neto: string }>(sql`
      select coalesce(sum(case when m.tipo = 'ingreso' then m.valor else -m.valor end), 0) as neto
      from movimientos m join cuentas c on c.id = m.cuenta_id
      where c.fondo = 'junta' and m.estado = 'aprobado' and m.fecha < ${desde}::date`),
    db.execute<{
      id: string;
      numero: number;
      fecha: string;
      tipo: "ingreso" | "egreso";
      categoria: string;
      concepto: string;
      comprobante: string | null;
      valor: string;
      estado: string;
      motivo: string | null;
      cuenta: string;
      registro: string | null;
      editado: boolean;
      soportes: { url: string }[];
    }>(sql`
      select m.id, m.numero, m.fecha::text, m.tipo, m.categoria, m.concepto, m.comprobante, m.valor, m.estado, m.motivo,
        c.nombre as cuenta, m.cargo_registro as registro, exists (select 1 from movimientos_historial h where h.movimiento_id = m.id and h.accion = 'editar') as editado,
        coalesce((select json_agg(json_build_object('url', a.url) order by a.created_at) from adjuntos a
          where a.entidad = 'movimiento' and a.entidad_id = m.id and a.deleted_at is null), '[]'::json) as soportes
      from movimientos m join cuentas c on c.id = m.cuenta_id
      where c.fondo = 'junta' and m.fecha between ${desde}::date and ${hasta}::date
      order by m.fecha, m.numero`),
  ]);

  const saldoAnterior = inicial + Number(previo[0]?.neto ?? 0);
  let saldo = saldoAnterior;
  let ingresos = 0;
  let egresos = 0;
  const asientos: Asiento[] = rows.map((r) => {
    const valor = Number(r.valor);
    if (r.estado === "aprobado") {
      if (r.tipo === "ingreso") {
        saldo += valor;
        ingresos += valor;
      } else {
        saldo -= valor;
        egresos += valor;
      }
    }
    return { ...r, valor, saldo };
  });
  const { rows: anios } = await db.execute<{ anio: number }>(sql`
    select distinct extract(year from m.fecha)::int as anio from movimientos m join cuentas c on c.id = m.cuenta_id
    where c.fondo = 'junta' order by 1 desc`);
  return { cuentas, saldoAnterior, asientos, ingresos, egresos, saldoFinal: saldo, anios: anios.map((a) => a.anio) };
}

/** Adjuntos visibles (no privados) de un registro. */
export async function adjuntosDe(entidad: string, entidadId: string) {
  const A = schema.adjuntos;
  return db
    .select({ id: A.id, url: A.url, tipo: A.tipo })
    .from(A)
    .where(and(eq(A.entidad, entidad), eq(A.entidadId, entidadId), eq(A.privado, false), isNull(A.deletedAt)))
    .orderBy(asc(A.createdAt));
}

/** Saldo actual del libro de la Junta (para el inicio). */
export async function saldoJunta() {
  const { rows } = await db.execute<{ saldo: string; asientos: number; cuentas: number }>(sql`
    select (select coalesce(sum(saldo_inicial), 0) from cuentas where fondo = 'junta')
      + coalesce(sum(case when m.tipo = 'ingreso' then m.valor else -m.valor end) filter (where m.estado = 'aprobado'), 0) as saldo,
      count(m.id)::int as asientos,
      (select count(*)::int from cuentas where fondo = 'junta') as cuentas
    from movimientos m join cuentas c on c.id = m.cuenta_id and c.fondo = 'junta'`);
  return { saldo: Number(rows[0]?.saldo ?? 0), asientos: rows[0]?.asientos ?? 0, cuentas: rows[0]?.cuentas ?? 0 };
}
