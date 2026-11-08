import { Globe, Landmark, Plus } from "lucide-react";
import Link from "next/link";
import { CompartirPublica } from "@/components/compartir-publica";
import { FilaMovimiento } from "@/components/lista-movimientos";
import { FONDOS, pesos, type Fondo } from "@/lib/dinero";
import { cuentasConSaldo, listarMovimientos } from "@/lib/finanzas";
import { puede } from "@/lib/permisos";
import { requerirPermiso } from "@/lib/session";
import { AccionesMovimiento } from "./acciones";

export const metadata = { title: "Tesorería" };

export default async function Tesoreria({ searchParams }: PageProps<"/tesoreria">) {
  const u = await requerirPermiso("tesoreria", "ver");
  const sp = await searchParams;
  const fondo: Fondo = sp.fondo === "junta" ? "junta" : "acueducto";
  const puedeAprobar = puede(u, "tesoreria", "aprobar");
  const [todas, porAprobarTodos, recientes] = await Promise.all([
    cuentasConSaldo(),
    listarMovimientos({ estados: ["pendiente"], limite: 200 }),
    listarMovimientos({ estados: ["aprobado", "rechazado", "anulado"], fondo, limite: 40 }),
  ]);
  const cuentas = todas.filter((c) => c.fondo === fondo);
  const porAprobar = porAprobarTodos.filter((m) => m.fondo === fondo);
  const pendientesDe = (f: Fondo) => porAprobarTodos.filter((m) => m.fondo === f).length;
  const total = cuentas.filter((c) => c.activa).reduce((a, c) => a + c.saldo, 0);

  return (
    <div className="mx-auto max-w-3xl space-y-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[1.75rem] leading-tight font-bold">Tesorería</h1>
        <Link href="/transparencia" className="btn-secundario" target="_blank">
          <Globe className="size-5" aria-hidden />
          Ver página pública
        </Link>
      </div>

      <nav className="grid grid-cols-2 gap-1 rounded-xl bg-stone-200 p-1" aria-label="Fondo">
        {(Object.keys(FONDOS) as Fondo[]).map((f) => (
          <Link
            key={f}
            href={`/tesoreria?fondo=${f}`}
            aria-current={f === fondo ? "page" : undefined}
            className={`flex min-h-12 items-center justify-center gap-2 rounded-lg px-2 text-center font-semibold ${
              f === fondo ? "bg-white text-marca-900 shadow-sm" : "text-stone-700"
            }`}
          >
            {f === "acueducto" ? "Acueducto" : "Junta"}
            {pendientesDe(f) > 0 && <span className="chip num bg-ocre-100 px-2 text-ocre-800">{pendientesDe(f)}</span>}
          </Link>
        ))}
      </nav>

      <section aria-labelledby="cuentas">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 id="cuentas" className="text-lg font-bold">Cuentas {fondo === "acueducto" ? "del acueducto" : "de la Junta"}</h2>
          {puedeAprobar && (
            <Link href={`/tesoreria/cuentas?fondo=${fondo}`} className="font-semibold text-marca-700 hover:underline">
              {cuentas.length ? "Administrar cuentas" : "Crear cuenta"}
            </Link>
          )}
        </div>
        {cuentas.length ? (
          <div className="tarjeta divide-y divide-stone-200 p-0 sm:p-0">
            {cuentas.map((c) => (
              <div key={c.id} className="flex items-center gap-3 px-4 py-3.5 sm:px-5">
                <Landmark className="size-6 shrink-0 text-marca-700" aria-hidden />
                <div className="min-w-0 flex-1">
                  <div className="font-bold">{c.nombre}</div>
                  <div className="text-sm text-stone-600">
                    {[c.entidad, c.ultimosDigitos && `termina en ${c.ultimosDigitos}`, !c.activa && "Inactiva"].filter(Boolean).join(" · ")}
                    {c.pendientes > 0 && <span className="font-semibold text-ocre-800"> · {c.pendientes} por aprobar</span>}
                  </div>
                </div>
                <div className="num text-right text-xl font-bold">{pesos(c.saldo)}</div>
              </div>
            ))}
            {cuentas.length > 1 && (
              <div className="flex items-center justify-between bg-stone-50 px-4 py-3 sm:px-5">
                <span className="font-semibold text-stone-700">Total disponible</span>
                <span className="num text-xl font-bold">{pesos(total)}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="tarjeta text-stone-700">
            Todavía no hay cuentas {fondo === "acueducto" ? "del acueducto" : "de la Junta"}.{" "}
            {puedeAprobar ? "Créela con el saldo que tiene hoy para empezar." : "La presidencia debe crearla."}
          </div>
        )}
      </section>

      {cuentas.some((c) => c.activa) && puede(u, "tesoreria", "crear") && (
        <Link href={`/tesoreria/nuevo?fondo=${fondo}`} className="btn-primario min-h-14 w-full text-lg">
          <Plus className="size-6" aria-hidden />
          Registrar ingreso o gasto {fondo === "acueducto" ? "del acueducto" : "de la Junta"}
        </Link>
      )}

      {porAprobar.length > 0 && (
        <section aria-labelledby="aprobar">
          <h2 id="aprobar" className="mb-1 text-lg font-bold">
            Por aprobar <span className="num font-normal text-stone-500">({porAprobar.length})</span>
          </h2>
          <p className="mb-3 text-stone-600">
            {puedeAprobar
              ? "Revise el soporte antes de aprobar. Al aprobar, el movimiento cuenta en el saldo y queda publicado."
              : "Estos movimientos esperan la aprobación de la presidencia."}
          </p>
          <ul className="space-y-2.5">
            {porAprobar.map((m) => (
              <FilaMovimiento
                key={m.id}
                m={m}
                mostrarCuenta={cuentas.length > 1}
                acciones={puedeAprobar ? <AccionesMovimiento id={m.id} estado={m.estado} origen={m.origen} /> : undefined}
              />
            ))}
          </ul>
        </section>
      )}

      <CompartirPublica />

      <section aria-labelledby="historial">
        <h2 id="historial" className="mb-3 text-lg font-bold">Últimos movimientos</h2>
        {recientes.length ? (
          <ul className="space-y-2.5">
            {recientes.map((m) => (
              <FilaMovimiento
                key={m.id}
                m={m}
                mostrarCuenta={cuentas.length > 1}
                acciones={puedeAprobar ? <AccionesMovimiento id={m.id} estado={m.estado} origen={m.origen} /> : undefined}
              />
            ))}
          </ul>
        ) : (
          <div className="tarjeta text-stone-600">Aún no hay movimientos aprobados.</div>
        )}
      </section>
    </div>
  );
}
