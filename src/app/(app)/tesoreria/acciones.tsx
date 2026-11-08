"use client";

import { Check, X } from "lucide-react";
import { useState, useTransition } from "react";
import { anularMovimiento, aprobarMovimiento, rechazarMovimiento } from "@/actions/tesoreria";

export function AccionesMovimiento({ id, estado, origen }: { id: string; estado: string; origen: string }) {
  const [pendiente, start] = useTransition();
  const [error, setError] = useState<string>();
  const correr = (f: () => Promise<void>) =>
    start(async () => {
      try {
        setError(undefined);
        await f();
      } catch (e) {
        setError((e as Error).message);
      }
    });

  if (estado === "pendiente")
    return (
      <div className="mt-3 flex flex-wrap gap-2">
        <button className="btn-primario min-h-11" disabled={pendiente} onClick={() => correr(() => aprobarMovimiento(id))}>
          <Check className="size-5" aria-hidden />
          Aprobar
        </button>
        <button
          className="btn-peligro min-h-11"
          disabled={pendiente}
          onClick={() => {
            const motivo = prompt("¿Por qué se rechaza este movimiento?");
            if (motivo) correr(() => rechazarMovimiento(id, motivo));
          }}
        >
          <X className="size-5" aria-hidden />
          Rechazar
        </button>
        {error && <p className="w-full text-teja-700" role="alert">{error}</p>}
      </div>
    );

  if (estado === "aprobado" && origen === "manual")
    return (
      <div className="mt-2">
        <button
          className="text-sm font-semibold text-teja-700 underline"
          disabled={pendiente}
          onClick={() => {
            const motivo = prompt("¿Por qué se anula este movimiento? Quedará visible como anulado.");
            if (motivo) correr(() => anularMovimiento(id, motivo));
          }}
        >
          Anular movimiento
        </button>
        {error && <p className="text-teja-700" role="alert">{error}</p>}
      </div>
    );
  return null;
}
