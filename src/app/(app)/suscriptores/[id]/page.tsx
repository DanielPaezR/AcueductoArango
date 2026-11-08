import { and, eq } from "drizzle-orm";
import { ChevronLeft, House } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db, schema } from "@/db";
import { fechaCorta, hoyBogota, MEDIO_LABEL, pesos, TIPO_CARGO } from "@/lib/dinero";
import { cuentasConSaldo, estadoSuscriptores, tarifaVigente } from "@/lib/finanzas";
import { puede } from "@/lib/permisos";
import { requerirPermiso } from "@/lib/session";
import { AnularBoton, CargoForm, EstadoForm, PagoForm } from "./forms";

export const metadata = { title: "Suscriptor" };

export default async function Suscriptor({ params }: PageProps<"/suscriptores/[id]">) {
  const u = await requerirPermiso("suscriptores", "ver");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [e] = await estadoSuscriptores({ id });
  if (!e) notFound();
  const [cargos, pagos, cuentas, tarifa, viv] = await Promise.all([
    db.select().from(schema.cargos).where(eq(schema.cargos.suscriptorId, id)),
    db.select().from(schema.pagos).where(eq(schema.pagos.suscriptorId, id)),
    cuentasConSaldo(true, "acueducto"),
    tarifaVigente(),
    db.query.viviendas.findFirst({ where: and(eq(schema.viviendas.id, e.viviendaId)), columns: { codigo: true, referencia: true, nombrePredio: true } }),
  ]);

  // Libro: cargos (+) y pagos (−) en orden de fecha, con saldo acumulado
  type Linea = { id: string; fecha: string; tipo: "cargo" | "pago"; detalle: string; valor: number; anulado: boolean; motivo: string | null; creado: Date };
  const lineas: Linea[] = [
    ...cargos.map((c) => ({ id: c.id, fecha: c.fecha, tipo: "cargo" as const, detalle: c.concepto || TIPO_CARGO[c.tipo], valor: Number(c.valor), anulado: c.anulado, motivo: c.motivoAnulacion, creado: c.createdAt })),
    ...pagos.map((p) => ({
      id: p.id,
      fecha: p.fecha,
      tipo: "pago" as const,
      detalle: `Pago · recibo N.º ${p.numeroRecibo} · ${MEDIO_LABEL[p.medio] ?? p.medio}${p.referencia ? ` · ${p.referencia}` : ""}`,
      valor: Number(p.valor),
      anulado: p.anulado,
      motivo: p.motivoAnulacion,
      creado: p.createdAt,
    })),
  ].sort((a, b) => a.fecha.localeCompare(b.fecha) || a.creado.getTime() - b.creado.getTime());
  const conSaldo = lineas.reduce<(Linea & { saldo: number })[]>((acc, l) => {
    const previo = acc.at(-1)?.saldo ?? 0;
    const saldo = l.anulado ? previo : previo + (l.tipo === "cargo" ? l.valor : -l.valor);
    return [...acc, { ...l, saldo }];
  }, []);

  const puedeCobrar = puede(u, "facturacion", "crear");
  const puedeAnular = puede(u, "facturacion", "editar");

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link href="/suscriptores" className="inline-flex items-center gap-1 font-semibold text-marca-700 hover:underline">
        <ChevronLeft className="size-5" aria-hidden />
        Suscriptores
      </Link>

      <header>
        <p className="num font-semibold text-stone-500">Matrícula {e.codigo}</p>
        <h1 className="text-[1.75rem] leading-tight font-bold">{e.titularNombre}</h1>
        {viv && (
          <Link href={`/viviendas/${e.viviendaId}`} className="mt-1 inline-flex items-center gap-1.5 text-stone-700 hover:underline">
            <House className="size-4" aria-hidden />
            {[viv.codigo, viv.nombrePredio, viv.referencia].filter(Boolean).join(" · ")}
          </Link>
        )}
      </header>

      <section className={`tarjeta zocalo ${e.alDia ? "zocalo-agua" : "zocalo-alerta"}`} aria-label="Estado de cuenta">
        <div className="grid grid-cols-2 gap-4 pb-2">
          <div>
            <div className="text-sm text-stone-600">Estado</div>
            <div className={`text-xl font-bold ${e.alDia ? "text-postigo-700" : "text-teja-700"}`}>
              {e.alDia ? "Al día" : `${e.mesesAtraso} mes${e.mesesAtraso === 1 ? "" : "es"} de atraso`}
            </div>
          </div>
          <div>
            <div className="text-sm text-stone-600">{e.deuda > 0 ? "Debe" : e.deuda < 0 ? "Saldo a favor" : "Saldo"}</div>
            <div className="num text-xl font-bold">{pesos(Math.abs(e.deuda))}</div>
            {e.deuda > e.deudaVencida && e.deudaVencida >= 0 && (
              <div className="text-sm text-stone-600">
                Vencido: <span className="num">{pesos(e.deudaVencida)}</span>
              </div>
            )}
          </div>
        </div>
      </section>

      {puedeCobrar && (
        <section className="tarjeta" aria-labelledby="pagar">
          <h2 id="pagar" className="mb-3 text-lg font-bold">Registrar pago</h2>
          {cuentas.length ? (
            <PagoForm
              suscriptorId={id}
              cuentas={cuentas.map((c) => ({ id: c.id, nombre: c.nombre }))}
              sugerido={e.deuda > 0 ? e.deuda : Number(tarifa?.valorMensual ?? 0)}
              hoy={hoyBogota()}
            />
          ) : (
            <p className="text-stone-700">Primero cree la cuenta del acueducto en Tesorería.</p>
          )}
        </section>
      )}

      <section aria-labelledby="movs">
        <h2 id="movs" className="mb-3 text-lg font-bold">Estado de cuenta</h2>
        {conSaldo.length ? (
          <ul className="tarjeta divide-y divide-stone-200 p-0 sm:p-0">
            {[...conSaldo].reverse().map((l) => (
              <li key={l.id} className="flex gap-3 px-4 py-3 sm:px-5">
                <div className="min-w-0 flex-1">
                  <div className={`font-semibold ${l.anulado ? "text-stone-500 line-through" : "text-stone-900"}`}>{l.detalle}</div>
                  <div className="num text-sm text-stone-600">{fechaCorta(l.fecha)}</div>
                  {l.anulado && <div className="text-sm text-teja-700">Anulado: {l.motivo}</div>}
                  {l.tipo === "pago" && (
                    <Link href={`/imprimir/recibo/${l.id}`} className="mr-3 inline-block text-sm font-semibold text-marca-700 underline">
                      Ver recibo
                    </Link>
                  )}
                  {!l.anulado && puedeAnular && <AnularBoton id={l.id} tipo={l.tipo} />}
                </div>
                <div className="shrink-0 text-right">
                  <div className={`num font-bold ${l.anulado ? "text-stone-400 line-through" : l.tipo === "pago" ? "text-marca-700" : "text-stone-900"}`}>
                    {l.tipo === "pago" ? "−" : "+"} {pesos(l.valor)}
                  </div>
                  <div className="num text-sm text-stone-600">Saldo {pesos(l.saldo)}</div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="tarjeta text-stone-600">Sin cobros ni pagos todavía.</div>
        )}
      </section>

      {puedeCobrar && (
        <section className="tarjeta" aria-labelledby="cobro">
          <h2 id="cobro" className="mb-1 text-lg font-bold">Agregar otro cobro</h2>
          <p className="mb-3 text-stone-600">Para multas, reconexiones, cuotas extraordinarias o la deuda que traía antes del sistema.</p>
          <CargoForm suscriptorId={id} hoy={hoyBogota()} />
        </section>
      )}

      {puede(u, "suscriptores", "editar") && (
        <section className="tarjeta" aria-labelledby="estado">
          <h2 id="estado" className="mb-3 text-lg font-bold">Estado del servicio</h2>
          <EstadoForm id={id} estado={e.estado as "activo"} exento={e.exento} />
        </section>
      )}
    </div>
  );
}
