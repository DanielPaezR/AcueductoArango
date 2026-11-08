import { desc, eq, sql } from "drizzle-orm";
import Link from "next/link";
import { db, schema } from "@/db";
import { fechaCorta, hoyBogota, nombreMes, pesos } from "@/lib/dinero";
import { resumenCartera, tarifaVigente } from "@/lib/finanzas";
import { puede } from "@/lib/permisos";
import { requerirPermiso } from "@/lib/session";
import { PeriodoForm, TarifaForm } from "./forms";

export const metadata = { title: "Cobros del mes" };

export default async function Facturacion() {
  const u = await requerirPermiso("facturacion", "ver");
  const hoy = hoyBogota();
  const [tarifa, tarifas, periodos, cartera] = await Promise.all([
    tarifaVigente(),
    db.select().from(schema.tarifas).orderBy(desc(schema.tarifas.vigenteDesde)),
    db
      .select({
        id: schema.periodos.id,
        anio: schema.periodos.anio,
        mes: schema.periodos.mes,
        fechaVencimiento: schema.periodos.fechaVencimiento,
        cobros: sql<number>`(select count(*)::int from cargos c where c.periodo_id = periodos.id and not c.anulado)`,
        total: sql<string>`(select coalesce(sum(c.valor),0) from cargos c where c.periodo_id = periodos.id and not c.anulado)`,
        valorMes: schema.tarifas.valorMensual,
      })
      .from(schema.periodos)
      .innerJoin(schema.tarifas, eq(schema.tarifas.id, schema.periodos.tarifaId))
      .orderBy(desc(schema.periodos.anio), desc(schema.periodos.mes))
      .limit(24),
    resumenCartera(),
  ]);
  const [y, m] = hoy.split("-").map(Number);
  const mesActual = `${y}-${String(m).padStart(2, "0")}`;
  const yaGenerado = periodos.some((p) => p.anio === y && p.mes === m);

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <h1 className="text-[1.75rem] leading-tight font-bold">Cobros del mes</h1>

      <section className="tarjeta" aria-labelledby="resumen">
        <h2 id="resumen" className="text-lg font-bold">
          {nombreMes(cartera.mes).replace(/^./, (c) => c.toUpperCase())} {cartera.anio}
        </h2>
        <p className="mt-1 text-[1.05rem] text-stone-700">
          Recaudado <strong className="num text-stone-900">{pesos(cartera.recaudadoMes)}</strong> de{" "}
          <span className="num">{pesos(cartera.esperadoMes)}</span> cobrados este mes.
        </p>
        <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-stone-200 pt-4 sm:grid-cols-4">
          <div>
            <dt className="text-sm text-stone-600">Al día</dt>
            <dd className="num text-xl font-bold text-postigo-700">{cartera.alDia}</dd>
          </div>
          <div>
            <dt className="text-sm text-stone-600">1 mes de atraso</dt>
            <dd className="num text-xl font-bold">{cartera.atraso1}</dd>
          </div>
          <div>
            <dt className="text-sm text-stone-600">2 meses</dt>
            <dd className="num text-xl font-bold">{cartera.atraso2}</dd>
          </div>
          <div>
            <dt className="text-sm text-stone-600">3 meses o más</dt>
            <dd className={`num text-xl font-bold ${cartera.atraso3mas ? "text-teja-700" : ""}`}>{cartera.atraso3mas}</dd>
          </div>
        </dl>
        <p className="mt-3 text-stone-700">
          Deuda vencida total: <strong className="num">{pesos(cartera.deudaVencida)}</strong>
        </p>
      </section>

      {puede(u, "facturacion", "crear") && (
        <section className="tarjeta" aria-labelledby="generar">
          <h2 id="generar" className="mb-1 text-lg font-bold">Generar la mensualidad</h2>
          <p className="mb-4 text-stone-600">
            Crea el cobro del mes a cada suscriptor activo con la tarifa vigente
            {tarifa ? (
              <> (<strong className="num">{pesos(tarifa.valorMensual)}</strong>)</>
            ) : null}
            . Si ya se generó, no se duplica.
          </p>
          {tarifa ? (
            <PeriodoForm mesActual={mesActual} vencimiento={`${mesActual}-15`} yaGenerado={yaGenerado} />
          ) : (
            <p className="font-semibold text-ocre-800">Primero registre la tarifa mensual abajo.</p>
          )}
        </section>
      )}

      <section aria-labelledby="periodos">
        <h2 id="periodos" className="mb-3 text-lg font-bold">Meses generados</h2>
        {periodos.length ? (
          <ul className="tarjeta divide-y divide-stone-200 p-0 sm:p-0">
            {periodos.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 sm:px-5">
                <div>
                  <div className="font-bold capitalize">{nombreMes(p.mes)} {p.anio}</div>
                  <div className="text-sm text-stone-600">
                    <span className="num">{p.cobros}</span> cobros de <span className="num">{pesos(p.valorMes)}</span> · vence el{" "}
                    <span className="num">{fechaCorta(p.fechaVencimiento)}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="num font-bold">{pesos(p.total)}</div>
                  <Link href={`/imprimir/cobros?mes=${p.anio}-${String(p.mes).padStart(2, "0")}`} className="text-sm font-semibold text-marca-700 underline">
                    Imprimir cuentas de cobro
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="tarjeta text-stone-600">Todavía no se ha generado ningún mes.</div>
        )}
      </section>

      <section className="tarjeta" aria-labelledby="tarifas">
        <h2 id="tarifas" className="mb-1 text-lg font-bold">Tarifa mensual</h2>
        <p className="mb-3 text-stone-700">
          {tarifa ? (
            <>
              Vigente: <strong className="num">{pesos(tarifa.valorMensual)}</strong> desde el{" "}
              <span className="num">{fechaCorta(tarifa.vigenteDesde)}</span>.
            </>
          ) : (
            "No hay tarifa registrada."
          )}
        </p>
        {tarifas.length > 1 && (
          <ul className="mb-4 space-y-1 text-stone-700">
            {tarifas.slice(1).map((t) => (
              <li key={t.id} className="num">
                {pesos(t.valorMensual)} desde {fechaCorta(t.vigenteDesde)}
                {t.actaAprobacion && ` · ${t.actaAprobacion}`}
              </li>
            ))}
          </ul>
        )}
        {puede(u, "facturacion", "editar") && <TarifaForm hoy={hoy} />}
      </section>
    </div>
  );
}
