"use client";

import { useState } from "react";
import { repartoEquitativo, sumaCupos } from "@/lib/cupos";

type Vereda = { id: number; nombre: string; usadas?: number };

/**
 * Cuántas familias se van a ayudar y cómo se reparten entre las veredas.
 * Envía `cupoFamilias`, `reparto` ("equitativo" | "manual") y `cupo_<veredaId>`.
 */
export function CuposEditor({ veredas, total: totalInicial, cupos: cuposIniciales }: { veredas: Vereda[]; total?: number | null; cupos?: Record<number, number> }) {
  const [total, setTotal] = useState(totalInicial ? String(totalInicial) : "");
  const n = Number(total) || 0;
  const igual = repartoEquitativo(n, veredas.map((v) => v.id));
  const esIgual = !cuposIniciales || veredas.every((v) => (cuposIniciales[v.id] ?? 0) === igual[v.id]);
  const [modo, setModo] = useState<"equitativo" | "manual">(esIgual ? "equitativo" : "manual");
  const [manual, setManual] = useState<Record<number, number>>(() => cuposIniciales ?? igual);
  const cupos = modo === "equitativo" ? igual : manual;
  const suma = sumaCupos(cupos);
  const falta = n - suma;

  return (
    <fieldset className="space-y-3 rounded-lg border border-stone-200 p-3">
      <legend className="px-1 font-bold">Familias a ayudar</legend>
      <div>
        <label className="label" htmlFor="cupoFamilias">¿A cuántas familias se va a ayudar? (opcional)</label>
        <input id="cupoFamilias" name="cupoFamilias" className="input num w-48" inputMode="numeric" placeholder="Sin límite" value={total} onChange={(e) => setTotal(e.target.value.replace(/\D/g, ""))} />
        <p className="mt-1 text-sm text-stone-600">Si lo deja vacío, cada Junta puede registrar las familias que quiera.</p>
      </div>
      {n > 0 && (
        <>
          <div className="grid grid-cols-2 gap-2">
            {([
              ["equitativo", "Por igual entre veredas"],
              ["manual", "Como yo decida"],
            ] as const).map(([v, l]) => (
              <label key={v} className="flex min-h-12 cursor-pointer items-center gap-2 rounded-lg border border-stone-300 bg-white px-3 font-semibold has-checked:border-marca-700 has-checked:bg-marca-50 has-checked:ring-2 has-checked:ring-marca-600">
                <input type="radio" name="reparto" value={v} checked={modo === v} onChange={() => setModo(v)} className="size-4 accent-marca-700" />
                {l}
              </label>
            ))}
          </div>
          <table className="w-full text-[0.95rem]">
            <thead className="text-left text-sm text-stone-600">
              <tr>
                <th className="py-1.5 font-semibold">Vereda</th>
                <th className="py-1.5 text-right font-semibold">Cupo</th>
                {veredas.some((v) => v.usadas !== undefined) && <th className="py-1.5 text-right font-semibold">Ya registradas</th>}
              </tr>
            </thead>
            <tbody>
              {veredas.map((v) => (
                <tr key={v.id} className="border-t border-stone-100">
                  <td className="py-1.5">{v.nombre}</td>
                  <td className="py-1.5 text-right">
                    {modo === "manual" ? (
                      <input
                        name={`cupo_${v.id}`}
                        className="input num ml-auto min-h-10 w-24 py-1.5 text-right"
                        inputMode="numeric"
                        aria-label={`Cupo de ${v.nombre}`}
                        value={manual[v.id] ?? 0}
                        onChange={(e) => setManual((m) => ({ ...m, [v.id]: Number(e.target.value.replace(/\D/g, "")) || 0 }))}
                      />
                    ) : (
                      <span className="num font-bold">{igual[v.id]}</span>
                    )}
                  </td>
                  {v.usadas !== undefined && <td className={`num py-1.5 text-right ${(cupos[v.id] ?? 0) < v.usadas ? "font-bold text-teja-700" : "text-stone-600"}`}>{v.usadas}</td>}
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t-2 border-stone-300 font-bold">
              <tr>
                <td className="py-1.5">Total</td>
                <td className="num py-1.5 text-right">{suma}</td>
              </tr>
            </tfoot>
          </table>
          {modo === "manual" && (
            <div className="flex flex-wrap items-center gap-3">
              <p className={falta === 0 ? "text-marca-800" : "font-semibold text-teja-700"} role="status">
                {falta === 0 ? "El reparto coincide con el total." : falta > 0 ? `Faltan ${falta} familias por repartir.` : `Sobran ${-falta} familias: el reparto pasa del total.`}
              </p>
              <button type="button" className="text-sm font-semibold text-marca-700 underline" onClick={() => setManual(igual)}>
                Repartir por igual y ajustar
              </button>
            </div>
          )}
        </>
      )}
    </fieldset>
  );
}
