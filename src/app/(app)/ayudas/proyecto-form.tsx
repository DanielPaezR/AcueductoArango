"use client";

import { useActionState } from "react";
import { crearProyecto } from "@/actions/ayudas";
import { TIPOS_PROYECTO } from "@/lib/ayudas";

export function ProyectoForm({ hoy }: { hoy: string }) {
  const [estado, accion, pendiente] = useActionState(crearProyecto, undefined);
  return (
    <form action={accion} className="space-y-4">
      <div>
        <label className="label" htmlFor="nombre">Nombre</label>
        <input id="nombre" name="nombre" className="input" placeholder="Ej: Entrega de mercados diciembre" required />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="tipo">Tipo</label>
          <select id="tipo" name="tipo" className="input" defaultValue="ayuda">
            {Object.entries(TIPOS_PROYECTO).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="entidad">Quién lo apoya</label>
          <input id="entidad" name="entidad" className="input" placeholder="Alcaldía, Gobernación, JAC…" />
        </div>
        <div>
          <label className="label" htmlFor="fechaInicio">Fecha de inicio</label>
          <input id="fechaInicio" name="fechaInicio" type="date" className="input" defaultValue={hoy} />
        </div>
        <div>
          <label className="label" htmlFor="fechaFin">Fecha de fin (opcional)</label>
          <input id="fechaFin" name="fechaFin" type="date" className="input" />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="descripcion">Descripción (opcional)</label>
        <textarea id="descripcion" name="descripcion" rows={2} className="input" />
      </div>
      {estado?.error && <p className="rounded-lg bg-teja-50 px-3 py-2.5 text-teja-700" role="alert">{estado.error}</p>}
      <button className="btn-primario w-full" disabled={pendiente}>Crear</button>
    </form>
  );
}
