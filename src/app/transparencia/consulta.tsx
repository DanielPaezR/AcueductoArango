"use client";

import { Search } from "lucide-react";
import { useActionState } from "react";
import { consultarEstado } from "@/actions/publico";
import { fechaCorta, pesos } from "@/lib/dinero";

export function ConsultaEstado() {
  const [estado, accion, pendiente] = useActionState(consultarEstado, undefined);
  return (
    <section className="tarjeta" aria-labelledby="consulta">
      <h2 id="consulta" className="text-lg font-bold">Consulte su estado de cuenta</h2>
      <p className="mt-1 text-stone-700">Escriba la cédula del titular de la matrícula o de la cabeza de familia.</p>
      <form action={accion} className="mt-4 flex flex-col gap-2 sm:flex-row">
        <label htmlFor="cedula" className="sr-only">Número de cédula</label>
        <input
          id="cedula"
          name="cedula"
          className="input num flex-1 text-lg"
          inputMode="numeric"
          autoComplete="off"
          placeholder="Número de cédula"
          required
        />
        <button className="btn-primario sm:w-auto" disabled={pendiente}>
          <Search className="size-5" aria-hidden />
          {pendiente ? "Buscando…" : "Consultar"}
        </button>
      </form>

      <div aria-live="polite">
        {estado && "error" in estado && <p className="mt-4 rounded-lg bg-stone-100 px-4 py-3 text-stone-800">{estado.error}</p>}
        {estado && "resultados" in estado &&
          estado.resultados.map((r) => (
            <div
              key={r.matricula}
              className={`zocalo ${r.alDia ? "zocalo-agua" : "zocalo-alerta"} mt-4 rounded-xl border border-stone-200 bg-stone-50 p-4 pb-5`}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-lg font-bold">{r.titular}</span>
                <span className="num text-sm font-semibold text-stone-600">Matrícula {r.matricula}</span>
              </div>
              <p className={`mt-2 text-2xl font-bold ${r.alDia ? "text-postigo-700" : "text-teja-700"}`}>
                {r.alDia ? "Está al día" : `Tiene ${r.mesesAtraso} mes${r.mesesAtraso === 1 ? "" : "es"} de atraso`}
              </p>
              <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3">
                <div>
                  <dt className="text-sm text-stone-600">{r.alDia ? "Saldo pendiente" : "Valor vencido"}</dt>
                  <dd className="num text-lg font-bold">{pesos(r.alDia ? Math.max(0, r.deuda) : r.deudaVencida)}</dd>
                </div>
                <div>
                  <dt className="text-sm text-stone-600">Último pago</dt>
                  <dd className="num text-lg font-bold">{r.ultimoPago ? fechaCorta(r.ultimoPago) : "Sin pagos"}</dd>
                </div>
                {r.deuda < 0 && (
                  <div>
                    <dt className="text-sm text-stone-600">Saldo a favor</dt>
                    <dd className="num text-lg font-bold text-marca-700">{pesos(-r.deuda)}</dd>
                  </div>
                )}
                {r.servicio !== "Activo" && (
                  <div>
                    <dt className="text-sm text-stone-600">Servicio</dt>
                    <dd className="text-lg font-bold text-ocre-800">{r.servicio}</dd>
                  </div>
                )}
              </dl>
              {r.movimientos.length > 0 && (
                <>
                  <h3 className="mt-4 font-semibold text-stone-800">Últimos movimientos</h3>
                  <ul className="mt-1 divide-y divide-stone-200">
                    {r.movimientos.map((m, i) => (
                      <li key={i} className="flex items-baseline justify-between gap-3 py-2">
                        <span className="min-w-0">
                          <span className="block text-stone-900">{m.detalle}</span>
                          <span className="num text-sm text-stone-600">{fechaCorta(m.fecha)}</span>
                        </span>
                        <span className={`num shrink-0 font-semibold ${m.tipo === "pago" ? "text-marca-700" : "text-stone-900"}`}>
                          {m.tipo === "pago" ? "−" : "+"} {pesos(m.valor)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
              {!r.alDia && (
                <p className="mt-3 text-stone-700">Para ponerse al día, acérquese a la tesorería de la Junta o consigne en la cuenta del acueducto.</p>
              )}
            </div>
          ))}
      </div>
    </section>
  );
}
