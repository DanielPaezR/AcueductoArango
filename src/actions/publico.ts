"use server";

import { and, eq, isNull, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { db, schema } from "@/db";
import { auditar } from "@/lib/auditoria";
import { estadoSuscriptores } from "@/lib/finanzas";

const { personas: P, suscriptores: S } = schema;

/* Límite simple en memoria: 8 consultas por conexión cada 10 minutos (una sola instancia en Railway). */
const VENTANA_MS = 10 * 60 * 1000;
const MAXIMO = 8;
const intentos = new Map<string, number[]>();

function permitido(ip: string) {
  const ahora = Date.now();
  const lista = (intentos.get(ip) ?? []).filter((t) => ahora - t < VENTANA_MS);
  if (lista.length >= MAXIMO) {
    intentos.set(ip, lista);
    return false;
  }
  lista.push(ahora);
  intentos.set(ip, lista);
  if (intentos.size > 5000) intentos.clear();
  return true;
}

/** "Rosa Elena Arango Gómez" → "Rosa E. A. G." */
function abreviar(nombre: string) {
  const [primero, ...resto] = nombre.trim().split(/\s+/);
  return [primero, ...resto.map((p) => `${p[0]?.toUpperCase()}.`)].join(" ");
}

export type Movimiento = { fecha: string; detalle: string; valor: number; tipo: "cobro" | "pago" };
export type ResultadoConsulta =
  | { error: string }
  | {
      resultados: {
        matricula: string;
        titular: string;
        servicio: string;
        alDia: boolean;
        mesesAtraso: number;
        deudaVencida: number;
        deuda: number;
        ultimoPago: string | null;
        movimientos: Movimiento[];
      }[];
    };

export async function consultarEstado(_: ResultadoConsulta | undefined, form: FormData): Promise<ResultadoConsulta> {
  const cedula = String(form.get("cedula") ?? "").replace(/\D/g, "");
  if (cedula.length < 5 || cedula.length > 12) return { error: "Escriba el número de cédula, solo números." };

  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
  if (!permitido(ip)) return { error: "Hizo muchas consultas seguidas. Espere unos minutos e intente de nuevo." };

  // Suscriptores donde esa cédula es la del titular o la de la cabeza de familia de la vivienda
  const ids = await db
    .selectDistinct({ id: S.id })
    .from(S)
    .innerJoin(P, eq(P.viviendaId, S.viviendaId))
    .where(
      and(
        isNull(S.deletedAt),
        isNull(P.deletedAt),
        sql`regexp_replace(coalesce(${P.numeroDocumento}, ''), '\\D', '', 'g') = ${cedula}`,
        sql`(${S.titularPersonaId} = ${P.id} or ${P.esJefeHogar})`,
      ),
    );

  await auditar(null, "consulta_publica", "estado_cuenta", null, { encontrados: ids.length });
  if (!ids.length)
    return {
      error:
        "No encontramos una matrícula del acueducto con esa cédula. Si usted es suscriptor, pida a la Junta que revise sus datos.",
    };

  const resultados = await Promise.all(
    ids.map(async ({ id }) => {
      const [e] = await estadoSuscriptores({ id });
      const movs = await db.execute<{ fecha: string; detalle: string; valor: string; tipo: "cobro" | "pago" }>(sql`
        (select c.fecha::text as fecha, c.concepto as detalle, c.valor, 'cobro' as tipo, c.created_at
           from cargos c where c.suscriptor_id = ${id} and not c.anulado)
        union all
        (select p.fecha::text, 'Pago · recibo N.º ' || p.numero_recibo, p.valor, 'pago', p.created_at
           from pagos p where p.suscriptor_id = ${id} and not p.anulado)
        order by fecha desc, created_at desc
        limit 8`);
      return {
        matricula: e.codigo,
        titular: abreviar(e.titularNombre),
        servicio: e.estado === "activo" ? "Activo" : e.estado === "suspendido" ? "Suspendido" : "Retirado",
        alDia: e.alDia,
        mesesAtraso: e.mesesAtraso,
        deudaVencida: e.deudaVencida,
        deuda: e.deuda,
        ultimoPago: e.ultimoPago,
        movimientos: movs.rows.map((m) => ({ fecha: m.fecha, detalle: m.detalle, valor: Number(m.valor), tipo: m.tipo })),
      };
    }),
  );
  return { resultados };
}
