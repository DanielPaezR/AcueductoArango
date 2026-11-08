"use client";

import { useActionState, useState, useTransition } from "react";
import { crearTarifa, eliminarTarifa, generarPeriodo } from "@/actions/cobros";

const Msg = ({ e }: { e?: { error?: string; ok?: string } }) =>
  e?.error ? (
    <p className="rounded-lg bg-teja-50 px-3 py-2.5 text-teja-700" role="alert">{e.error}</p>
  ) : e?.ok ? (
    <p className="rounded-lg bg-marca-50 px-3 py-2.5 text-marca-800" role="status">{e.ok}</p>
  ) : null;

export function PeriodoForm({ mesActual, vencimiento, yaGenerado }: { mesActual: string; vencimiento: string; yaGenerado: boolean }) {
  const [estado, accion, pendiente] = useActionState(generarPeriodo, undefined);
  return (
    <form action={accion} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="mes">Mes</label>
          <input id="mes" name="mes" type="month" className="input" defaultValue={mesActual} required />
        </div>
        <div>
          <label className="label" htmlFor="vencimiento">Fecha límite de pago</label>
          <input id="vencimiento" name="vencimiento" type="date" className="input" defaultValue={vencimiento} required />
        </div>
      </div>
      <Msg e={estado} />
      <button className="btn-primario w-full" disabled={pendiente}>
        {pendiente ? "Generando…" : yaGenerado ? "Generar de nuevo (solo agrega los que falten)" : "Generar cobros del mes"}
      </button>
    </form>
  );
}

export function TarifaForm({ hoy }: { hoy: string }) {
  const [estado, accion, pendiente] = useActionState(crearTarifa, undefined);
  return (
    <form action={accion} className="space-y-4 border-t border-stone-200 pt-4" key={estado?.ok}>
      <p className="font-semibold text-stone-800">Registrar tarifa nueva (cuando la asamblea la suba)</p>
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="label" htmlFor="valorMensual">Valor mensual</label>
          <input id="valorMensual" name="valorMensual" className="input num" inputMode="numeric" placeholder="$ 0" required />
        </div>
        <div>
          <label className="label" htmlFor="vigenteDesde">Rige desde</label>
          <input id="vigenteDesde" name="vigenteDesde" type="date" className="input" defaultValue={hoy.slice(0, 8) + "01"} required />
        </div>
        <div>
          <label className="label" htmlFor="actaAprobacion">Acta (opcional)</label>
          <input id="actaAprobacion" name="actaAprobacion" className="input" placeholder="Acta N.º 12" />
        </div>
      </div>
      <Msg e={estado} />
      <button className="btn-secundario w-full" disabled={pendiente}>Guardar tarifa</button>
    </form>
  );
}

export function EliminarTarifa({ id }: { id: number }) {
  const [pendiente, start] = useTransition();
  const [error, setError] = useState<string>();
  return (
    <>
      <button
        className="ml-2 text-sm font-semibold text-teja-700 underline"
        disabled={pendiente}
        onClick={() =>
          confirm("¿Eliminar esta tarifa mal registrada?") &&
          start(async () => {
            try {
              await eliminarTarifa(id);
            } catch (e) {
              setError((e as Error).message);
            }
          })
        }
      >
        Eliminar
      </button>
      {error && <span className="block text-sm text-teja-700">{error}</span>}
    </>
  );
}
