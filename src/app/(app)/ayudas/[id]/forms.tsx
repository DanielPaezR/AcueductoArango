"use client";

import { useActionState, useState, useTransition } from "react";
import { agregarParticipacion, cambiarEstadoProyecto, quitarParticipacion } from "@/actions/ayudas";
import { ESTADOS_PROYECTO } from "@/lib/ayudas";

export function ParticipacionForm({ proyectoId, hoy, viviendas }: { proyectoId: string; hoy: string; viviendas: { id: string; label: string }[] }) {
  const [estado, accion, pendiente] = useActionState(agregarParticipacion, undefined);
  const [texto, setTexto] = useState("");
  const elegida = viviendas.find((v) => v.label === texto);
  return (
    <form action={accion} className="space-y-4" key={estado?.ok}>
      <input type="hidden" name="proyectoId" value={proyectoId} />
      <input type="hidden" name="viviendaId" value={elegida?.id ?? ""} />
      <div>
        <label className="label" htmlFor="vivienda">Casa (escriba el código o el nombre)</label>
        <input id="vivienda" list="lista-viviendas" className="input" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Ej: V-0012 o María" autoComplete="off" required />
        <datalist id="lista-viviendas">
          {viviendas.map((v) => (
            <option key={v.id} value={v.label} />
          ))}
        </datalist>
        {texto && !elegida && <p className="mt-1 text-sm text-ocre-800">Elija una casa de la lista.</p>}
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="label" htmlFor="fecha">Fecha</label>
          <input id="fecha" name="fecha" type="date" className="input" defaultValue={hoy} required />
        </div>
        <div>
          <label className="label" htmlFor="cantidad">Cantidad (opcional)</label>
          <input id="cantidad" name="cantidad" className="input num" inputMode="decimal" />
        </div>
        <div>
          <label className="label" htmlFor="valorEstimado">Valor estimado (opcional)</label>
          <input id="valorEstimado" name="valorEstimado" className="input num" inputMode="numeric" placeholder="$ 0" />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="detalle">Detalle (opcional)</label>
        <input id="detalle" name="detalle" className="input" placeholder="Ej: 1 mercado, asistió a 2 jornadas" />
      </div>
      {estado?.error && <p className="rounded-lg bg-teja-50 px-3 py-2.5 text-teja-700" role="alert">{estado.error}</p>}
      {estado?.ok && <p className="rounded-lg bg-marca-50 px-3 py-2.5 text-marca-800" role="status">{estado.ok}</p>}
      <button className="btn-primario w-full" disabled={pendiente || !elegida}>Registrar</button>
    </form>
  );
}

export function EstadoProyecto({ id, estado }: { id: string; estado: keyof typeof ESTADOS_PROYECTO }) {
  const [pendiente, start] = useTransition();
  return (
    <div className="mt-4 grid grid-cols-3 gap-2 border-t border-stone-200 pt-4">
      {(Object.keys(ESTADOS_PROYECTO) as (keyof typeof ESTADOS_PROYECTO)[]).map((k) => (
        <button
          key={k}
          type="button"
          disabled={pendiente || k === estado}
          aria-pressed={k === estado}
          onClick={() => start(() => cambiarEstadoProyecto(id, k))}
          className={`btn border px-2 disabled:opacity-100 ${k === estado ? "border-marca-700 bg-marca-700 text-white" : "border-stone-300 bg-white text-stone-800"}`}
        >
          {ESTADOS_PROYECTO[k]}
        </button>
      ))}
    </div>
  );
}

export function QuitarBoton({ id }: { id: string }) {
  const [pendiente, start] = useTransition();
  return (
    <button className="text-sm font-semibold text-teja-700 underline" disabled={pendiente} onClick={() => confirm("¿Quitar este registro?") && start(() => quitarParticipacion(id))}>
      Quitar
    </button>
  );
}
