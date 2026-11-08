import { sql } from "drizzle-orm";
import { Landmark } from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";
import { FilaMovimiento } from "@/components/lista-movimientos";
import { ConsultaEstado } from "./consulta";
import { BotonesCompartir } from "@/components/compartir-botones";
import { urlPublica } from "@/lib/url-publica";
import { db, schema } from "@/db";
import { nombreMes, pesos } from "@/lib/dinero";
import { cuentasConSaldo, listarMovimientos, resumenCartera } from "@/lib/finanzas";

export const metadata = {
  title: "Cuentas claras del acueducto",
  description: "Saldo, recaudo y movimientos del acueducto de la vereda Arango, publicados por la Junta de Acción Comunal.",
};

const POR_PAGINA = 30;

export default async function Transparencia({ searchParams }: PageProps<"/transparencia">) {
  await connection(); // siempre datos del momento
  const sp = await searchParams;
  const pagina = Math.max(1, Number(sp.pagina) || 1);

  const [cuentas, cartera, movimientos, [{ total, porAprobar }]] = await Promise.all([
    cuentasConSaldo(true),
    resumenCartera(),
    listarMovimientos({ estados: ["aprobado", "anulado"], limite: POR_PAGINA, offset: (pagina - 1) * POR_PAGINA }),
    db
      .select({
        total: sql<number>`count(*) filter (where ${schema.movimientos.estado} in ('aprobado','anulado'))::int`,
        porAprobar: sql<number>`count(*) filter (where ${schema.movimientos.estado} = 'pendiente')::int`,
      })
      .from(schema.movimientos),
  ]);
  const saldoTotal = cuentas.reduce((a, c) => a + c.saldo, 0);
  const url = await urlPublica();
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const ahora = new Date().toLocaleString("es-CO", { timeZone: "America/Bogota", dateStyle: "long", timeStyle: "short" });
  const mes = `${nombreMes(cartera.mes)} ${cartera.anio}`;
  const pctRecaudo = cartera.esperadoMes > 0 ? Math.min(100, (cartera.recaudadoMes / cartera.esperadoMes) * 100) : 0;
  const tramos = [
    { label: "Al día", n: cartera.alDia, color: "bg-postigo-600" },
    { label: "1 mes de atraso", n: cartera.atraso1, color: "bg-ocre-500" },
    { label: "2 meses de atraso", n: cartera.atraso2, color: "bg-[#d0632a]" },
    { label: "3 meses o más", n: cartera.atraso3mas, color: "bg-teja-600" },
  ];

  return (
    <div className="min-h-dvh">
      <header className="bg-marca-800 px-4 pt-6 pb-8 text-marca-50 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <p className="font-semibold text-marca-100">JAC Arango · Acueducto veredal · Concepción, Antioquia</p>
          <h1 className="mt-2 text-[2rem] leading-tight font-bold text-white">Cuentas claras del acueducto</h1>
          <p className="mt-2 text-lg text-marca-100">
            La plata del acueducto es de todos. Aquí se publica, en tiempo real, cuánto hay, cuánto entra y en qué se gasta.
          </p>
        </div>
      </header>

      <main className="mx-auto -mt-4 max-w-3xl space-y-8 px-4 pb-16 sm:px-6">
        <ConsultaEstado />

        <section className="tarjeta zocalo zocalo-agua" aria-labelledby="saldo">
          <h2 id="saldo" className="text-lg font-bold">Dinero disponible hoy</h2>
          <p className="num mt-1 text-[2.5rem] leading-tight font-bold text-stone-900">{pesos(saldoTotal)}</p>
          {cuentas.length > 0 && (
            <ul className="mt-3 space-y-1.5 border-t border-stone-200 pt-3 pb-2">
              {cuentas.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3 text-stone-700">
                  <span className="flex min-w-0 items-start gap-2">
                    <Landmark className="mt-1 size-4 shrink-0 text-stone-500" aria-hidden />
                    <span>
                      {c.nombre}
                      {c.ultimosDigitos && <span className="num whitespace-nowrap text-stone-500"> (termina en {c.ultimosDigitos})</span>}
                    </span>
                  </span>
                  <span className="num font-semibold">{pesos(c.saldo)}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="text-sm text-stone-600">Actualizado: {ahora}</p>
        </section>

        <section className="tarjeta" aria-labelledby="mes">
          <h2 id="mes" className="text-lg font-bold">Recaudo de {mes}</h2>
          <p className="mt-1 text-[1.05rem] text-stone-700">
            Se han recogido <strong className="num text-stone-900">{pesos(cartera.recaudadoMes)}</strong> de{" "}
            <span className="num">{pesos(cartera.esperadoMes)}</span> que se cobraron este mes.
          </p>
          <div className="mt-3 h-4 overflow-hidden rounded-full bg-stone-100 ring-1 ring-stone-200 ring-inset" role="img" aria-label={`${Math.round(pctRecaudo)} % recaudado`}>
            <div className="h-full bg-marca-600" style={{ width: `${pctRecaudo}%` }} />
          </div>
        </section>

        <section className="tarjeta" aria-labelledby="pagos">
          <h2 id="pagos" className="text-lg font-bold">¿Cómo van los pagos?</h2>
          <p className="mt-1 text-stone-700">
            De <strong className="num">{cartera.total}</strong> suscriptores, <strong className="num text-postigo-700">{cartera.alDia}</strong> están al día.
            Por respeto, no se publican nombres: solo cantidades.
          </p>
          {cartera.total > 0 && (
            <div className="mt-3 flex h-5 overflow-hidden rounded-full ring-1 ring-stone-200 ring-inset" role="img" aria-label={tramos.map((t) => `${t.label}: ${t.n}`).join(", ")}>
              {tramos.map((t) => (
                <div key={t.label} className={t.color} style={{ width: `${(t.n / cartera.total) * 100}%` }} />
              ))}
            </div>
          )}
          <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
            {tramos.map((t) => (
              <div key={t.label}>
                <dt className="flex items-center gap-1.5 text-sm text-stone-600">
                  <span className={`size-3 rounded-sm ${t.color}`} aria-hidden />
                  {t.label}
                </dt>
                <dd className="num text-xl font-bold">{t.n}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 border-t border-stone-200 pt-3 text-stone-700">
            Dinero que se debe al acueducto: <strong className="num">{pesos(cartera.deudaVencida)}</strong>
            {cartera.suspendidos > 0 && (
              <>
                {" · "}Servicios suspendidos: <strong className="num">{cartera.suspendidos}</strong>
              </>
            )}
          </p>
        </section>

        <section aria-labelledby="movimientos">
          <h2 id="movimientos" className="text-lg font-bold">Movimientos de la cuenta</h2>
          <p className="mt-1 mb-3 text-stone-700">
            Cada ingreso y gasto, con el cargo de quien lo registró y lo aprobó, y la foto de su soporte.
            {porAprobar > 0 && (
              <>
                {" "}Hay <strong className="num">{porAprobar}</strong> movimiento{porAprobar === 1 ? "" : "s"} esperando aprobación de la presidencia.
              </>
            )}
          </p>
          {movimientos.length ? (
            <ul className="space-y-2.5">
              {movimientos.map((m) => (
                <FilaMovimiento key={m.id} m={m} mostrarCuenta={cuentas.length > 1} />
              ))}
            </ul>
          ) : (
            <div className="tarjeta text-stone-600">Todavía no hay movimientos publicados.</div>
          )}
          {paginas > 1 && (
            <nav className="mt-4 flex items-center justify-center gap-3" aria-label="Páginas">
              {pagina > 1 && <Link className="btn-secundario" href={`/transparencia?pagina=${pagina - 1}`}>Más recientes</Link>}
              <span className="num text-stone-700">Página {pagina} de {paginas}</span>
              {pagina < paginas && <Link className="btn-secundario" href={`/transparencia?pagina=${pagina + 1}`}>Anteriores</Link>}
            </nav>
          )}
        </section>

        <section className="tarjeta" aria-labelledby="compartir">
          <h2 id="compartir" className="mb-3 text-lg font-bold">Compartir con los vecinos</h2>
          <BotonesCompartir
            url={url}
            mensaje={`Cuentas claras del acueducto de la vereda Arango: saldo, gastos con facturas y consulta del estado de cuenta con la cédula. ${url}`}
          />
        </section>

        <footer className="border-t border-stone-200 pt-5 text-stone-600">
          Publicado por la Junta de Acción Comunal de la vereda Arango. ¿Dudas sobre algún movimiento? Pregunte en la próxima asamblea o a la presidencia de la Junta.
        </footer>
      </main>
    </div>
  );
}
