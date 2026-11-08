"use client";

import { Landmark } from "lucide-react";
import { useState, useTransition } from "react";
import { pasarATesoreria } from "@/actions/red";

export function PasarATesoreria({ compraId, cuentas }: { compraId: string; cuentas: { id: number; nombre: string }[] }) {
  const [cuenta, setCuenta] = useState(cuentas[0].id);
  const [pendiente, start] = useTransition();
  const [error, setError] = useState<string>();
  return (
    <div className="mt-3 space-y-2">
      {cuentas.length > 1 && (
        <select className="input" aria-label="Cuenta" value={cuenta} onChange={(e) => setCuenta(Number(e.target.value))}>
          {cuentas.map((c) => (
            <option key={c.id} value={c.id}>{c.nombre}</option>
          ))}
        </select>
      )}
      <button
        className="btn-secundario w-full"
        disabled={pendiente}
        onClick={() =>
          start(async () => {
            try {
              await pasarATesoreria(compraId, cuenta);
            } catch (e) {
              setError((e as Error).message);
            }
          })
        }
      >
        <Landmark className="size-5" aria-hidden />
        {pendiente ? "Enviando…" : "Enviar el gasto a tesorería para aprobación"}
      </button>
      {error && <p className="text-teja-700" role="alert">{error}</p>}
    </div>
  );
}
