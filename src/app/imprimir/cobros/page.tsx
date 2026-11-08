import { and, eq, isNull } from "drizzle-orm";
import { db, schema } from "@/db";
import { fechaCorta, hoyBogota, nombreMes, pesos } from "@/lib/dinero";
import { estadoSuscriptores } from "@/lib/finanzas";
import { requerirPermiso } from "@/lib/session";

export const metadata = { title: "Cuentas de cobro" };

/** Una cuenta de cobro por suscriptor activo, dos por hoja, para repartir en la vereda. */
export default async function Cobros({ searchParams }: PageProps<"/imprimir/cobros">) {
  await requerirPermiso("facturacion", "ver");
  const sp = await searchParams;
  const [anio, mes] = (typeof sp.mes === "string" ? sp.mes : hoyBogota().slice(0, 7)).split("-").map(Number);
  const periodo = await db.query.periodos.findFirst({ where: and(eq(schema.periodos.anio, anio), eq(schema.periodos.mes, mes)) });
  if (!periodo) return <p className="text-lg">Todavía no se han generado los cobros de {nombreMes(mes)} {anio}.</p>;
  const [estados, cuentas, viviendas, tarifa] = await Promise.all([
    estadoSuscriptores(),
    db.select().from(schema.cuentas).where(eq(schema.cuentas.activa, true)),
    db.select({ id: schema.viviendas.id, codigo: schema.viviendas.codigo, referencia: schema.viviendas.referencia, nombrePredio: schema.viviendas.nombrePredio }).from(schema.viviendas).where(isNull(schema.viviendas.deletedAt)),
    db.query.tarifas.findFirst({ where: eq(schema.tarifas.id, periodo.tarifaId) }),
  ]);
  const valorMes = Number(tarifa?.valorMensual ?? 0);
  const vivPorId = new Map(viviendas.map((v) => [v.id, v]));
  const activos = estados.filter((e) => e.estado === "activo" && !e.exento);
  const banco = cuentas.find((c) => c.tipo === "banco");

  return (
    <div className="space-y-4 print:space-y-0">
      <p className="text-stone-700 print:hidden">
        <strong className="num">{activos.length}</strong> cuentas de cobro de {nombreMes(mes)} {anio}. Se imprimen dos por hoja.
      </p>
      {activos.map((e) => {
        const v = vivPorId.get(e.viviendaId);
        return (
          <article key={e.id} className="break-inside-avoid rounded-xl border-2 border-stone-800 p-5 print:h-[48vh] print:rounded-none print:border-x-0 print:border-t-0 print:border-b-2 print:border-dashed">
            <header className="flex items-start justify-between gap-4 border-b border-stone-800 pb-2">
              <div>
                <p className="font-bold">JAC Arango · Acueducto veredal</p>
                <p className="text-sm text-stone-700">Cuenta de cobro de {nombreMes(mes)} {anio}</p>
              </div>
              <p className="num text-right font-bold">Matrícula {e.codigo}</p>
            </header>
            <p className="mt-3 text-lg font-bold">{e.titularNombre}</p>
            <p className="text-sm text-stone-700">{[v?.codigo, v?.nombrePredio, v?.referencia].filter(Boolean).join(" · ")}</p>
            <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4 print:grid-cols-4">
              <div>
                <dt className="text-sm text-stone-600">Saldo anterior</dt>
                <dd className="num font-semibold">{pesos(Math.max(0, e.deuda - valorMes))}</dd>
              </div>
              <div>
                <dt className="text-sm text-stone-600">Mensualidad</dt>
                <dd className="num font-semibold">{pesos(valorMes)}</dd>
              </div>
              <div>
                <dt className="text-sm text-stone-600">Total a pagar</dt>
                <dd className="num text-2xl font-bold">{pesos(Math.max(0, e.deuda))}</dd>
              </div>
              <div>
                <dt className="text-sm text-stone-600">Pague antes del</dt>
                <dd className="num font-semibold">{fechaCorta(periodo.fechaVencimiento)}</dd>
              </div>
            </dl>
            {!e.alDia && <p className="mt-2 font-semibold">Tiene {e.mesesAtraso} mes(es) de atraso. Evite la suspensión del servicio.</p>}
            {banco && (
              <p className="mt-2 text-sm text-stone-700">
                Puede consignar en {banco.nombre}
                {banco.entidad ? ` (${banco.entidad})` : ""} o pagar en la tesorería de la Junta.
              </p>
            )}
          </article>
        );
      })}
    </div>
  );
}
